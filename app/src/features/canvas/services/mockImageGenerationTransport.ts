import type {
  GenerationInput,
  GenerationResult,
  ImageGenerationErrorCode,
  ImageGenerationRequest,
} from '../types/generation.types';
import {
  getMockGenerationErrorCode,
  simulateGeneration,
} from '../utils/mockGenerationTask';

export type ImageGenerationServiceOptions = {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export interface ImageGenerationTransport {
  generate(
    request: ImageGenerationRequest,
    options?: ImageGenerationServiceOptions,
  ): Promise<GenerationResult[]>;
}

export class ImageGenerationServiceError extends Error {
  readonly code: ImageGenerationErrorCode;

  constructor(code: ImageGenerationErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'ImageGenerationServiceError';
    this.code = code;
  }
}

type GenerationSimulator = typeof simulateGeneration;

function toMockGenerationInput(request: ImageGenerationRequest): GenerationInput {
  return {
    sourceNodeId: request.nodeId,
    prompt: request.prompt,
    inputRefs: request.inputRefs.map((reference) => ({
      imageId: reference.sourceNodeId,
      imageUrl: reference.imageUrl,
      usageKey: reference.role,
      usageLabel: reference.role,
      promptText: reference.promptText,
    })),
    markRefs: request.markRefs?.map((mark, index) => ({
      markId: `request-mark-${index}`,
      sourceNodeId: mark.sourceNodeId,
      usageKey: 'image_mark_reference',
      usageLabel: 'image_mark_reference',
      markType: 'box',
      markPoint: mark.region?.point ?? { normalizedX: 0.5, normalizedY: 0.5 },
      markBox: mark.region?.box ?? {
        normalizedX: 0,
        normalizedY: 0,
        normalizedWidth: 1,
        normalizedHeight: 1,
      },
      candidates: [],
      selectedCandidateId: '',
      markLabel: mark.label,
      promptText: mark.promptText,
    })),
    modelParams: {
      model: request.modelParams.model,
      ratio: request.modelParams.aspectRatio,
      resolution: request.modelParams.resolution,
      resolutionTier: request.modelParams.resolutionTier,
      requestedSize: request.modelParams.requestedSize,
    },
  };
}

export function createMockImageGenerationTransport(
  simulator: GenerationSimulator = simulateGeneration,
): ImageGenerationTransport {
  return {
    async generate(request, options) {
      const count = request.modelParams.count;
      const results: GenerationResult[] = [];

      try {
        for (let index = 0; index < count; index++) {
          const result = await simulator(
            toMockGenerationInput(request),
            {
              onProgress: (progress) => {
                const overall = Math.floor(((index + progress / 100) / count) * 100);
                options?.onProgress?.(overall);
              },
            },
            options?.signal,
          );
          results.push(result);
        }
        return results;
      } catch (error) {
        const code = getMockGenerationErrorCode(error);
        throw new ImageGenerationServiceError(code ?? 'serviceUnavailable', { cause: error });
      }
    },
  };
}
