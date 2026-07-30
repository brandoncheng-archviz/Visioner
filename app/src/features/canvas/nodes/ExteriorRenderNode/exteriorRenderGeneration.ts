import type {
  ExteriorRenderErrorCode,
  ExteriorRenderGenerationTask,
  ExteriorRenderRequest,
  ExteriorRenderResult,
} from './exteriorRender.types';
import { ExteriorRenderError } from './mockExteriorRender';
import { createIdleExteriorRenderTask, validateExteriorRenderRequest } from './exteriorRenderRequest';

type ExteriorRenderGenerationOptions = {
  request: ExteriorRenderRequest;
  taskId: string;
  signal?: AbortSignal;
  execute: (request: ExteriorRenderRequest) => Promise<ExteriorRenderResult>;
  isTaskActive: (taskId: string) => boolean;
  onTaskUpdate: (task: ExteriorRenderGenerationTask, result?: ExteriorRenderResult) => void;
  onResult: (request: ExteriorRenderRequest, result: ExteriorRenderResult) => boolean | Promise<boolean>;
  now?: () => number;
};

export type ExteriorRenderGenerationOutcome = 'success' | 'failed' | 'invalid' | 'ignored';

function resolveExteriorRenderErrorCode(error: unknown): ExteriorRenderErrorCode {
  return error instanceof ExteriorRenderError ? error.code : 'GENERATION_FAILED';
}

export async function runExteriorRenderGeneration({
  request,
  taskId,
  signal,
  execute,
  isTaskActive,
  onTaskUpdate,
  onResult,
  now = Date.now,
}: ExteriorRenderGenerationOptions): Promise<ExteriorRenderGenerationOutcome> {
  if (!validateExteriorRenderRequest(request).valid) return 'invalid';

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
    if (!didWriteResult) throw new ExteriorRenderError('GENERATION_FAILED');
    if (signal?.aborted || !isTaskActive(result.taskId)) return 'ignored';

    onTaskUpdate(createIdleExteriorRenderTask(), result);
    return 'success';
  } catch (error) {
    if (signal?.aborted || !isTaskActive(taskId)) return 'ignored';
    onTaskUpdate({
      taskId,
      status: 'failed',
      errorCode: resolveExteriorRenderErrorCode(error),
      startedAt,
      completedAt: now(),
    });
    return 'failed';
  }
}
