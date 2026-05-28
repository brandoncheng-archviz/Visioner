import type { UpscaleEngine, UpscaleMode } from '../types/upscaleNode.types';

export interface UpscaleTask {
  taskId: string;
  sourceNodeId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  progress: number;
  engine: UpscaleEngine;
  scale: number;
  mode: UpscaleMode;
  result: { imageUrl: string; width: number; height: number } | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface UpscaleCallbacks {
  onProgress?: (progress: number) => void;
}

const MOCK_IMAGES = Array.from(
  { length: 20 },
  (_, i) => `/assets/mock/generation-results/show-cover-${i + 1}.jpg`,
);

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    const handleAbort = () => {
      window.clearTimeout(timeoutId);
      reject(new Error('Aborted'));
    };

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

export function createUpscaleTask(params: {
  sourceNodeId: string;
  engine: UpscaleEngine;
  scale: number;
  mode: UpscaleMode;
}): UpscaleTask {
  return {
    taskId: `upscale-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceNodeId: params.sourceNodeId,
    status: 'pending',
    progress: 0,
    engine: params.engine,
    scale: params.scale,
    mode: params.mode,
    result: null,
    errorMessage: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export async function simulateUpscale(
  params: {
    sourceNodeId: string;
    engine: UpscaleEngine;
    scale: number;
    mode: UpscaleMode;
  },
  callbacks: UpscaleCallbacks = {},
  signal?: AbortSignal,
): Promise<{ imageUrl: string; width: number; height: number }> {
  const totalDelay = randomInt(2000, 5000);
  const steps = 10;
  const stepDelay = totalDelay / steps;

  for (let i = 1; i <= steps; i++) {
    if (signal?.aborted) {
      throw new Error('Aborted');
    }
    await wait(stepDelay, signal);
    callbacks.onProgress?.(Math.round((i / steps) * 100));
  }

  if (signal?.aborted) {
    throw new Error('Aborted');
  }

  // 10% failure rate
  if (Math.random() < 0.1) {
    throw new Error('Detail enhancement failed: model inference error');
  }

  const imageUrl = pickRandom(MOCK_IMAGES);
  const baseWidth = randomInt(1024, 2048);
  const baseHeight = randomInt(1024, 2048);

  return {
    imageUrl,
    width: baseWidth * params.scale,
    height: baseHeight * params.scale,
  };
}
