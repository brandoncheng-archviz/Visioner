import type {
  GenerationResult,
  ImageGenerationErrorCode,
  ImageGenerationRequest,
} from '../types/generation.types';
import {
  ImageGenerationServiceError,
  type ImageGenerationServiceOptions,
  type ImageGenerationTransport,
} from './imageGenerationTransport';
import { createHttpImageGenerationTransport } from './httpImageGenerationTransport';

export type { ImageGenerationServiceOptions } from './imageGenerationTransport';
export { ImageGenerationServiceError } from './imageGenerationTransport';

export function getImageGenerationErrorCode(error: unknown): ImageGenerationErrorCode | null {
  return error instanceof ImageGenerationServiceError ? error.code : null;
}

export interface ImageGenerationService {
  generate(
    request: ImageGenerationRequest,
    options?: ImageGenerationServiceOptions,
  ): Promise<GenerationResult[]>;
}

export function createImageGenerationService(
  transport: ImageGenerationTransport,
): ImageGenerationService {
  return {
    generate(request, options) {
      return transport.generate(request, options);
    },
  };
}

export const imageGenerationService = createImageGenerationService(
  createHttpImageGenerationTransport(),
);
