import { ServerGenerationError } from './errors.js';
import type { ImageGenerationProvider } from './providers/imageGenerationProvider.js';
import { createOpenAIImageProvider } from './providers/openaiImageProvider.js';
import type { ServerImageGenerationRequest } from './requestParser.js';

export type ImageGenerationProviderId = 'openai';

export type ImageGenerationModelRegistration = {
  internalModelId: ServerImageGenerationRequest['modelParams']['model'];
  providerId: ImageGenerationProviderId;
  providerModel: string;
  defaultQuality: 'low' | 'medium' | 'high';
  provider: ImageGenerationProvider;
};

export type ImageGenerationModelRegistry = {
  resolve(modelId: ServerImageGenerationRequest['modelParams']['model']): ImageGenerationModelRegistration;
};

export function createImageGenerationModelRegistry({
  openAIProvider = createOpenAIImageProvider(),
}: { openAIProvider?: ImageGenerationProvider } = {}): ImageGenerationModelRegistry {
  const registrations = new Map<ServerImageGenerationRequest['modelParams']['model'], ImageGenerationModelRegistration>([
    ['gpt-image-2', {
      internalModelId: 'gpt-image-2',
      providerId: 'openai',
      providerModel: 'gpt-image-2',
      defaultQuality: 'medium',
      provider: openAIProvider,
    }],
  ]);

  return {
    resolve(modelId) {
      const registration = registrations.get(modelId);
      if (!registration) {
        throw new ServerGenerationError('PROVIDER_UNAVAILABLE', 'No image provider is configured for this model.');
      }
      return registration;
    },
  };
}
