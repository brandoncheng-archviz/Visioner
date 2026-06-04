import type { GenerationInput } from './generation.types';
import type { ModelParams } from './canvas.types';
import type { LightPreviewData } from './lightPreview.types';

export interface GeneratedImage {
  resultId: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
}

export interface ResultSetBatch {
  batchId: string;
  nodeId: string;
  mode: 'preview' | 'final';
  images: GeneratedImage[];
  prompt: string;
  userPrompt: string;
  inputRefs: GenerationInput['inputRefs'];
  presetIds: string[];
  styleId: string | null;
  lightPreview?: LightPreviewData | null;
  modelParams: ModelParams;
  createdAt: number;
}

export interface CurrentResultSet {
  batchId: string;
  mode: 'preview' | 'final';
  images: GeneratedImage[];
  selectedIndex: number;
  isExpanded: boolean;
}
