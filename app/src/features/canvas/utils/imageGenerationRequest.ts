import type { ModelParams } from '../types/canvas.types';
import type {
  GenerationInput,
  ImageGenerationCount,
  ImageGenerationRequest,
} from '../types/generation.types';
import type { LightPreviewData } from '../types/lightPreview.types';
import {
  calculateRequestedSize,
  getResolutionTier,
  validateRequestedSize,
} from './modelParams';
import { normalizeImageModelId } from './imageModelId';

export interface BuildImageGenerationRequestInput {
  nodeId: string;
  prompt: string;
  userPrompt: string;
  inputRefs: GenerationInput['inputRefs'];
  markRefs?: GenerationInput['markRefs'];
  modelParams: ModelParams;
  controller?: unknown;
  lightPreview?: LightPreviewData | null;
  style?: unknown;
  presets?: string[];
}

function normalizeGenerationCount(value: ModelParams['count']): ImageGenerationCount {
  const count = Number.parseInt(value, 10);
  if (count === 2 || count === 4) return count;
  return 1;
}

const LEGACY_CLOUD_AMOUNTS = { clear: 0, fewClouds: 28, cloudy: 62, overcast: 92 } as const;
const LEGACY_FOG_AMOUNTS = { none: 0, light: 22, medium: 58, heavy: 88 } as const;

/** Builds the API-facing image generation payload without mutating node state. */
export function buildImageGenerationRequest({
  nodeId,
  prompt,
  userPrompt,
  inputRefs,
  markRefs,
  modelParams,
  controller,
  lightPreview,
  style,
  presets,
}: BuildImageGenerationRequestInput): ImageGenerationRequest {
  const resolutionTier = getResolutionTier(modelParams.resolutionTier ?? modelParams.resolution);
  const requestedSize = validateRequestedSize(modelParams.requestedSize, resolutionTier)
    ? modelParams.requestedSize
    : calculateRequestedSize(modelParams.ratio, resolutionTier);

  const lighting = lightPreview?.enabled
    ? {
        timePeriod: lightPreview.settings?.timePeriod,
        sun: { ...lightPreview.sun },
        cloudAmount: lightPreview.settings?.cloudAmountValue
          ?? LEGACY_CLOUD_AMOUNTS[lightPreview.settings?.cloudAmount ?? 'clear'],
        fogAmount: lightPreview.settings?.fogAmountValue
          ?? LEGACY_FOG_AMOUNTS[lightPreview.settings?.fogLevel ?? 'none'],
        promptText: lightPreview.derived.promptText,
      }
    : undefined;

  return {
    nodeId,
    prompt,
    userPrompt,
    inputRefs: inputRefs.map((reference) => ({
      sourceNodeId: reference.imageId,
      imageUrl: reference.imageUrl,
      role: reference.usageKey,
      promptText: reference.promptText,
    })),
    markRefs: markRefs?.map((mark) => ({
      sourceNodeId: mark.sourceNodeId,
      label: mark.markLabel,
      region: {
        point: { ...mark.markPoint },
        box: { ...mark.markBox },
      },
      promptText: mark.promptText,
    })),
    modelParams: {
      model: normalizeImageModelId(modelParams.model),
      aspectRatio: modelParams.ratio,
      resolution: modelParams.resolution,
      resolutionTier,
      requestedSize,
      count: normalizeGenerationCount(modelParams.count),
    },
    controller,
    lighting,
    style,
    presets: presets ? [...presets] : undefined,
  };
}
