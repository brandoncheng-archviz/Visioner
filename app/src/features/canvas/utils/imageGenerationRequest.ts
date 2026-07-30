import type { ModelParams } from '../types/canvas.types';
import type {
  GenerationInput,
  ImageGenerationCount,
  ImageGenerationRequest,
} from '../types/generation.types';
import {
  calculateRequestedSize,
  getResolutionTier,
  validateRequestedSize,
} from './modelParams';

export interface BuildImageGenerationRequestInput {
  nodeId: string;
  prompt: string;
  userPrompt: string;
  inputRefs: GenerationInput['inputRefs'];
  markRefs?: GenerationInput['markRefs'];
  modelParams: ModelParams;
  controller?: unknown;
  style?: unknown;
  presets?: string[];
}

function normalizeGenerationCount(value: ModelParams['count']): ImageGenerationCount {
  const count = Number.parseInt(value, 10);
  if (count === 2 || count === 4) return count;
  return 1;
}

/** Builds the API-facing image generation payload without mutating node state. */
export function buildImageGenerationRequest({
  nodeId,
  prompt,
  userPrompt,
  inputRefs,
  markRefs,
  modelParams,
  controller,
  style,
  presets,
}: BuildImageGenerationRequestInput): ImageGenerationRequest {
  const resolutionTier = getResolutionTier(modelParams.resolutionTier ?? modelParams.resolution);
  const requestedSize = validateRequestedSize(modelParams.requestedSize, resolutionTier)
    ? modelParams.requestedSize
    : calculateRequestedSize(modelParams.ratio, resolutionTier);

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
      model: modelParams.model,
      aspectRatio: modelParams.ratio,
      resolution: modelParams.resolution,
      resolutionTier,
      requestedSize,
      count: normalizeGenerationCount(modelParams.count),
    },
    controller,
    style,
    presets: presets ? [...presets] : undefined,
  };
}
