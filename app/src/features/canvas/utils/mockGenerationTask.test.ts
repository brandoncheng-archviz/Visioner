import { describe, expect, it } from 'vitest';
import { getMockGenerationErrorCode, simulateGeneration } from './mockGenerationTask';

describe('mockGenerationTask errors', () => {
  it('returns a stable error code when generation is cancelled', async () => {
    const controller = new AbortController();
    controller.abort();

    try {
      await simulateGeneration({
        sourceNodeId: 'image-1',
        prompt: 'test prompt',
        inputRefs: [],
        modelParams: {
          model: 'Nano Banana 2',
          ratio: '1:1',
          resolution: '2K',
        },
      }, undefined, controller.signal);
      throw new Error('Expected generation to be cancelled');
    } catch (error) {
      expect(getMockGenerationErrorCode(error)).toBe('cancelled');
    }
  });
});
