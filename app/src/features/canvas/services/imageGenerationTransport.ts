import type {
  GenerationResult,
  ImageGenerationErrorCode,
  ImageGenerationRequest,
} from '../types/generation.types';

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
