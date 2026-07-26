import type {
  QuickRenderErrorCode,
  QuickRenderGenerationTask,
  QuickRenderRequest,
  QuickRenderResult,
} from './quickRenderExterior.types';
import { QuickRenderError } from './mockQuickRender';
import { createIdleQuickRenderTask, validateQuickRenderRequest } from './quickRenderRequest';

type QuickRenderGenerationOptions = {
  request: QuickRenderRequest;
  taskId: string;
  signal?: AbortSignal;
  execute: (request: QuickRenderRequest) => Promise<QuickRenderResult>;
  isTaskActive: (taskId: string) => boolean;
  onTaskUpdate: (task: QuickRenderGenerationTask, result?: QuickRenderResult) => void;
  onResult: (request: QuickRenderRequest, result: QuickRenderResult) => boolean | Promise<boolean>;
  now?: () => number;
};

export type QuickRenderGenerationOutcome = 'success' | 'failed' | 'invalid' | 'ignored';

function resolveQuickRenderErrorCode(error: unknown): QuickRenderErrorCode {
  return error instanceof QuickRenderError ? error.code : 'GENERATION_FAILED';
}

export async function runQuickRenderGeneration({
  request,
  taskId,
  signal,
  execute,
  isTaskActive,
  onTaskUpdate,
  onResult,
  now = Date.now,
}: QuickRenderGenerationOptions): Promise<QuickRenderGenerationOutcome> {
  if (!validateQuickRenderRequest(request).valid) return 'invalid';

  const startedAt = now();
  onTaskUpdate({ taskId, status: 'processing', errorCode: null, startedAt, completedAt: null });

  try {
    const result = await execute(request);
    if (signal?.aborted || !isTaskActive(result.taskId)) return 'ignored';

    onTaskUpdate({
      taskId,
      status: 'success',
      errorCode: null,
      startedAt,
      completedAt: now(),
    }, result);

    const didWriteResult = await onResult(request, result);
    if (!didWriteResult) throw new QuickRenderError('GENERATION_FAILED');
    if (signal?.aborted || !isTaskActive(result.taskId)) return 'ignored';

    onTaskUpdate(createIdleQuickRenderTask(), result);
    return 'success';
  } catch (error) {
    if (signal?.aborted || !isTaskActive(taskId)) return 'ignored';
    onTaskUpdate({
      taskId,
      status: 'failed',
      errorCode: resolveQuickRenderErrorCode(error),
      startedAt,
      completedAt: now(),
    });
    return 'failed';
  }
}
