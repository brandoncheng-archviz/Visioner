import { describe, expect, it, vi } from 'vitest';
import type { GenerationResult, ImageGenerationRequest } from '../types/generation.types';
import { MockGenerationError } from '../utils/mockGenerationTask';
import {
  createImageGenerationService,
  getImageGenerationErrorCode,
} from './imageGenerationService';
import {
  createMockImageGenerationTransport,
  type ImageGenerationTransport,
} from './mockImageGenerationTransport';

const request: ImageGenerationRequest = {
  nodeId: 'image-node-1',
  prompt: 'final prompt',
  userPrompt: 'user prompt',
  inputRefs: [{
    sourceNodeId: 'source-1',
    imageUrl: '/source.png',
    role: 'primary_building',
    promptText: 'keep the building',
  }],
  markRefs: [{
    sourceNodeId: 'source-1',
    label: 'entrance',
    region: {
      point: { normalizedX: 0.5, normalizedY: 0.5 },
      box: {
        normalizedX: 0.4,
        normalizedY: 0.4,
        normalizedWidth: 0.2,
        normalizedHeight: 0.2,
      },
    },
    promptText: 'replace the entrance',
  }],
  modelParams: {
    model: 'nano-banana-2',
    aspectRatio: '1:1',
    resolution: '2K',
    resolutionTier: '2K',
    requestedSize: { width: 2048, height: 2048 },
    count: 1,
  },
  controller: { time: 'dusk' },
  lighting: {
    sun: { elevation: 33, azimuth: 55 },
    cloudAmount: 20,
    fogAmount: 15,
    promptText: 'evening light',
  },
  style: { styleKey: 'luxury' },
  presets: ['clean_up'],
};

const result: GenerationResult = {
  taskId: 'result-1',
  imageUrl: '/result.png',
  width: 1024,
  height: 1024,
  seed: 123,
  metadata: {
    prompt: request.prompt,
    model: request.modelParams.model,
    resolution: request.modelParams.resolution,
  },
};

describe('imageGenerationService', () => {
  it('passes the complete business request to its transport without field loss', async () => {
    let receivedRequest: ImageGenerationRequest | null = null;
    const generate: ImageGenerationTransport['generate'] = async (transportRequest) => {
      receivedRequest = transportRequest;
      return [result];
    };
    const transport: ImageGenerationTransport = { generate };
    const service = createImageGenerationService(transport);

    await service.generate(request);

    expect(receivedRequest).toBe(request);
  });

  it('returns the same result produced by the existing generation simulator', async () => {
    const simulator = vi.fn(async () => result);
    const service = createImageGenerationService(createMockImageGenerationTransport(simulator));

    await expect(service.generate(request)).resolves.toEqual([result]);
    expect(simulator).toHaveBeenCalledTimes(1);
  });

  it('forwards progress from the Mock transport', async () => {
    const simulator = vi.fn(async (_input, callbacks) => {
      callbacks?.onProgress?.(47);
      return result;
    });
    const onProgress = vi.fn();
    const service = createImageGenerationService(createMockImageGenerationTransport(simulator));

    await service.generate(request, { onProgress });

    expect(onProgress).toHaveBeenCalledWith(47);
  });

  it('normalizes cancellation to the stable generation error code', async () => {
    const controller = new AbortController();
    const simulator = vi.fn(async (_input, _callbacks, signal) => {
      expect(signal).toBe(controller.signal);
      throw new MockGenerationError('cancelled');
    });
    controller.abort();
    const service = createImageGenerationService(createMockImageGenerationTransport(simulator));

    try {
      await service.generate(request, { signal: controller.signal });
      throw new Error('Expected cancellation');
    } catch (error) {
      expect(getImageGenerationErrorCode(error)).toBe('cancelled');
    }
  });

  it('normalizes Mock failures and unknown transport failures', async () => {
    const timeoutService = createImageGenerationService(createMockImageGenerationTransport(
      vi.fn(async () => { throw new MockGenerationError('timeout'); }),
    ));
    const unknownService = createImageGenerationService(createMockImageGenerationTransport(
      vi.fn(async () => { throw new Error('unexpected'); }),
    ));

    await expect(timeoutService.generate(request)).rejects.toMatchObject({ code: 'timeout' });
    await expect(unknownService.generate(request)).rejects.toMatchObject({ code: 'serviceUnavailable' });
  });

  it('returns batch results through the same service contract without changing ImageNode runtime count', async () => {
    const secondResult = { ...result, taskId: 'result-2', imageUrl: '/result-2.png' };
    const simulator = vi.fn()
      .mockResolvedValueOnce(result)
      .mockResolvedValueOnce(secondResult);
    const service = createImageGenerationService(createMockImageGenerationTransport(simulator));
    const batchRequest: ImageGenerationRequest = {
      ...request,
      modelParams: { ...request.modelParams, count: 2 },
    };

    await expect(service.generate(batchRequest)).resolves.toEqual([result, secondResult]);
    expect(simulator).toHaveBeenCalledTimes(2);
    expect(request.modelParams.count).toBe(1);
  });

  it('keeps the current ImageNode runtime count at one result', async () => {
    const simulator = vi.fn(async () => result);
    const service = createImageGenerationService(createMockImageGenerationTransport(simulator));

    const results = await service.generate(request);

    expect(request.modelParams.count).toBe(1);
    expect(results).toHaveLength(1);
    expect(simulator).toHaveBeenCalledTimes(1);
  });
});
