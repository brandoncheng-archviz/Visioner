import { describe, expect, it } from 'vitest';
import { prepareCanvasNodeDataForCopy } from './nodeCopyData';

describe('prepareCanvasNodeDataForCopy', () => {
  it.each(['processing', 'success', 'failed'] as const)(
    'resets a copied exterior render %s task to idle',
    (status) => {
      const copied = prepareCanvasNodeDataForCopy('exteriorRender', {
        prompt: 'latest prompt',
        lastResult: { taskId: 'old-result' },
        generationTask: {
          taskId: 'old-task',
          status,
          errorMessage: status === 'failed' ? 'old error' : null,
          startedAt: 1,
          completedAt: 2,
        },
      });

      expect(copied.prompt).toBe('latest prompt');
      expect(copied.generationTask).toEqual({
        taskId: null,
        status: 'idle',
        errorCode: null,
        startedAt: null,
        completedAt: null,
      });
      expect(copied).not.toHaveProperty('lastResult');
    },
  );
});
