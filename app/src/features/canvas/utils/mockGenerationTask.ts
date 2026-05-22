import type { GenerationInput, GenerationResult, GenerationTask, GenerationCallbacks } from '../types/generation.types';

let taskCounter = 0;

function createTaskId() {
  return `gen-${Date.now()}-${++taskCounter}`;
}

function createMockResult(input: GenerationInput): GenerationResult {
  const coverIndex = Math.floor(Math.random() * 20) + 1;
  return {
    taskId: createTaskId(),
    imageUrl: `/assets/mock/generation-results/show-cover-${coverIndex}.jpg`,
    width: 1024,
    height: 1024,
    seed: Math.floor(Math.random() * 1000000),
    metadata: {
      prompt: input.prompt,
      model: input.modelParams?.model || 'Nano Banana 2',
      resolution: input.modelParams?.resolution || '2K',
    },
  };
}

export function createGenerationTask(input: GenerationInput): GenerationTask {
  const now = Date.now();
  return {
    taskId: createTaskId(),
    sourceNodeId: input.sourceNodeId,
    status: 'running',
    progress: 0,
    prompt: input.prompt,
    inputRefs: input.inputRefs,
    result: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function simulateGeneration(
  input: GenerationInput,
  callbacks?: GenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerationResult> {
  return new Promise((resolve, reject) => {
    const totalDuration = 2000 + Math.random() * 3000; // 2~5s
    const updateInterval = 120; // ms
    const failProbability = 0.1; // 10% fail rate

    let elapsed = 0;
    let progress = 0;
    let settled = false;

    const intervalId = setInterval(() => {
      if (settled) return;

      elapsed += updateInterval;
      progress = Math.min(95, Math.floor((elapsed / totalDuration) * 100));
      callbacks?.onProgress?.(progress);

      if (elapsed >= totalDuration) {
        settled = true;
        clearInterval(intervalId);

        if (signal?.aborted) {
          reject(new Error('任务已取消'));
          return;
        }

        const shouldFail = Math.random() < failProbability;
        if (shouldFail) {
          const errorMessages = [
            '生成超时，请稍后重试',
            '模型服务暂时不可用',
            '输入参数异常，请检查引用图和提示词',
            '生成结果被安全策略拦截，请修改提示词',
          ];
          const message = errorMessages[Math.floor(Math.random() * errorMessages.length)];
          reject(new Error(message));
        } else {
          resolve(createMockResult(input));
        }
      }
    }, updateInterval);

    if (signal) {
      const onAbort = () => {
        if (settled) return;
        settled = true;
        clearInterval(intervalId);
        reject(new Error('任务已取消'));
      };
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    }
  });
}
