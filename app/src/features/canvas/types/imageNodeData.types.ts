import type { GenerationHistoryItem, GenerationTask } from './generation.types';
import type { ImageMark, ImageRole, LocalReferencePoint, PromptContent } from './imageNode.types';
import type { ConnectionHandleType, MarkItem, ModelParams } from './canvas.types';
import type { LightPreviewData } from './lightPreview.types';
import type { CurrentResultSet } from './history.types';
import type { ImageControllerState } from './imageController.types';
import type { OutputResolutionTier, OutputSize } from '../utils/modelParams';
import { normalizeImageModelParams } from '../utils/imageModelId';

export type CameraHeight = 'low' | 'eyeLevel' | 'slightlyHigh' | 'semiBirdsEye' | 'birdsEye' | 'aerial';
export type CameraFocalLength = 16 | 24 | 35 | 50 | 85 | 100;
export type CameraAperture = 'f/2.8' | 'f/4' | 'f/5.6' | 'f/8' | 'f/16';

export interface CameraControlData {
  enabled: boolean;
  height: CameraHeight;
  focalLength: CameraFocalLength;
  aperture: CameraAperture;
  twoPointPerspective: boolean;
}

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
  assetSource?: 'upload' | 'paste' | 'generated' | 'history' | 'exteriorRenderOutput' | string;
  isHistoryAsset?: boolean;
  isGeneratedResult?: boolean;
  generationStatus?: 'completed' | string;
  generationMode?: 'relight' | string;
  sourceImageNodeIds?: string[];
  /** @deprecated previewing/previewResult are retained only for legacy node-data compatibility. */
  status?: 'empty' | 'previewing' | 'previewResult' | 'generating' | 'result' | string;
  currentResultSource?: 'history' | string;
  generatedImages?: GenerationHistoryItem[] | string[];
  generationTask?: GenerationTask | null;
  sourceWorkflow?: ExteriorRenderWorkflowSource;
  isGenerating?: boolean;
  isProcessing?: boolean;
  isReferenceLocked?: boolean;
  prompt?: string;
  promptContent?: PromptContent[];
  selectedPresets?: string[];
  selectedStyleId?: string | null;
  controller?: ImageControllerState;
  role?: ImageRole;
  customRoleLabel?: string;
  localReferenceType?: import('./imageNode.types').LocalReferenceType;
  localReferenceLabel?: string;
  localReferencePoint?: LocalReferencePoint;
  autoOpenLightPreview?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: number;
  resolution?: string;
  fileSize?: number;
  finalPrompt?: string;
  userPrompt?: string;
  marks?: MarkItem[];
  imageMarks?: ImageMark[];
  activeImageMarkTargetNodeId?: string | null;
  activeImageMarkSourceNodeId?: string | null;
  activeImageMarkSessionId?: string | null;
  modelParams?: ModelParams;
  cameraControl?: CameraControlData;
  resolutionTier?: OutputResolutionTier;
  requestedSize?: OutputSize;
  actualSize?: OutputSize;
  referencesSignature?: string;
  // Edge-related callbacks injected by CanvasPage
  onStartLineDraw?: (
    nodeId: string,
    x: number,
    y: number,
    sourceHandleId?: string,
    sourceHandleType?: ConnectionHandleType,
  ) => void;
  onRemoveReferenceEdge?: (targetNodeId: string, sourceNodeId: string) => void;
  onAddImageReferenceEdge?: (targetNodeId: string, sourceNodeId: string) => void;
  onAssignReferenceEdgeRole?: (
    targetNodeId: string,
    sourceNodeId: string,
    role: ImageRole,
    customRoleLabel?: string,
    localReferenceType?: import('./imageNode.types').LocalReferenceType,
    localReferenceLabel?: string,
    localReferencePoint?: LocalReferencePoint,
  ) => void;
  onCreateSunSkyNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateCompareNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateUpscaleNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onOpenNodeHistory?: (nodeId: string) => void;
  onRegisterObjectUrl?: (url: string) => void;
  onFocusNode?: (nodeId: string) => void;
  onStartCanvasImageMarkSelection?: (targetNodeId: string) => void;
  onSelectCanvasImageMarkSource?: (sourceNodeId: string) => void;
  onExitCanvasImageMarkSelection?: () => void;
  onDuplicateNode?: (nodeId: string) => void;
  onDeleteNode?: (nodeId: string) => void;
  lightPreview?: LightPreviewData;
}

export interface ExteriorRenderWorkflowSnapshot {
  sourceNodeTitle: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  requestedSize?: OutputSize;
  atmosphere: {
    time: string | null;
    weather: string | null;
    lighting: string | null;
    style: string | null;
    addEntourage: boolean;
    addPeople: boolean;
    interiorLights: boolean;
    motionBlur: boolean;
  };
  renderChannels: string[];
  hasPrompt: boolean;
}

export interface ExteriorRenderWorkflowSource {
  type: 'exteriorRender';
  sourceNodeId: string;
  snapshot?: ExteriorRenderWorkflowSnapshot;
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
      modelParams: { model: 'nano-banana-2', ratio: '1:1', resolution: '2K', lens: '标准', count: '1张' },
      seed: 0,
      width: 1024,
      height: 1024,
      createdAt: baseTime + index,
    }));
  }
  return (value as GenerationHistoryItem[]).map((item) => ({
    ...item,
    modelParams: normalizeImageModelParams(item.modelParams),
  }));
}
