import { describe, expect, it } from 'vitest';
import { resolveAutomaticProjectCover } from './projectCover';

function generatedImage(resultId: string, batchId: string, batchIndex: number, createdAt: number) {
  return {
    resultId,
    batchId,
    batchIndex,
    imageUrl: `/${resultId}.jpg`,
    prompt: '',
    userPrompt: '',
    inputRefs: [],
    presetIds: [],
    styleId: null,
    modelParams: { model: 'gpt-image-2', ratio: '1:1', resolution: '1024' },
    seed: batchIndex,
    width: 1024,
    height: 1024,
    createdAt,
  };
}

describe('resolveAutomaticProjectCover', () => {
  it('prefers the selected result from the latest successful batch', () => {
    const images = [0, 1, 2, 3].map((index) => generatedImage(`result-${index}`, 'batch-1', index + 1, 200));
    expect(resolveAutomaticProjectCover([{
      type: 'image',
      data: {
        generatedImages: images,
        currentResultId: 'result-1',
        currentResultSet: {
          batchId: 'batch-1',
          images: images.map(({ resultId, imageUrl, width, height, seed }) => ({ resultId, imageUrl, width, height, seed })),
          selectedIndex: 1,
          isExpanded: true,
        },
      },
    }])).toEqual({ thumbnail: '/result-1.jpg', source: 'generated' });
  });

  it('uses the first result rather than the last returned result when a batch has no selection', () => {
    const images = [0, 1, 2, 3].map((index) => generatedImage(`result-${index}`, 'batch-1', index + 1, 200));
    expect(resolveAutomaticProjectCover([{
      type: 'image',
      data: { generatedImages: images },
    }])).toEqual({ thumbnail: '/result-0.jpg', source: 'generated' });
  });

  it('prefers the most recent successful generation over imported images', () => {
    expect(resolveAutomaticProjectCover([
      { type: 'image', data: { inputImage: '/imported.jpg', assetSource: 'upload' } },
      { type: 'image', data: { generatedImages: [generatedImage('older', 'batch-1', 1, 100)] } },
      { type: 'image', data: { generatedImages: [generatedImage('latest', 'batch-2', 1, 300)] } },
    ])).toEqual({ thumbnail: '/latest.jpg', source: 'generated' });
  });

  it('falls back to the most recently added imported image and then no cover', () => {
    expect(resolveAutomaticProjectCover([
      { type: 'image', data: { image: '/first.jpg' } },
      { type: 'text', data: { text: 'prompt' } },
      { type: 'image', data: { inputImage: '/latest.jpg', assetSource: 'upload' } },
    ])).toEqual({ thumbnail: '/latest.jpg', source: 'imported' });
    expect(resolveAutomaticProjectCover([{ type: 'text', data: {} }])).toBeNull();
  });
});
