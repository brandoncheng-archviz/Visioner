import type {
  ExteriorRenderAtmosphereOption,
  ExteriorRenderConnectedImage,
  ExteriorRenderNodeData,
  ExteriorRenderGenerationTask,
  ExteriorRenderRequest,
  ExteriorRenderRequestRenderChannel,
  ExteriorRenderRenderChannel,
  ExteriorRenderValidationResult,
  ExteriorRenderViewState,
} from './exteriorRender.types';
import {
  calculateRequestedSize,
  getResolutionTier,
  validateRequestedSize,
} from '../../utils/modelParams';

function resolveReferenceRole(image: ExteriorRenderConnectedImage): 'primaryBuilding' | 'atmosphere' | 'local' | 'unassigned' {
  if (image.role === 'primary_building') return 'primaryBuilding';
  if (image.role === 'atmosphere_reference' || image.role === 'overall_reference') return 'atmosphere';
  if (image.role) return 'local';
  return 'unassigned';
}

function resolveAtmosphereValue(option: ExteriorRenderAtmosphereOption | undefined): string | null {
  if (option?.source === 'manual' && option.value) return option.value;
  if (option?.source === 'followReference') return 'followReference';
  return null;
}

function buildRenderChannel(
  channels: ExteriorRenderRenderChannel[],
  type: 'albedo' | 'normal' | 'ao' | 'depth',
): ExteriorRenderRequestRenderChannel | null {
  const channel = channels.find((item) => item.type === type && item.imageUrl.trim().length > 0);
  if (!channel) return null;
  return {
    imageUrl: channel.imageUrl,
    fileName: channel.fileName,
    width: channel.width,
    height: channel.height,
  };
}

export function buildExteriorRenderRequest(
  data: ExteriorRenderNodeData,
  inputImages: readonly ExteriorRenderConnectedImage[] = data.connectedImages || [],
): ExteriorRenderRequest {
  const channels = data.renderChannels?.channels || data.structure?.channels || [];
  const atmosphere = data.atmosphere || {};
  const modelParams = data.modelParams || {
    model: 'Nano Banana 2',
    aspectRatio: '1:1',
    resolution: '2K',
    count: 1,
  };
  const resolutionTier = getResolutionTier(modelParams.resolutionTier ?? modelParams.resolution);
  const adaptiveSource = inputImages.find((image) => (
    typeof image.width === 'number'
    && image.width > 0
    && typeof image.height === 'number'
    && image.height > 0
  ));
  const requestedSize = validateRequestedSize(modelParams.requestedSize, resolutionTier)
    ? modelParams.requestedSize
    : calculateRequestedSize(
      modelParams.aspectRatio,
      resolutionTier,
      adaptiveSource ? { width: adaptiveSource.width!, height: adaptiveSource.height! } : null,
    );

  return {
    inputImages: inputImages.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      usage: {
        key: resolveReferenceRole(image),
        label: image.roleLabel || image.customRoleLabel || image.role || 'unassigned',
      },
      width: image.width,
      height: image.height,
    })),
    renderChannels: {
      albedo: buildRenderChannel(channels, 'albedo'),
      normal: buildRenderChannel(channels, 'normal'),
      ao: buildRenderChannel(channels, 'ao'),
      depth: buildRenderChannel(channels, 'depth'),
    },
    atmosphere: {
      addEntourage: atmosphere.addEntourage === true,
      addPeople: atmosphere.addPeople === true,
      interiorLights: atmosphere.interiorLights === true,
      motionBlur: atmosphere.motionBlur === true,
      time: resolveAtmosphereValue(atmosphere.time),
      lighting: resolveAtmosphereValue(atmosphere.light),
      weather: resolveAtmosphereValue(atmosphere.weather),
      style: resolveAtmosphereValue(atmosphere.style),
    },
    prompt: data.prompt || '',
    modelParams: {
      model: modelParams.model,
      aspectRatio: modelParams.aspectRatio,
      resolution: modelParams.resolution,
      resolutionTier,
      requestedSize,
      count: modelParams.count || 1,
    },
  };
}

export function validateExteriorRenderRequest(request: ExteriorRenderRequest): ExteriorRenderValidationResult {
  const errors: ExteriorRenderValidationResult['errors'] = [];
  if (request.inputImages.length === 0) {
    errors.push({ code: 'INPUT_IMAGE_REQUIRED', field: 'inputImages' });
  } else if (!request.inputImages.some((image) => image.imageUrl.trim().length > 0)) {
    errors.push({ code: 'INPUT_IMAGE_INVALID', field: 'inputImages' });
  }
  return { valid: errors.length === 0, errors };
}

export function deriveExteriorRenderViewState(
  data: ExteriorRenderNodeData,
  inputImages: readonly ExteriorRenderConnectedImage[] = data.connectedImages || [],
): ExteriorRenderViewState {
  if (data.generationTask?.status === 'processing') return 'PROCESSING';
  return validateExteriorRenderRequest(buildExteriorRenderRequest(data, inputImages)).valid ? 'READY' : 'EMPTY';
}

export function getExteriorRenderInteractionLocks(viewState: ExteriorRenderViewState) {
  const locked = viewState === 'PROCESSING';
  return {
    inputImages: locked,
    renderChannels: locked,
    atmosphere: locked,
    prompt: locked,
    modelParams: locked,
    generate: locked,
  } as const;
}

export function shouldApplyExteriorRenderTaskResult(activeTaskId: string | null, completedTaskId: string): boolean {
  return activeTaskId === completedTaskId;
}

export function createIdleExteriorRenderTask(): ExteriorRenderGenerationTask {
  return { taskId: null, status: 'idle', errorCode: null, startedAt: null, completedAt: null };
}
