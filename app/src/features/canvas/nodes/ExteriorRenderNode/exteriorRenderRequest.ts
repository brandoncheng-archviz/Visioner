import type {
  QuickRenderAtmosphereOption,
  QuickRenderConnectedImage,
  QuickRenderExteriorNodeData,
  QuickRenderGenerationTask,
  QuickRenderRequest,
  QuickRenderRequestRenderChannel,
  QuickRenderRenderChannel,
  QuickRenderValidationResult,
  QuickRenderViewState,
} from './quickRenderExterior.types';

function resolveReferenceRole(image: QuickRenderConnectedImage): 'primaryBuilding' | 'atmosphere' | 'local' | 'unassigned' {
  if (image.role === 'primary_building') return 'primaryBuilding';
  if (image.role === 'atmosphere_reference' || image.role === 'overall_reference') return 'atmosphere';
  if (image.role) return 'local';
  return 'unassigned';
}

function resolveAtmosphereValue(option: QuickRenderAtmosphereOption | undefined): string | null {
  if (option?.source === 'manual' && option.value) return option.value;
  if (option?.source === 'followReference') return 'followReference';
  return null;
}

function buildRenderChannel(
  channels: QuickRenderRenderChannel[],
  type: 'albedo' | 'normal' | 'ao' | 'depth',
): QuickRenderRequestRenderChannel | null {
  const channel = channels.find((item) => item.type === type && item.imageUrl.trim().length > 0);
  if (!channel) return null;
  return {
    imageUrl: channel.imageUrl,
    fileName: channel.fileName,
    width: channel.width,
    height: channel.height,
  };
}

export function buildQuickRenderRequest(
  data: QuickRenderExteriorNodeData,
  inputImages: readonly QuickRenderConnectedImage[] = data.connectedImages || [],
): QuickRenderRequest {
  const channels = data.renderChannels?.channels || data.structure?.channels || [];
  const atmosphere = data.atmosphere || {};
  const modelParams = data.modelParams || {
    model: 'Nano Banana 2',
    aspectRatio: '1:1',
    resolution: '2K',
    count: 1,
  };

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
      count: modelParams.count || 1,
    },
  };
}

export function validateQuickRenderRequest(request: QuickRenderRequest): QuickRenderValidationResult {
  const errors: QuickRenderValidationResult['errors'] = [];
  if (request.inputImages.length === 0) {
    errors.push({ code: 'INPUT_IMAGE_REQUIRED', field: 'inputImages' });
  } else if (!request.inputImages.some((image) => image.imageUrl.trim().length > 0)) {
    errors.push({ code: 'INPUT_IMAGE_INVALID', field: 'inputImages' });
  }
  return { valid: errors.length === 0, errors };
}

export function deriveQuickRenderViewState(
  data: QuickRenderExteriorNodeData,
  inputImages: readonly QuickRenderConnectedImage[] = data.connectedImages || [],
): QuickRenderViewState {
  if (data.generationTask?.status === 'processing') return 'PROCESSING';
  return validateQuickRenderRequest(buildQuickRenderRequest(data, inputImages)).valid ? 'READY' : 'EMPTY';
}

export function getQuickRenderInteractionLocks(viewState: QuickRenderViewState) {
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

export function shouldApplyQuickRenderTaskResult(activeTaskId: string | null, completedTaskId: string): boolean {
  return activeTaskId === completedTaskId;
}

export function createIdleQuickRenderTask(): QuickRenderGenerationTask {
  return { taskId: null, status: 'idle', errorCode: null, startedAt: null, completedAt: null };
}
