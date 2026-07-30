import type { QuickRenderErrorCode, QuickRenderRequest, QuickRenderResult } from './quickRenderExterior.types';

export type MockQuickRenderOptions = {
  outcome?: 'success' | 'failed';
  delayMs?: number;
  signal?: AbortSignal;
  taskId?: string;
};

let mockTaskCounter = 0;

export class QuickRenderError extends Error {
  readonly code: QuickRenderErrorCode;

  constructor(code: QuickRenderErrorCode) {
    super(code);
    this.name = 'QuickRenderError';
    this.code = code;
  }
}

export function createQuickRenderTaskId() {
  mockTaskCounter += 1;
  return `quick-render-${Date.now()}-${mockTaskCounter}`;
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
      reject(new QuickRenderError('CANCELLED'));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export async function mockQuickRender(
  request: QuickRenderRequest,
  options: MockQuickRenderOptions = {},
): Promise<QuickRenderResult> {
  const taskId = options.taskId || createQuickRenderTaskId();
  const delayMs = options.delayMs ?? 1500 + Math.floor(Math.random() * 1001);
  const outcome = options.outcome ?? 'success';
  await waitForMockDelay(delayMs, options.signal);

  if (outcome === 'failed') throw new QuickRenderError('GENERATION_FAILED');
  const primaryImage = request.inputImages.find((image) => image.imageUrl.trim().length > 0);
  if (!primaryImage) throw new QuickRenderError('MISSING_INPUT');

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
