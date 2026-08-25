import { ServerGenerationError } from './errors.js';
import { createImageGenerationModelRegistry, type ImageGenerationModelRegistry } from './modelRegistry.js';
import type { ParsedImageGenerationRequest } from './requestParser.js';

export type ServerGenerationResult = {
  taskId: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
  metadata: {
    prompt: string;
    model: string;
    resolution: string;
  };
};

export interface ImageGenerationOrchestrator {
  generate(
    parsedRequest: ParsedImageGenerationRequest,
    signal: AbortSignal,
  ): Promise<ServerGenerationResult[]>;
}

export type ImageGenerationMode = 'mock' | 'provider';

function waitForMockGeneration(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new ServerGenerationError('GENERATION_CANCELLED', 'Image generation was cancelled.'));
      return;
    }

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new ServerGenerationError('GENERATION_CANCELLED', 'Image generation was cancelled.'));
    };
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

export function createServerMockImageGenerationOrchestrator(
  delayMs = 600,
): ImageGenerationOrchestrator {
  return {
    async generate({ request }, signal) {
      await waitForMockGeneration(delayMs, signal);
      return Array.from({ length: request.modelParams.count }, (_, index) => ({
        taskId: `server-mock-${Date.now()}-${index + 1}`,
        imageUrl: `/assets/mock/generation-results/show-cover-${Math.floor(Math.random() * 20) + 1}.jpg`,
        width: 1024,
        height: 1024,
        seed: Math.floor(Math.random() * 1_000_000),
        metadata: {
          prompt: request.prompt,
          model: request.modelParams.model,
          resolution: request.modelParams.resolution,
        },
      }));
    },
  };
}

export function createProviderImageGenerationOrchestrator(
  registry: ImageGenerationModelRegistry = createImageGenerationModelRegistry(),
): ImageGenerationOrchestrator {
  return {
    async generate({ request, references }, signal) {
      const registration = registry.resolve(request.modelParams.model);
      return registration.provider.generate(request, references, {
        providerModel: registration.providerModel,
        defaultQuality: registration.defaultQuality,
        signal,
      });
    },
  };
}

export function createConfiguredImageGenerationOrchestrator(
  mode = process.env.IMAGE_GENERATION_MODE || 'mock',
): ImageGenerationOrchestrator {
  if (mode === 'mock') return createServerMockImageGenerationOrchestrator();
  if (mode === 'provider') return createProviderImageGenerationOrchestrator();
  throw new ServerGenerationError('PROVIDER_UNAVAILABLE', 'Image generation mode is not configured correctly.');
}
