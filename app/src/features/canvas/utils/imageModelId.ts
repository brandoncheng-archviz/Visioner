import type { ModelParams } from '../types/canvas.types';
import type { ImageModelId } from '../types/generation.types';

export const DEFAULT_IMAGE_MODEL_ID: ImageModelId = 'nano-banana-2';

const IMAGE_MODEL_ID_ALIASES: Readonly<Record<string, ImageModelId>> = {
  'gpt-image-2': 'gpt-image-2',
  'nano-banana-2': 'nano-banana-2',
  'nano-banana-pro': 'nano-banana-pro',
  'GPT Image 2': 'gpt-image-2',
  'Nano Banana 2': 'nano-banana-2',
  'Nano Banana Pro': 'nano-banana-pro',
};

export function normalizeImageModelId(value: unknown): ImageModelId {
  return typeof value === 'string'
    ? IMAGE_MODEL_ID_ALIASES[value] ?? DEFAULT_IMAGE_MODEL_ID
    : DEFAULT_IMAGE_MODEL_ID;
}

export function normalizeImageModelParams<T extends ModelParams>(
  modelParams: T,
): T & { model: ImageModelId } {
  return {
    ...modelParams,
    model: normalizeImageModelId(modelParams.model),
  };
}
