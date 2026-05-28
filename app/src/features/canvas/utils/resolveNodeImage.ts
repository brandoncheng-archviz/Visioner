import type { GenerationHistoryItem } from '../types/generation.types';

export interface ResolvedNodeImage {
  imageUrl: string;
  width: number;
  height: number;
}

/**
 * Resolve the best available image from a node's data.
 *
 * Priority:
 * 1. outputImage
 * 2. currentImage
 * 3. currentResultId matched in generatedImages
 * 4. Last item in generatedImages
 * 5. inputImage
 * 6. image (legacy)
 */
export function resolveNodeImage(data: unknown): ResolvedNodeImage | null {
  const d = (data || {}) as Record<string, unknown>;

  const width = (d.width as number) || 1024;
  const height = (d.height as number) || 1024;

  // 1. outputImage (upscale result)
  const outputImage = (d.outputImage as string) || '';
  if (outputImage) {
    return { imageUrl: outputImage, width, height };
  }

  // 2. currentImage
  const currentImage = (d.currentImage as string) || '';
  if (currentImage) {
    return { imageUrl: currentImage, width, height };
  }

  // 3. currentResultId matched in generatedImages
  const currentResultId = (d.currentResultId as string) || '';
  const generatedImages = normalizeGeneratedImages(d.generatedImages);
  if (currentResultId && generatedImages.length > 0) {
    const match = generatedImages.find((g) => g.resultId === currentResultId);
    if (match?.imageUrl) {
      return { imageUrl: match.imageUrl, width: match.width || width, height: match.height || height };
    }
  }

  // 4. Last item in generatedImages
  if (generatedImages.length > 0) {
    const latest = generatedImages[generatedImages.length - 1];
    if (latest.imageUrl) {
      return { imageUrl: latest.imageUrl, width: latest.width || width, height: latest.height || height };
    }
  }

  // 5. inputImage
  const inputImage = (d.inputImage as string) || '';
  if (inputImage) {
    return { imageUrl: inputImage, width, height };
  }

  // 6. image (legacy)
  const image = (d.image as string) || '';
  if (image) {
    return { imageUrl: image, width, height };
  }

  return null;
}

function normalizeGeneratedImages(value: unknown): GenerationHistoryItem[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (typeof value[0] === 'string') {
    const baseTime = Date.now();
    return (value as string[]).map((url, index) => ({
      resultId: `legacy-${baseTime}-${index}`,
      batchId: `legacy-batch-${baseTime}`,
      batchIndex: index + 1,
      imageUrl: url,
      prompt: '',
      userPrompt: '',
      inputRefs: [],
      presetIds: [],
      styleId: null,
      modelParams: { model: 'Nano Banana 2', ratio: '1:1', resolution: '2K', lens: '标准', count: '1张' },
      seed: 0,
      width: 1024,
      height: 1024,
      createdAt: baseTime + index,
    }));
  }
  return value as GenerationHistoryItem[];
}
