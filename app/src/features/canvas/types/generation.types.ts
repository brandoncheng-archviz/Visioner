import type { ModelParams } from './canvas.types';
import type { ImageMarkBox, ImageMarkCandidate, ImageMarkPoint, LocalReferencePoint, LocalReferenceType } from './imageNode.types';
import type { ImageControllerState } from './imageController.types';
import type { OutputResolutionTier, OutputSize } from '../utils/modelParams';
import type { RelightTimePeriod } from './relight.types';

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
    localReferenceType?: LocalReferenceType;
    localReferenceLabel?: string;
    localReferencePoint?: LocalReferencePoint;
    promptText: string;
  }>;
  markRefs?: Array<{
    markId: string;
    sourceNodeId: string;
    usageKey: string;
    usageLabel: string;
    markType: 'box';
    markPoint: ImageMarkPoint;
    markBox: ImageMarkBox;
    candidates: ImageMarkCandidate[];
    selectedCandidateId: string;
    markLabel: string;
    promptText: string;
  }>;
  modelParams?: {
    model: string;
    ratio: string;
    resolution: string;
    resolutionTier?: OutputResolutionTier;
    requestedSize?: OutputSize;
  };
}

export type ImageGenerationCount = 1 | 2 | 4;

export interface ImageGenerationRequest {
  nodeId: string;
  prompt: string;
  userPrompt: string;
  inputRefs: Array<{
    sourceNodeId: string;
    imageUrl: string;
    role: string;
    promptText: string;
  }>;
  markRefs?: Array<{
    sourceNodeId: string;
    label: string;
    region?: {
      point?: ImageMarkPoint;
      box?: ImageMarkBox;
    };
    promptText: string;
  }>;
  modelParams: {
    model: string;
    aspectRatio: string;
    resolution: string;
    resolutionTier: OutputResolutionTier;
    requestedSize: OutputSize;
    count: ImageGenerationCount;
  };
  controller?: unknown;
  lighting?: {
    timePeriod?: RelightTimePeriod;
    sun: {
      elevation: number;
      azimuth: number;
    };
    cloudAmount: number;
    fogAmount: number;
    promptText: string;
  };
  style?: unknown;
  presets?: string[];
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
  markRefs?: GenerationInput['markRefs'];
  result: GenerationResult | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface GenerationHistoryItem {
  resultId: string;
  batchId: string;
  batchIndex: number;
  imageUrl: string;
  prompt: string;
  userPrompt: string;
  inputRefs: GenerationInput['inputRefs'];
  markRefs?: GenerationInput['markRefs'];
  presetIds: string[];
  styleId: string | null;
  controller?: ImageControllerState;
  modelParams: ModelParams;
  seed: number;
  width: number;
  height: number;
  createdAt: number;
}

export interface GenerationCallbacks {
  onProgress?: (progress: number) => void;
}
