import { describe, expect, it } from 'vitest';
import { IMAGE_MODEL_OPTIONS } from '../constants/imageModelOptions';
import type { GenerationHistoryItem } from '../types/generation.types';
import { normalizeGeneratedImages } from '../types/imageNodeData.types';
import { normalizeImageModelId, normalizeImageModelParams } from './imageModelId';

describe('image model IDs', () => {
  it.each([
    'gpt-image-2',
    'nano-banana-2',
    'nano-banana-pro',
  ] as const)('keeps stable model ID %s', (modelId) => {
    expect(normalizeImageModelId(modelId)).toBe(modelId);
  });

  it.each([
    ['GPT Image 2', 'gpt-image-2'],
    ['Nano Banana 2', 'nano-banana-2'],
    ['Nano Banana Pro', 'nano-banana-pro'],
  ] as const)('normalizes legacy model name %s', (legacyName, modelId) => {
    expect(normalizeImageModelId(legacyName)).toBe(modelId);
  });

  it('uses stable IDs while retaining the existing display labels', () => {
    expect(IMAGE_MODEL_OPTIONS.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'nano-banana-2', label: 'Nano Banana 2' },
      { id: 'nano-banana-pro', label: 'Nano Banana Pro' },
      { id: 'gpt-image-2', label: 'GPT Image 2' },
    ]);
  });

  it('normalizes model params read from old node data', () => {
    expect(normalizeImageModelParams({
      model: 'GPT Image 2',
      ratio: '1:1',
      resolution: '2K',
      lens: 'standard',
      count: '1',
    }).model).toBe('gpt-image-2');
  });

  it('normalizes model params while reading generation history', () => {
    const historyItem = {
      resultId: 'result-1',
      batchId: 'batch-1',
      batchIndex: 1,
      imageUrl: '/result.png',
      prompt: '',
      userPrompt: '',
      inputRefs: [],
      presetIds: [],
      styleId: null,
      modelParams: {
        model: 'Nano Banana Pro',
        ratio: '1:1',
        resolution: '2K',
        lens: 'standard',
        count: '1',
      },
      seed: 1,
      width: 1024,
      height: 1024,
      createdAt: 1,
    } satisfies GenerationHistoryItem;

    expect(normalizeGeneratedImages([historyItem])[0]?.modelParams.model)
      .toBe('nano-banana-pro');
  });
});
