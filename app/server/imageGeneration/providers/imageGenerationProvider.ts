import type { ServerGenerationResult } from '../orchestrator.js';
import type {
  ParsedImageReference,
  ServerImageGenerationRequest,
} from '../requestParser.js';

export type ImageGenerationProviderOptions = {
  providerModel: string;
  signal: AbortSignal;
};

export interface ImageGenerationProvider {
  generate(
    request: ServerImageGenerationRequest,
    references: ParsedImageReference[],
    options: ImageGenerationProviderOptions,
  ): Promise<ServerGenerationResult[]>;
}
