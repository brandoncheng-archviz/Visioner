import type { ExteriorRenderErrorCode, ExteriorRenderRequest, ExteriorRenderResult } from './exteriorRender.types';

export type MockExteriorRenderOptions = {
  outcome?: 'success' | 'failed';
  delayMs?: number;
  signal?: AbortSignal;
  taskId?: string;
};

let mockTaskCounter = 0;

export class ExteriorRenderError extends Error {
  readonly code: ExteriorRenderErrorCode;

  constructor(code: ExteriorRenderErrorCode) {
    super(code);
    this.name = 'ExteriorRenderError';
    this.code = code;
  }
}

export function createExteriorRenderTaskId() {
  mockTaskCounter += 1;
  return `exterior-render-${Date.now()}-${mockTaskCounter}`;
}

function waitForMockDelay(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve();
    }, delayMs);
    const abort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      reject(new ExteriorRenderError('CANCELLED'));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function mockExteriorRender(
  request: ExteriorRenderRequest,
  options: MockExteriorRenderOptions = {},
): Promise<ExteriorRenderResult> {
  const taskId = options.taskId || createExteriorRenderTaskId();
  const delayMs = options.delayMs ?? 1500 + Math.floor(Math.random() * 1001);
  const outcome = options.outcome ?? 'success';
  await waitForMockDelay(delayMs, options.signal);

  if (outcome === 'failed') throw new ExteriorRenderError('GENERATION_FAILED');
  const primaryImage = request.inputImages.find((image) => image.imageUrl.trim().length > 0);
  if (!primaryImage) throw new ExteriorRenderError('MISSING_INPUT');

  return {
    taskId,
    status: 'success',
    images: Array.from({ length: request.modelParams.count }, (_, index) => ({
      id: `${taskId}-result-${index + 1}`,
      imageUrl: primaryImage.imageUrl,
      width: primaryImage.width || 1024,
      height: primaryImage.height || 1024,
      seed: Math.floor(Math.random() * 1_000_000),
    })),
    metadata: {
      model: request.modelParams.model,
      aspectRatio: request.modelParams.aspectRatio,
      resolution: request.modelParams.resolution,
    },
  };
}
