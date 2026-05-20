export type GenerationStatus = 'pending' | 'running' | 'success' | 'failed';

export interface GenerationInput {
  sourceNodeId: string;
  prompt: string;
  inputRefs: Array<{
    imageId: string;
    imageUrl: string;
    usageKey: string;
    usageLabel: string;
    customUsageName?: string;
    promptText: string;
  }>;
  modelParams?: {
    model: string;
    ratio: string;
    resolution: string;
  };
}

export interface GenerationResult {
  taskId: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
  metadata: {
    prompt: string;
    model: string;
    resolution: string;
  };
}

export interface GenerationTask {
  taskId: string;
  sourceNodeId: string;
  status: GenerationStatus;
  progress: number; // 0 ~ 100
  prompt: string;
  inputRefs: GenerationInput['inputRefs'];
  result: GenerationResult | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface GenerationCallbacks {
  onProgress?: (progress: number) => void;
}
