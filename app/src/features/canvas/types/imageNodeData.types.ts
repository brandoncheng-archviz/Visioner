import type { GenerationHistoryItem, GenerationTask } from './generation.types';
import type { ImageRole, PromptContent } from './imageNode.types';
import type { MarkItem, ModelParams } from './canvas.types';
import type { LightPreviewData } from './lightPreview.types';
import type { CurrentResultSet } from './history.types';

/**
 * Typed data shape for an ImageNode.
 * React Flow node.data is Record<string, unknown>; this interface
 * documents the expected fields so consumers can read safely.
 */
export interface ImageNodeData {
  label?: string;
  image?: string;
  inputImage?: string;
  currentImage?: string;
  currentResultId?: string | null;
  currentResultSet?: CurrentResultSet | null;
  isHistoryAsset?: boolean;
  isGeneratedResult?: boolean;
  generationStatus?: 'completed' | string;
  currentResultSource?: 'history' | string;
  generatedImages?: GenerationHistoryItem[] | string[];
  generationTask?: GenerationTask | null;
  prompt?: string;
  promptContent?: PromptContent[];
  selectedPresets?: string[];
  selectedStyleId?: string | null;
  role?: ImageRole;
  customRoleLabel?: string;
  localReferenceType?: import('./imageNode.types').LocalReferenceType;
  localReferenceLabel?: string;
  localReferencePoint?: { x: number; y: number };
  autoOpenLightPreview?: boolean;
  width?: number;
  height?: number;
  finalPrompt?: string;
  userPrompt?: string;
  marks?: MarkItem[];
  modelParams?: ModelParams;
  referenceOrder?: string[];
  referencesSignature?: string;
  // Edge-related callbacks injected by CanvasPage
  onStartLineDraw?: (nodeId: string, x: number, y: number) => void;
  onRemoveReferenceEdge?: (targetNodeId: string, sourceNodeId: string) => void;
  onAssignReferenceEdgeRole?: (targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string, localReferenceType?: import('./imageNode.types').LocalReferenceType) => void;
  onCreateSunSkyNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateCompareNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateUpscaleNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateRelightNode?: (sourceNodeId: string) => void;
  onOpenNodeHistory?: (nodeId: string) => void;
  lightPreview?: LightPreviewData;
}

function castRecord(data: unknown): Record<string, unknown> {
  return (data || {}) as Record<string, unknown>;
}

export function getCurrentImage(data: unknown): string {
  const d = castRecord(data);
  return (d.currentImage as string) || (d.image as string) || (d.inputImage as string) || '';
}

export function getInputImage(data: unknown): string {
  return (castRecord(data).inputImage as string) || '';
}

export function getCurrentResultId(data: unknown): string | null {
  return (castRecord(data).currentResultId as string | null | undefined) ?? null;
}

export function getNodeGenerationTask(data: unknown): GenerationTask | null {
  return (castRecord(data).generationTask as GenerationTask | undefined) || null;
}

export function getNodeWidth(data: unknown): number | undefined {
  return (castRecord(data).width as number) || undefined;
}

export function getNodeHeight(data: unknown): number | undefined {
  return (castRecord(data).height as number) || undefined;
}

export function normalizeGeneratedImages(value: unknown): GenerationHistoryItem[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (typeof value[0] === 'string') {
    const baseTime = Date.now();
    return (value as string[]).map((url, index) => ({
      resultId: `legacy-${baseTime}-${index}`,
      batchId: `legacy-batch-${baseTime}`,
      batchIndex: index + 1,
      imageUrl: url,
      prompt: '',
      userPrompt: '',
      inputRefs: [],
      presetIds: [],
      styleId: null,
      modelParams: { model: 'Nano Banana 2', ratio: '1:1', resolution: '2K', lens: '标准', count: '1张' },
      seed: 0,
      width: 1024,
      height: 1024,
      createdAt: baseTime + index,
    }));
  }
  return value as GenerationHistoryItem[];
}
