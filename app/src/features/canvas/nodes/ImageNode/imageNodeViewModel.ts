import type { NodeProps } from '@xyflow/react';

import type { GenerationTask } from '../../types/generation.types';
import type { CurrentResultSet } from '../../types/history.types';
import { getCurrentImage, normalizeGeneratedImages } from '../../types/imageNodeData.types';
import type {
  ImageNodeContentKind,
  ImageNodeTaskType,
  ImageNodeViewKind,
  ImageNodeVisualStatus,
} from './imageNodeState';

type ImageNodeData = NodeProps['data'];

type CreateImageNodeViewModelContext = {
  displayImage?: string | null;
  currentResultSet?: CurrentResultSet | null;
  generationTask?: GenerationTask | null;
  hasGenerationIntent?: boolean;
};

export type ImageNodeViewModel = {
  status: ImageNodeVisualStatus;
  viewKind: ImageNodeViewKind;
  contentKind: ImageNodeContentKind;
  taskType: ImageNodeTaskType;
  isEmpty: boolean;
  isReady: boolean;
  isProcessing: boolean;
  hasImage: boolean;
  hasGeneratedResult: boolean;
  showUploadArea: boolean;
  showImagePreview: boolean;
  showControlPanel: boolean;
  showPromptEditor: boolean;
  showTopToolbar: boolean;
  showGeneratedToolbar: boolean;
  showReferenceUsageControl: boolean;
  canUpload: boolean;
  canEditPrompt: boolean;
  canEditReferenceUsage: boolean;
  canEditPreset: boolean;
  canEditStyle: boolean;
  canEditLighting: boolean;
  canEditModel: boolean;
  canGenerate: boolean;
  canUseToolbarActions: boolean;
  canPreview: boolean;
  canDownload: boolean;
  canUpscale: boolean;
  canCompare: boolean;
  canRelight: boolean;
  canDeleteReference: boolean;
};

export function createImageNodeViewModel(
  data: ImageNodeData,
  context: CreateImageNodeViewModelContext = {},
): ImageNodeViewModel {
  const generationTask = context.generationTask ?? getNodeTask(data);
  const taskType = getTaskType(data, generationTask);
  const isProcessing = generationTask?.status === 'running' || Boolean(data.isGenerating || data.isProcessing);
  const displayImage = context.displayImage ?? getCurrentImage(data);
  const generatedImages = normalizeGeneratedImages(data.generatedImages);
  const currentResultSet = context.currentResultSet ?? (data.currentResultSet as CurrentResultSet | null | undefined) ?? null;
  const assetSource = data.assetSource as string | undefined;
  const hasGeneratedResult = Boolean(
    currentResultSet ||
    generatedImages.length > 0 ||
    data.currentResultId ||
    data.isGeneratedResult ||
    data.generationStatus === 'completed' ||
    data.currentResultSource === 'history' ||
    assetSource === 'generated' ||
    assetSource === 'history'
  );
  const hasImage = Boolean(displayImage);
  const contentKind = getContentKind(data, hasImage, hasGeneratedResult);
  const status: ImageNodeVisualStatus = isProcessing ? 'processing' : hasImage || hasGeneratedResult ? 'ready' : 'empty';
  const viewKind = getViewKind(contentKind, isProcessing);
  const isEmpty = status === 'empty';
  const isReady = status === 'ready';
  const hasGenerationIntent = Boolean(context.hasGenerationIntent);
  const showEditorSurface = viewKind === 'empty' || viewKind === 'editor' || viewKind === 'processing';
  const canEditEditorControls = (viewKind === 'empty' || viewKind === 'editor') && !isProcessing;
  const showReferenceUsageControl = hasImage && (
    viewKind === 'resource' ||
    viewKind === 'editor' ||
    viewKind === 'processing'
  );
  const canEditReferenceUsage = hasImage && (viewKind === 'resource' || viewKind === 'editor') && !isProcessing;
  const canUseToolbarActions = hasImage && !isProcessing;

  return {
    status,
    viewKind,
    contentKind,
    taskType,
    isEmpty,
    isReady,
    isProcessing,
    hasImage,
    hasGeneratedResult,
    showUploadArea: isEmpty,
    showImagePreview: hasImage,
    showControlPanel: showEditorSurface,
    showPromptEditor: showEditorSurface,
    showTopToolbar: (viewKind === 'resource' || viewKind === 'editor' || viewKind === 'processing') && hasImage,
    showGeneratedToolbar: viewKind === 'editor' && hasGeneratedResult,
    showReferenceUsageControl,
    canUpload: viewKind === 'empty' && !isProcessing,
    canEditPrompt: canEditEditorControls,
    canEditReferenceUsage,
    canEditPreset: canEditEditorControls,
    canEditStyle: canEditEditorControls,
    canEditLighting: canEditEditorControls,
    canEditModel: canEditEditorControls,
    canGenerate: canEditEditorControls && hasGenerationIntent,
    canUseToolbarActions,
    canPreview: canUseToolbarActions,
    canDownload: canUseToolbarActions,
    canUpscale: canUseToolbarActions,
    canCompare: canUseToolbarActions,
    canRelight: canUseToolbarActions,
    canDeleteReference: canEditEditorControls,
  };
}

function getNodeTask(data: ImageNodeData): GenerationTask | null {
  return (data.generationTask as GenerationTask | null | undefined) ?? null;
}

function getContentKind(
  data: ImageNodeData,
  hasImage: boolean,
  hasGeneratedResult: boolean,
): ImageNodeContentKind {
  if (!hasImage && !hasGeneratedResult) return 'none';

  const assetSource = data.assetSource as string | undefined;
  if (data.isHistoryAsset || data.currentResultSource === 'history' || assetSource === 'history') return 'history';
  if (hasGeneratedResult || assetSource === 'generated') return 'generated';
  if (assetSource === 'upload' || assetSource === 'paste') return 'uploaded';
  return 'external';
}

function getViewKind(contentKind: ImageNodeContentKind, isProcessing: boolean): ImageNodeViewKind {
  if (isProcessing) return 'processing';
  if (contentKind === 'uploaded' || contentKind === 'external') return 'resource';
  if (contentKind === 'generated' || contentKind === 'history') return 'editor';
  return 'empty';
}

function getTaskType(data: ImageNodeData, generationTask: GenerationTask | null): ImageNodeTaskType {
  if (generationTask?.status !== 'running') return null;
  const rawTaskType = data.taskType || data.processingType || data.currentTaskType;
  if (rawTaskType === 'upscale' || rawTaskType === 'relight' || rawTaskType === 'prompt_reverse') {
    return rawTaskType;
  }
  return 'generate';
}
