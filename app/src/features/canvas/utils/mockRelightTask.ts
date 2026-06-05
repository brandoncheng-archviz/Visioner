import type { LightPreviewData } from '../types/lightPreview.types';

export type RelightTaskType = 'preview' | 'generate';

export type RelightTaskStatus = 'idle' | 'running' | 'success' | 'error' | 'cancelled';

export interface RelightTaskState {
  id: string;
  type: RelightTaskType;
  status: RelightTaskStatus;
  startedAt?: number;
  completedAt?: number;
  errorMessage?: string;
}

export interface RelightTask extends RelightTaskState {
  nodeId: string;
  sourceImageNodeIds: string[];
  lightPreview: LightPreviewData;
  resultUrl?: string;
}

export interface CreateRelightTaskResult {
  task: RelightTask;
  cancel: () => void;
}

let taskIdCounter = 0;

function createMockPreviewImage(): string {
  const coverIndex = Math.floor(Math.random() * 20) + 1;
  return `/assets/mock/generation-results/show-cover-${coverIndex}.jpg`;
}

function createBaseTask(
  nodeId: string,
  sourceImageNodeIds: string[],
  type: RelightTaskType,
  lightPreview: LightPreviewData,
): RelightTask {
  taskIdCounter += 1;
  return {
    id: `relight-task-${taskIdCounter}-${Date.now()}`,
    nodeId,
    sourceImageNodeIds,
    type,
    status: 'running',
    lightPreview,
    startedAt: Date.now(),
  };
}

export function mockRelightPreview(
  nodeId: string,
  sourceImageNodeIds: string[],
  lightPreview: LightPreviewData,
  onComplete: (task: RelightTaskState, resultUrl: string) => void,
): CreateRelightTaskResult {
  const task = createBaseTask(nodeId, sourceImageNodeIds, 'preview', lightPreview);
  const controller = new AbortController();

  const delay = 500 + Math.floor(Math.random() * 400);

  const timer = window.setTimeout(() => {
    if (controller.signal.aborted) return;
    task.status = 'success';
    task.completedAt = Date.now();
    task.resultUrl = createMockPreviewImage();
    onComplete(task, task.resultUrl);
  }, delay);

  const cancel = () => {
    controller.abort();
    window.clearTimeout(timer);
    if (task.status === 'running') {
      task.status = 'cancelled';
    }
  };

  return { task, cancel };
}

export function mockRelightGenerate(
  nodeId: string,
  sourceImageNodeIds: string[],
  lightPreview: LightPreviewData,
  onComplete: (task: RelightTaskState, resultUrl: string) => void,
): CreateRelightTaskResult {
  const task = createBaseTask(nodeId, sourceImageNodeIds, 'generate', lightPreview);
  const controller = new AbortController();

  const delay = 900 + Math.floor(Math.random() * 301);

  const timer = window.setTimeout(() => {
    if (controller.signal.aborted) return;
    task.status = 'success';
    task.completedAt = Date.now();
    task.resultUrl = createMockPreviewImage();
    onComplete(task, task.resultUrl);
  }, delay);

  const cancel = () => {
    controller.abort();
    window.clearTimeout(timer);
    if (task.status === 'running') {
      task.status = 'cancelled';
    }
  };

  return { task, cancel };
}

export function cancelRelightTask(cancelFn: (() => void) | undefined | null): void {
  if (cancelFn) {
    cancelFn();
  }
}
