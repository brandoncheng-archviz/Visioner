import { useState, useRef, useEffect, useCallback, useMemo, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Copy, Crop, Download, Image, Maximize2, Minimize2, Plus, ScanSearch, Trash2, Upload } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import type { ImageMark, ImageRole, PromptContent, ReferenceInfo, LocalReferencePoint, LocalReferenceType } from '../../types/imageNode.types';
import type { ModelParams } from '../../types/canvas.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import type { GenerationTask, GenerationHistoryItem } from '../../types/generation.types';
import type { CurrentResultSet, ResultSetBatch, GeneratedImage } from '../../types/history.types';
import type { TextReferenceInfo, TextNodeData } from '../../types/basicNode.types';
import {
  normalizeGeneratedImages,
  getCurrentImage,
  getNodeGenerationTask,
  getNodeWidth,
  getNodeHeight,
  type QuickRenderWorkflowSource,
} from '../../types/imageNodeData.types';
import { useHistory } from '../../contexts/HistoryContext';
import {
  createGenerationTask,
  getMockGenerationErrorCode,
  simulateGeneration,
  type MockGenerationErrorCode,
} from '../../utils/mockGenerationTask';
import { checkGenerationRequestSafety, checkGenerationResultSafety } from '../../utils/contentSafety';
import {
  CANVAS_NODE_CARD_BACKGROUND,
  CANVAS_NODE_CARD_BORDER_COLOR,
  CANVAS_NODE_CARD_BORDER_WIDTH,
  CANVAS_NODE_CARD_RADIUS,
  CANVAS_NODE_CARD_SELECTED_BORDER_COLOR,
  CANVAS_NODE_CONTROL_SCALE,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  DEFAULT_MODEL_PARAMS,
} from '../../constants/canvasConstants';
import { UNIQUE_USAGES, getImageRoleOption, getImageRoleLabel, getImageRoleColor, getLocalReferenceTypeFromRole, getLocalReferenceLabel, getReferenceUsageInfo, normalizeLocalReferenceType } from '../../constants/imageUsages';
import { getStylePresetById } from '../../constants/presets';
import { buildPromptSubmission, createImageMarkReferenceBlock } from '../../utils/promptUtils';
import { buildImageGenerationRequest } from '../../utils/imageGenerationRequest';
import { getRoleData } from '../../utils/referenceUtils';
import { resolveNodeImage } from '../../utils/resolveNodeImage';
import { resolveImageNodeSize } from '../../utils/imageNodeSizing';
import { formatReferenceLimitIssue, getReferenceLimitIssueForGenerate } from '../../utils/referenceLimits';
import { getTextContent } from '../../utils/textNodeUtils';
import { identifyImageElement } from '../../services/identifyElement';
import { registerImageMarkCaptureEntry } from '../../utils/imageMarkCaptureRegistry';
import { ImageToolbar } from '../../components/ImageToolbar';
import { ImagePreviewModal } from '../../components/ImagePreviewModal';
import { ImageRoleTag } from '../../components/ImageRoleTag';
import { ImageNodeControlPanel } from './ImageNodeControlPanel';
import type { ImageNodeControllers } from './controllers';
import { ImageCropOverlay, type NormalizedCropRect } from './ImageCropOverlay';
import { createImageNodeViewModel } from './imageNodeViewModel';
import { cropCoverImage } from '../../utils/cropImage';

const MOCK_GENERATION_ERROR_KEYS: Record<MockGenerationErrorCode, string> = {
  cancelled: 'imageNode.errors.cancelled',
  timeout: 'imageNode.errors.timeout',
  serviceUnavailable: 'imageNode.errors.serviceUnavailable',
  invalidInput: 'imageNode.errors.invalidInput',
  safetyCheckFailed: 'imageNode.errors.safetyCheckFailed',
};

function hasValidPromptContentInput(promptContent: PromptContent[]) {
  return promptContent.some((block) => {
    if (block.type === 'image_reference' || block.type === 'image_mark_reference') return true;
    if (block.type === 'text') return block.text.trim().length > 0;
    return false;
  });
}

export function ImageNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const translate = useCallback((key: string) => t(key), [t]);
  const { show: showToast } = useToast();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;

  const currentImage = getCurrentImage(data);
  const rawRole = (data.role as ImageRole | null | undefined) ?? null;
  const role = rawRole;
  const customRoleLabel = data.customRoleLabel as string | undefined;
  const localReferenceType = normalizeLocalReferenceType((data.localReferenceType as LocalReferenceType | undefined)) ?? getLocalReferenceTypeFromRole(rawRole);
  const localReferenceLabel = (data.localReferenceLabel as string | undefined) ?? getLocalReferenceLabel(
    rawRole,
    localReferenceType,
    data.localReferenceLabel as string | undefined,
    customRoleLabel,
    translate,
  );
  const fileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [nodeName, setNodeName] = useState((data.label as string) || t('imageNode.title'));
  const [localDisplayImage, setLocalDisplayImage] = useState(currentImage);
  const [editingName, setEditingName] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState(false);
  const [isCropMode, setIsCropMode] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const markRequestIdRef = useRef(0);
  const pendingMarkSourceActivationRef = useRef<string | null>(null);
  const markLabelButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [activeMarkMenuId, setActiveMarkMenuId] = useState<string | null>(null);
  const [activeMarkButtonRect, setActiveMarkButtonRect] = useState<DOMRect | null>(null);
  const [markTargetNodeId, setMarkTargetNodeId] = useState(id);
  const [visibleSessionMarks, setVisibleSessionMarks] = useState<{ sessionId: string | null; ids: Set<string> }>(() => ({ sessionId: null, ids: new Set() }));

  /* ─── Point-pick mode for local reference ─── */
  const [isPointPickMode, setIsPointPickMode] = useState(false);
  const [pendingLightPanelOpen, setPendingLightPanelOpen] = useState(false);
  const [pointPickLoading, setPointPickLoading] = useState(false);
  const [pointPickError, setPointPickError] = useState(false);
  const [pointPickFeedbackPoint, setPointPickFeedbackPoint] = useState<{ normalizedX: number; normalizedY: number } | null>(null);
  const { setNodes, setEdges } = useReactFlow();

  /* ─── Extended node state ─── */
  const [promptText, setPromptText] = useState((data.prompt as string) || '');
  const [promptContent, setPromptContent] = useState<PromptContent[]>((data.promptContent as PromptContent[]) || []);
  const [imageMarks, setImageMarks] = useState<ImageMark[]>((data.imageMarks as ImageMark[] | undefined) || []);
  const [lightPreview, setLightPreview] = useState<LightPreviewData | null>((data.lightPreview as LightPreviewData | null | undefined) ?? null);
  const [selectedPresets] = useState<string[]>((data.selectedPresets as string[]) || []);
  const [selectedStyleId] = useState<string | null>((data.selectedStyleId as string | null | undefined) || null);
  const controllers = data.controllers as ImageNodeControllers | undefined;
  const workflowSource = data.sourceWorkflow as QuickRenderWorkflowSource | undefined;
  const [modelParams, setModelParams] = useState<ModelParams>((data.modelParams as ModelParams) || DEFAULT_MODEL_PARAMS);
  const [generatedImages, setGeneratedImages] = useState<GenerationHistoryItem[]>(normalizeGeneratedImages(data.generatedImages));
  const [generationTask, setGenerationTask] = useState<GenerationTask | null>(getNodeGenerationTask(data));

  /* ─── Current Result Set ─── */
  const { addBatch } = useHistory();

  const legacyCurrentResultSet = useMemo((): CurrentResultSet | null => {
    const legacy = normalizeGeneratedImages(data.generatedImages);
    if (legacy.length === 0) return null;
    const lastBatchId = legacy[legacy.length - 1]?.batchId;
    const lastBatch = legacy.filter((item) => item.batchId === lastBatchId);
    if (lastBatch.length === 0) return null;
    return {
      batchId: lastBatchId,
      images: lastBatch.map((item) => ({
        resultId: item.resultId,
        imageUrl: item.imageUrl,
        width: item.width,
        height: item.height,
        seed: item.seed,
      })),
      selectedIndex: 0,
      isExpanded: false,
    };
  }, [data.generatedImages]);

  const [currentResultSet, setCurrentResultSet] = useState<CurrentResultSet | null>(
    (data.currentResultSet as CurrentResultSet | undefined) || legacyCurrentResultSet,
  );

  const selectedResultImage = currentResultSet?.images[currentResultSet.selectedIndex] || null;
  const displayImage = currentResultSet
    ? selectedResultImage?.imageUrl
    : localDisplayImage || currentImage;
  const markSourceImageRef = useRef(displayImage);
  const resultImageCount = currentResultSet?.images.length ?? 0;
  const isMultiResultSet = resultImageCount > 1;
  const isMultiResultExpanded = Boolean(isMultiResultSet && currentResultSet?.isExpanded);

  // Cleanup: abort running generation on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      markRequestIdRef.current += 1;
    };
  }, []);

  // Sync local generation state from node.data (for Undo/Redo and external updates)
  useEffect(() => {
    const next = getNodeGenerationTask(data);
    setGenerationTask((prev) => {
      if (prev === next) return prev;
      if (
        prev?.taskId === next?.taskId &&
        prev?.status === next?.status &&
        prev?.progress === next?.progress &&
        prev?.errorMessage === next?.errorMessage &&
        prev?.result?.taskId === next?.result?.taskId
      ) {
        return prev;
      }
      return next;
    });
  }, [data.generationTask]);

  useEffect(() => {
    const nextCurrent = getCurrentImage(data);
    setLocalDisplayImage((prev) => (prev === nextCurrent ? prev : nextCurrent));
  }, [data.currentImage, data.image, data.inputImage]);

  useEffect(() => {
    const nextMarks = (data.imageMarks as ImageMark[] | undefined) ?? [];
    setImageMarks((current) => JSON.stringify(current) === JSON.stringify(nextMarks) ? current : nextMarks);
  }, [data.imageMarks]);

  useEffect(() => {
    const nextContent = (data.promptContent as PromptContent[] | undefined) ?? [];
    setPromptContent((current) => JSON.stringify(current) === JSON.stringify(nextContent) ? current : nextContent);
  }, [data.promptContent]);

  useEffect(() => {
    const next = (data.lightPreview as LightPreviewData | null | undefined) ?? null;
    setLightPreview((prev) => {
      if (prev === next) return prev;
      if (
        prev?.enabled === next?.enabled &&
        prev?.sun.elevation === next?.sun.elevation &&
        prev?.sun.azimuth === next?.sun.azimuth &&
        prev?.derived.previewImagePath === next?.derived.previewImagePath
      ) {
        return prev;
      }
      return next;
    });
  }, [data.lightPreview]);

  useEffect(() => {
    if (!selectedResultImage) return;
    if (!selectedResultImage.width || !selectedResultImage.height) return;
    setImgSize({ width: selectedResultImage.width, height: selectedResultImage.height });
  }, [selectedResultImage]);

  useEffect(() => {
    const nextName = (data.label as string | undefined) || t('imageNode.title');
    if (!editingName) {
      setNodeName((prev) => (prev === nextName ? prev : nextName));
    }
  }, [data.label, editingName, t]);

  useEffect(() => {
    const next = normalizeGeneratedImages(data.generatedImages);
    setGeneratedImages((prev) => {
      if (prev.length !== next.length) return next;
      if (prev.some((item, i) => item.resultId !== next[i]?.resultId)) return next;
      return prev;
    });
  }, [data.generatedImages]);

  useEffect(() => {
    const next = (data.currentResultSet as CurrentResultSet | null | undefined) || null;
    setCurrentResultSet((prev) => {
      if (!prev && !next) return prev;
      if (
        prev &&
        next &&
        prev.batchId === next.batchId &&
        prev.selectedIndex === next.selectedIndex &&
        prev.isExpanded === next.isExpanded &&
        prev.images.length === next.images.length &&
        prev.images.every((image, index) => (
          image.resultId === next.images[index]?.resultId &&
          image.imageUrl === next.images[index]?.imageUrl &&
          image.width === next.images[index]?.width &&
          image.height === next.images[index]?.height
        ))
      ) {
        return prev;
      }
      return next;
    });
  }, [data.currentResultSet]);

  // Sync currentResultSet and selected result image back to node.data.
  useEffect(() => {
    if (!currentResultSet) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const existing = n.data.currentResultSet as CurrentResultSet | undefined;
        const selectedImage = currentResultSet?.images[currentResultSet.selectedIndex] || null;
        const nextImageUrl = selectedImage?.imageUrl;
        if (
          existing &&
          currentResultSet &&
          existing.batchId === currentResultSet.batchId &&
          existing.selectedIndex === currentResultSet.selectedIndex &&
          existing.isExpanded === currentResultSet.isExpanded &&
          n.data.currentImage === nextImageUrl &&
          n.data.currentResultId === selectedImage?.resultId
        ) {
          return n;
        }
        return {
          ...n,
          data: {
            ...n.data,
            currentResultSet,
            ...(selectedImage
              ? {
                  image: selectedImage.imageUrl,
                  currentImage: selectedImage.imageUrl,
                  currentResultId: selectedImage.resultId,
                  width: selectedImage.width,
                  height: selectedImage.height,
                }
              : {}),
          },
        };
      }),
    );
  }, [id, currentResultSet, setNodes]);

  /* ─── Reference tracking ─── */
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);
  const references: ReferenceInfo[] = useMemo(() => {
    const inputEdges = allEdges.filter((e) => e.target === id);
    const rawReferences = inputEdges.flatMap((edge) => {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (sourceNode?.type === 'sunSky') return [];
      const edgeRole = edge.data?.role as ImageRole | null | undefined;
      const edgeCustomRoleLabel = edge.data?.customRoleLabel as string | undefined;
      const edgeLocalRefType = edge.data?.localReferenceType as LocalReferenceType | undefined;
      const edgeLocalRefLabel = edge.data?.localReferenceLabel as string | undefined;
      const edgeLocalRefPoint = edge.data?.localReferencePoint as LocalReferencePoint | undefined;
      const sourceRole = (sourceNode?.data?.role as ImageRole | null) || null;
      const sourceCustomRoleLabel = sourceNode?.data?.customRoleLabel as string | undefined;
      const sourceLocalRefType = sourceNode?.data?.localReferenceType as LocalReferenceType | undefined;
      const sourceLocalRefLabel = sourceNode?.data?.localReferenceLabel as string | undefined;
      const sourceLocalRefPoint = sourceNode?.data?.localReferencePoint as LocalReferencePoint | undefined;
      const referenceRole = edgeRole ?? sourceRole;
      const referenceCustomRoleLabel = edgeCustomRoleLabel ?? sourceCustomRoleLabel;
      const usageInfo = getReferenceUsageInfo(
        referenceRole,
        referenceCustomRoleLabel,
        edgeLocalRefType ?? sourceLocalRefType,
        edgeLocalRefLabel ?? sourceLocalRefLabel,
        translate,
      );
      const imageUrl = getCurrentImage(sourceNode?.data);
      if (!imageUrl) return [];
      return [{
        nodeId: edge.source,
        index: 0,
        role: referenceRole,
        roleLabel: usageInfo.label,
        customRoleLabel: referenceCustomRoleLabel,
        localReferenceType: usageInfo.localReferenceType,
        localReferenceLabel: usageInfo.localReferenceLabel,
        localReferencePoint: edgeLocalRefPoint ?? sourceLocalRefPoint,
        imageUrl,
        width: getNodeWidth(sourceNode?.data),
        height: getNodeHeight(sourceNode?.data),
      }];
    });
    return rawReferences.map((ref, idx) => ({ ...ref, index: idx + 1 }));
  }, [allEdges, allNodes, id, translate]);
  const textReferences: TextReferenceInfo[] = useMemo(() => {
    return allEdges
      .filter((edge) => edge.target === id)
      .flatMap((edge) => {
        const sourceNode = allNodes.find((node) => node.id === edge.source);
        if (sourceNode?.type !== 'text') return [];
        const sourceData = sourceNode.data as TextNodeData;
        const content = getTextContent(sourceData);
        return [{
          nodeId: sourceNode.id,
          title: sourceData.label || sourceData.title || t('canvas.nodeLabels.text'),
          content,
          status: content ? 'result' : (sourceData.status || 'empty'),
        }];
      });
  }, [allEdges, allNodes, id, t]);
  const referencesSignature = JSON.stringify(
    references.map((reference) => ({
      nodeId: reference.nodeId,
      role: reference.role,
      roleLabel: reference.roleLabel,
      customRoleLabel: reference.customRoleLabel,
      localReferenceType: reference.localReferenceType,
      localReferenceLabel: reference.localReferenceLabel,
      localReferencePoint: reference.localReferencePoint,
      imageUrl: reference.imageUrl,
      width: reference.width,
      height: reference.height,
    })),
  );
  const savedReferencesSignature = data.referencesSignature as string | undefined;

  useEffect(() => {
    if (savedReferencesSignature === referencesSignature) return;
    if (
      references.length === 0 &&
      !savedReferencesSignature &&
      !data.references &&
      !data.referenceImages
    ) {
      return;
    }
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        if ((n.data.referencesSignature as string | undefined) === referencesSignature) return n;
        return {
          ...n,
          data: {
            ...n.data,
            references,
            referenceImages: references.map((reference) => ({
              imageId: reference.nodeId,
              imageUrl: reference.imageUrl,
              usageKey: reference.role ?? 'undefined_usage',
              usageLabel: reference.roleLabel || t('imageNode.undefinedUsage'),
              customUsageName: reference.customRoleLabel,
              localReferenceType: reference.localReferenceType,
              localReferenceLabel: reference.localReferenceLabel,
              localReferencePoint: reference.localReferencePoint,
            })),
            referencesSignature,
          },
        };
      }),
    );
  }, [id, references, referencesSignature, savedReferencesSignature, setNodes, t]);

  const selectedStyle = getStylePresetById(selectedStyleId);
  const textReferencePrompt = textReferences
    .map((reference) => reference.content.trim())
    .filter(Boolean)
    .join('\n\n');
  const hasGenerationIntent = (
    promptText.trim().length > 0 ||
    hasValidPromptContentInput(promptContent)
  );
  const hasImageReferences = references.length > 0;
  const imageNodeViewModel = createImageNodeViewModel(data, {
    displayImage,
    currentResultSet,
    generationTask,
    hasGenerationIntent,
    hasImageReferences,
    isReferenceLocked: Boolean(data.isReferenceLocked),
  });
  const isGenerating = imageNodeViewModel.isProcessing;
  const canGenerate = imageNodeViewModel.canGenerate;
  const shouldShowInputHandle = imageNodeViewModel.contentKind !== 'uploaded' && imageNodeViewModel.contentKind !== 'external';
  const canEditRole = imageNodeViewModel.canEditReferenceUsage;
  const activeImageMarkTargetNodeId = data.activeImageMarkTargetNodeId as string | null | undefined;
  const activeImageMarkSourceNodeId = data.activeImageMarkSourceNodeId as string | null | undefined;
  const activeImageMarkSessionId = data.activeImageMarkSessionId as string | null | undefined;
  const canvasMarkableNodes = useMemo(() => allNodes.filter((node) => {
    if (node.type !== 'image' || !getCurrentImage(node.data)) return false;
    const sourceTask = node.data.generationTask as GenerationTask | null | undefined;
    if (sourceTask?.status === 'running' || node.data.isGenerating || node.data.isProcessing) return false;
    return true;
  }), [allNodes]);
  const canStartMarking = !imageNodeViewModel.isProcessing && canvasMarkableNodes.length > 0;
  const isCanvasMarkSelectionMode = Boolean(activeImageMarkTargetNodeId);
  const isCanvasMarkSelectable = isCanvasMarkSelectionMode
    && Boolean(displayImage)
    && !imageNodeViewModel.isProcessing
    && !imageNodeViewModel.isReferenceLocked;

  useEffect(() => {
    if (imageNodeViewModel.canEditMarks) return;
    const raf = requestAnimationFrame(() => {
      markRequestIdRef.current += 1;
      setIsPointPickMode(false);
      setPointPickLoading(false);
      setActiveMarkMenuId(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [imageNodeViewModel.canEditMarks]);

  useEffect(() => {
    if (activeImageMarkTargetNodeId !== id || !imageNodeViewModel.isProcessing) return;
    const onExitSelection = data.onExitCanvasImageMarkSelection as (() => void) | undefined;
    onExitSelection?.();
  }, [activeImageMarkTargetNodeId, data.onExitCanvasImageMarkSelection, id, imageNodeViewModel.isProcessing]);

  const handleRoleMenuOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!canEditRole) {
        setRoleMenuOpen(false);
        return;
      }
      setRoleMenuOpen(nextOpen);
    },
    [canEditRole],
  );

  useEffect(() => {
    if (!canEditRole && roleMenuOpen) {
      setRoleMenuOpen(false);
    }
  }, [canEditRole, roleMenuOpen]);

  const selectResultImage = useCallback((index: number) => {
    setCurrentResultSet((prev) => {
      if (!prev || !prev.images[index]) return prev;
      return { ...prev, selectedIndex: index };
    });
  }, []);

  const setResultExpanded = useCallback((isExpanded: boolean) => {
    setCurrentResultSet((prev) => (prev && prev.images.length > 1 ? { ...prev, isExpanded } : prev));
  }, []);

  const downloadResultImage = useCallback((image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `visioner-result-${image.resultId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const buildHistoryBatchFromCurrentResultSet = useCallback(
    (resultSet: CurrentResultSet, fallbackPrompt: string, fallbackUserPrompt: string): ResultSetBatch => {
      const batchHistoryItems = generatedImages.filter((item) => item.batchId === resultSet.batchId);
      const firstHistoryItem = batchHistoryItems[0];

      return {
        batchId: resultSet.batchId,
        nodeId: id,
        images: resultSet.images,
        prompt: firstHistoryItem?.prompt || fallbackPrompt,
        userPrompt: firstHistoryItem?.userPrompt || fallbackUserPrompt,
        inputRefs: firstHistoryItem?.inputRefs || [],
        presetIds: firstHistoryItem?.presetIds || selectedPresets,
        styleId: firstHistoryItem?.styleId ?? selectedStyleId,
        lightPreview,
        controller: firstHistoryItem?.controller,
        modelParams: firstHistoryItem?.modelParams || { ...modelParams },
        createdAt: firstHistoryItem?.createdAt || Date.now(),
      };
    },
    [generatedImages, id, lightPreview, modelParams, selectedPresets, selectedStyleId],
  );

  const runGeneration = useCallback(async () => {
    if (!hasGenerationIntent) {
      showToast(t('imageNode.prompt.emptyGenerationHint'));
      return;
    }

    const referenceLimitIssue = getReferenceLimitIssueForGenerate(references);
    if (referenceLimitIssue) {
      showToast(formatReferenceLimitIssue(referenceLimitIssue));
      return;
    }

    const promptWithTextReferences = [textReferencePrompt, promptText]
      .filter((value) => value.trim().length > 0)
      .join('\n\n');
    const { textPrompt, imageReferences, referenceImages, markReferences, promptBlocks, userPrompt, globalStyle, presets } = buildPromptSubmission(promptWithTextReferences, promptContent, selectedPresets, selectedStyle, references, lightPreview);
    const generationModelParams: ModelParams = { ...modelParams, count: '1' };

    let task = createGenerationTask({
      sourceNodeId: id,
      prompt: textPrompt,
      inputRefs: referenceImages.map((ref) => ({
        imageId: ref.imageId,
        imageUrl: ref.imageUrl,
        usageKey: ref.usageKey,
        usageLabel: ref.usageLabel,
        customUsageName: ref.customUsageName,
        localReferenceType: ref.localReferenceType,
        localReferenceLabel: ref.localReferenceLabel,
        localReferencePoint: ref.localReferencePoint,
        promptText: ref.promptText,
      })),
      markRefs: markReferences,
      modelParams: {
        model: generationModelParams.model,
        ratio: generationModelParams.ratio,
        resolution: generationModelParams.resolution,
      },
    });
    setGenerationTask(task);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                generationTask: task,
                isGenerating: true,
                isProcessing: true,
              },
            }
          : n,
      ),
    );

    const safetyResult = await checkGenerationRequestSafety({
      prompt: textPrompt,
      referenceImages: referenceImages.map((ref) => ({
        id: ref.imageId,
        url: ref.imageUrl,
        usage: ref.usageKey,
        label: ref.usageLabel,
      })),
    });
    if (!safetyResult.allowed) {
      showToast(safetyResult.message ?? t('imageNode.errors.invalidContent'));
      const failedTask = {
        ...task,
        status: 'failed' as const,
        errorMessage: safetyResult.message ?? t('imageNode.errors.invalidContent'),
        updatedAt: Date.now(),
      };
      setGenerationTask(failedTask);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  generationTask: failedTask,
                  isGenerating: false,
                  isProcessing: false,
                },
              }
            : n,
        ),
      );
      return;
    }
    const safePrompt =
      safetyResult.level === 'rewrite' && safetyResult.rewrittenPrompt
        ? safetyResult.rewrittenPrompt
        : textPrompt;

    if (safePrompt !== task.prompt) {
      task = { ...task, prompt: safePrompt, updatedAt: Date.now() };
      setGenerationTask(task);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  generationTask: task,
                },
              }
            : n,
        ),
      );
    }

    abortControllerRef.current?.abort();
    const generationAbortController = new AbortController();
    abortControllerRef.current = generationAbortController;

    try {
      const generationRequest = buildImageGenerationRequest({
        nodeId: id,
        prompt: safePrompt,
        userPrompt,
        inputRefs: task.inputRefs,
        markRefs: task.markRefs,
        modelParams: generationModelParams,
        style: globalStyle,
        presets: selectedPresets,
      });
      const count = generationRequest.modelParams.count;
      const results: import('../../types/generation.types').GenerationResult[] = [];

      for (let i = 0; i < count; i++) {
        const result = await simulateGeneration(
          {
            sourceNodeId: generationRequest.nodeId,
            prompt: generationRequest.prompt,
            inputRefs: task.inputRefs,
            markRefs: task.markRefs,
            modelParams: {
              model: generationRequest.modelParams.model,
              ratio: generationRequest.modelParams.aspectRatio,
              resolution: generationRequest.modelParams.resolution,
            },
          },
          {
            onProgress: (progress) => {
              const overall = Math.floor(((i + progress / 100) / count) * 100);
              setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, progress: overall, updatedAt: Date.now() } : prev));
            },
          },
          generationAbortController.signal,
        );
        results.push(result);
      }

      if (results.length > 0) {
        const resultSafety = await checkGenerationResultSafety({
          imageUrl: results[0].imageUrl,
        });
        if (!resultSafety.allowed) {
          showToast(resultSafety.message ?? t('imageNode.errors.safetyCheckFailed'));
          setGenerationTask((prev) =>
            prev && prev.taskId === task.taskId
              ? { ...prev, status: 'failed', errorMessage: resultSafety.message ?? t('generation.safety.checkFailedTitle'), updatedAt: Date.now() }
              : prev,
          );
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                  data: {
                    ...n.data,
                    generationTask: { ...task, status: 'failed', errorMessage: resultSafety.message ?? t('generation.safety.checkFailedTitle'), updatedAt: Date.now() },
                    isGenerating: false,
                    isProcessing: false,
                  },
                }
              : n,
            ),
          );
          return;
        }
      }

      if (currentResultSet && currentResultSet.images.length > 0) {
        addBatch(buildHistoryBatchFromCurrentResultSet(currentResultSet, safePrompt, userPrompt || ''));
      }

      const batchId = task.taskId;
      const generatedImageItems: GeneratedImage[] = results.map((result) => ({
        resultId: result.taskId,
        imageUrl: result.imageUrl,
        width: result.width,
        height: result.height,
        seed: result.seed,
      }));

      const newResultSet: CurrentResultSet = {
        batchId,
        images: generatedImageItems,
        selectedIndex: 0,
        isExpanded: false,
      };

      const newHistoryItems: GenerationHistoryItem[] = results.map((result, index) => ({
        resultId: result.taskId,
        batchId,
        batchIndex: index + 1,
        imageUrl: result.imageUrl,
        prompt: safePrompt,
        userPrompt: userPrompt || '',
        inputRefs: task.inputRefs,
        markRefs: task.markRefs,
        presetIds: selectedPresets,
        styleId: selectedStyleId,
        modelParams: { ...generationModelParams },
        seed: result.seed,
        width: result.width,
        height: result.height,
        createdAt: Date.now(),
      }));

      const nextGeneratedImages = [...generatedImages, ...newHistoryItems];
      addBatch({
        batchId,
        nodeId: id,
        images: generatedImageItems,
        prompt: safePrompt,
        userPrompt: userPrompt || '',
        inputRefs: task.inputRefs,
        presetIds: selectedPresets,
        styleId: selectedStyleId,
        lightPreview,
        modelParams: { ...generationModelParams },
        createdAt: Date.now(),
      });
      setCurrentResultSet(newResultSet);
      setLocalDisplayImage(generatedImageItems[0]?.imageUrl || '');
      setGeneratedImages(nextGeneratedImages);

      const firstImage = new window.Image();
      firstImage.onload = () => {
        setImgSize({ width: firstImage.width, height: firstImage.height });
      };
      firstImage.src = generatedImageItems[0]?.imageUrl || '';

      setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, status: 'success', progress: 100, result: results[0], updatedAt: Date.now() } : prev));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  currentResultSet: newResultSet,
                  image: generatedImageItems[0]?.imageUrl,
                  currentImage: generatedImageItems[0]?.imageUrl,
                  currentResultId: generatedImageItems[0]?.resultId,
                  assetSource: 'generated',
                  isGeneratedResult: true,
                  generationStatus: 'completed',
                  finalPrompt: safePrompt,
                  textPrompt,
                  imageReferences,
                  referenceImages,
                  markReferences,
                  references,
                  promptBlocks,
                  userPrompt,
                  globalStyle,
                  presets,
                  promptContent,
                  generatedImages: nextGeneratedImages,
                  generationTask: { ...task, status: 'success', progress: 100, result: results[0], updatedAt: Date.now() },
                  isGenerating: false,
                  isProcessing: false,
                  width: results[0]?.width,
                  height: results[0]?.height,
                },
              }
            : n,
        ),
      );
    } catch (err) {
      const errorCode = getMockGenerationErrorCode(err);
      const errorMessage = errorCode
        ? t(MOCK_GENERATION_ERROR_KEYS[errorCode])
        : t('imageNode.errors.generationFailed');
      setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, status: 'failed', errorMessage, updatedAt: Date.now() } : prev));
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  generationTask: { ...task, status: 'failed', errorMessage, updatedAt: Date.now() },
                  isGenerating: false,
                  isProcessing: false,
                },
              }
            : n,
        ),
      );
    }
  }, [hasGenerationIntent, promptText, promptContent, selectedPresets, selectedStyle, selectedStyleId, references, textReferencePrompt, generatedImages, id, setNodes, modelParams, showToast, lightPreview, currentResultSet, addBatch, buildHistoryBatchFromCurrentResultSet, t]);

  const handleGenerate = useCallback(() => {
    if (!canGenerate) {
      showToast(t('imageNode.prompt.emptyGenerationHint'));
      return;
    }
    void runGeneration();
  }, [canGenerate, runGeneration, showToast, t]);

  const handlePromptChange = (value: string) => {
    if (!imageNodeViewModel.canEditPrompt) return;
    setPromptText(value);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n)));
  };

  const handlePromptContentChange = (content: PromptContent[]) => {
    if (!imageNodeViewModel.canEditPrompt) return;
    setPromptContent(content);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, promptContent: content } } : n)));
  };

  const handleLightPreviewChange = (data: LightPreviewData | null) => {
    if (!imageNodeViewModel.canEditLighting) return;
    setLightPreview(data);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, lightPreview: data } } : n)));
  };

  const handleControllersChange = (nextControllers: ImageNodeControllers) => {
    if (imageNodeViewModel.isProcessing) return;
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, controllers: nextControllers } } : n)));
  };

  const handleModelParamsChange = (params: ModelParams) => {
    if (!imageNodeViewModel.canEditModel) return;
    setModelParams(params);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, modelParams: params } } : n)));
  };

  const handleRemoveReference = (sourceNodeId: string) => {
    if (!imageNodeViewModel.canDeleteReference) return;
    const removeReferenceEdge = data.onRemoveReferenceEdge as ((targetNodeId: string, sourceNodeId: string) => void) | undefined;
    if (removeReferenceEdge) {
      removeReferenceEdge(id, sourceNodeId);
    } else {
      setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === id)));
    }
    // 同步清理 promptContent 中对应的图片引用块（规则11）
    const nextPromptContent = promptContent.filter((item) => item.type !== 'image_reference' || item.sourceNodeId !== sourceNodeId);
    if (nextPromptContent.length !== promptContent.length) {
      handlePromptContentChange(nextPromptContent);
    }
  };

  const handleUseReference = (reference: ReferenceInfo) => {
    void reference;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageNodeViewModel.canUpload) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(file);
    const onRegisterObjectUrl = data.onRegisterObjectUrl as ((url: string) => void) | undefined;
    if (onRegisterObjectUrl) onRegisterObjectUrl(url);

    const imgEl = new window.Image();
    imgEl.onload = () => {
      setImgSize({ width: imgEl.width, height: imgEl.height });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  image: url,
                  inputImage: url,
                  currentImage: url,
                  currentResultId: null,
                  currentResultSet: null,
                  generatedImages: [],
                  generationTask: null,
                  assetSource: 'upload',
                  isGeneratedResult: false,
                  label: name,
                  width: imgEl.width,
                  height: imgEl.height,
                  ...getRoleData(null),
                },
              }
            : n,
        ),
      );
    };
    imgEl.src = url;

    setNodeName(name);
    setLocalDisplayImage(url);
  };

  const handleReplaceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageNodeViewModel.canUseToolbarActions) return;
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = URL.createObjectURL(file);
    const onRegisterObjectUrl = data.onRegisterObjectUrl as ((nextUrl: string) => void) | undefined;
    onRegisterObjectUrl?.(url);

    const imgEl = new window.Image();
    imgEl.onload = () => {
      setImgSize({ width: imgEl.width, height: imgEl.height });
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  image: url,
                  inputImage: url,
                  currentImage: url,
                  currentResultId: null,
                  currentResultSet: null,
                  generatedImages: [],
                  generationTask: null,
                  isGenerating: false,
                  isProcessing: false,
                  assetSource: 'upload',
                  isGeneratedResult: false,
                  width: imgEl.width,
                  height: imgEl.height,
                },
              }
            : n,
        ),
      );
    };
    imgEl.src = url;
    setLocalDisplayImage(url);
  };

  const handleNameSave = () => {
    const newName = nameInputRef.current?.value.trim() || nodeName;
    setNodeName(newName);
    setEditingName(false);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newName } } : n)));
  };

  const handleRoleChange = (nextRole: ImageRole | null, nextCustomRoleLabel?: string, nextLocalRefType?: LocalReferenceType, nextLocalRefLabel?: string) => {
    if (!imageNodeViewModel.canEditReferenceUsage) return;
    if (nextRole && UNIQUE_USAGES.includes(nextRole)) {
      const affectedTargetIds = allEdges.filter((edge) => edge.source === id).map((edge) => edge.target);
      const conflictingTarget = affectedTargetIds.find((targetId) =>
        allEdges.some((edge) => {
          if (edge.target !== targetId || edge.source === id) return false;
          const sourceNode = allNodes.find((node) => node.id === edge.source);
          const effectiveRole = (edge.data?.role as ImageRole | null | undefined) ?? ((sourceNode?.data?.role as ImageRole | null | undefined) ?? null);
          return effectiveRole === nextRole;
        }),
      );
      if (conflictingTarget) {
        showToast(t('reference.downstreamConflict', {
          role: getImageRoleLabel(
            nextRole,
            nextCustomRoleLabel,
            nextLocalRefType,
            nextLocalRefLabel,
            translate,
          ),
        }));
        return;
      }
    }
    const safeRole = nextRole ?? 'undefined_usage';
    const roleData = getRoleData(safeRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...roleData,
                localReferencePoint: undefined,
              },
            }
          : n,
      ),
    );
    setEdges((edges) => edges.map((edge) => edge.source === id
      ? { ...edge, data: { ...edge.data, ...roleData, localReferencePoint: undefined } }
      : edge));
  };

  const exitPointPickMode = useCallback(() => {
    markRequestIdRef.current += 1;
    pendingMarkSourceActivationRef.current = null;
    setIsPointPickMode(false);
    setPointPickLoading(false);
    setPointPickError(false);
    setPointPickFeedbackPoint(null);
    setActiveMarkMenuId(null);
  }, []);

  useEffect(() => {
    if (!isPointPickMode) return;
    if (activeImageMarkSourceNodeId === id) {
      pendingMarkSourceActivationRef.current = null;
      return;
    }
    if (isCanvasMarkSelectionMode && pendingMarkSourceActivationRef.current === id) return;
    exitPointPickMode();
  }, [activeImageMarkSourceNodeId, exitPointPickMode, id, isCanvasMarkSelectionMode, isPointPickMode]);

  const enterOwnMarkMode = useCallback((targetNodeId: string) => {
    if (!imageNodeViewModel.canCreateMarks || !displayImage) return;
    setMarkTargetNodeId(targetNodeId);
    setCurrentResultSet((current) => current ? { ...current, isExpanded: false } : current);
    setIsCropMode(false);
    setIsPointPickMode(true);
    setPointPickError(false);
    setActiveMarkMenuId(null);
  }, [displayImage, imageNodeViewModel.canCreateMarks]);

  useEffect(() => {
    if (markSourceImageRef.current === displayImage) return;
    markSourceImageRef.current = displayImage;
    const raf = requestAnimationFrame(() => {
      exitPointPickMode();
      const validMarks = imageMarks.filter((mark) => Boolean(displayImage) && mark.sourceImageUrl === displayImage);
      const validMarkIds = new Set(validMarks.map((mark) => mark.id));
      setImageMarks(validMarks);
      setNodes((nodes) => nodes.map((node) => {
        const nodePromptContent = Array.isArray(node.data.promptContent) ? node.data.promptContent as PromptContent[] : [];
        const nextPromptContent = nodePromptContent.filter((block) => block.type !== 'image_mark_reference' || !(
          block.sourceNodeId === id && !validMarkIds.has(block.markId)
        ));
        if (node.id === id) {
          return { ...node, data: { ...node.data, imageMarks: validMarks, promptContent: nextPromptContent } };
        }
        return nextPromptContent.length === nodePromptContent.length
          ? node
          : { ...node, data: { ...node.data, promptContent: nextPromptContent } };
      }));
    });
    return () => cancelAnimationFrame(raf);
  }, [displayImage, exitPointPickMode, id, imageMarks, setNodes]);

  const startMarkMode = useCallback(() => {
    if (activeImageMarkTargetNodeId === id) {
      exitPointPickMode();
      const onExitSelection = data.onExitCanvasImageMarkSelection as (() => void) | undefined;
      onExitSelection?.();
      return;
    }
    if (!canStartMarking) return;
    const onStartSelection = data.onStartCanvasImageMarkSelection as ((targetNodeId: string) => void) | undefined;
    onStartSelection?.(id);
  }, [activeImageMarkTargetNodeId, canStartMarking, data.onExitCanvasImageMarkSelection, data.onStartCanvasImageMarkSelection, exitPointPickMode, id]);

  const resolveCoverGeometry = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const rect = img.getBoundingClientRect();
    const scale = Math.max(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const renderedWidth = img.naturalWidth * scale;
    const renderedHeight = img.naturalHeight * scale;
    return {
      rect,
      renderedWidth,
      renderedHeight,
      offsetX: (rect.width - renderedWidth) / 2,
      offsetY: (rect.height - renderedHeight) / 2,
    };
  }, []);

  const startIdentifyMark = useCallback(async (e: React.PointerEvent<HTMLElement> | PointerEvent, explicitTargetNodeId?: string) => {
    if (e.button !== 0) return;
    const eventTarget = e.target as HTMLElement;
    if (eventTarget.closest('button, input, select, textarea')) return;
    const consumePointerEvent = () => {
      e.preventDefault();
      e.stopPropagation();
      if (e instanceof PointerEvent) e.stopImmediatePropagation();
    };
    const requestedTargetNodeId = explicitTargetNodeId ?? activeImageMarkTargetNodeId;
    const isSelectingSource = Boolean(requestedTargetNodeId) && !isPointPickMode;
    let identifyTargetNodeId = explicitTargetNodeId ?? markTargetNodeId;
    if (isSelectingSource) {
      if (!isCanvasMarkSelectable || !requestedTargetNodeId) return;
      consumePointerEvent();
      pendingMarkSourceActivationRef.current = id;
      const onSelectSource = data.onSelectCanvasImageMarkSource as ((sourceNodeId: string) => void) | undefined;
      onSelectSource?.(id);
      enterOwnMarkMode(requestedTargetNodeId);
      identifyTargetNodeId = requestedTargetNodeId;
    }
    if ((!isPointPickMode && !isSelectingSource) || !imageNodeViewModel.canCreateMarks || !displayImage || !imgRef.current) return;
    consumePointerEvent();

    const geometry = resolveCoverGeometry();
    if (!geometry) return;
    const { rect, renderedWidth, renderedHeight, offsetX, offsetY } = geometry;

    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    ) {
      return;
    }

    const normalizedX = Math.max(0, Math.min(1, (e.clientX - rect.left - offsetX) / renderedWidth));
    const normalizedY = Math.max(0, Math.min(1, (e.clientY - rect.top - offsetY) / renderedHeight));

    markRequestIdRef.current += 1;
    const requestId = markRequestIdRef.current;
    setPointPickLoading(true);
    setPointPickError(false);
    setPointPickFeedbackPoint({ normalizedX, normalizedY });

    try {
      const result = await identifyImageElement({
        imageUrl: displayImage,
        point: { x: normalizedX, y: normalizedY },
      });
      if (
        requestId !== markRequestIdRef.current ||
        !imageNodeViewModel.canCreateMarks ||
        getCurrentImage(data) !== displayImage
      ) return;

      const mark: ImageMark = {
        id: `mark-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sourceNodeId: id,
        sourceImageUrl: displayImage,
        usageKey: role ?? 'undefined_usage',
        usageLabel: getImageRoleLabel(
          role,
          customRoleLabel,
          localReferenceType,
          localReferenceLabel,
          translate,
        ),
        markType: 'box',
        point: {
          normalizedX,
          normalizedY,
          imageX: normalizedX * imgRef.current.naturalWidth,
          imageY: normalizedY * imgRef.current.naturalHeight,
        },
        box: result.box,
        candidates: result.candidates,
        selectedCandidateId: result.selectedCandidateId,
        createdAt: Date.now(),
      };
      const markBlock = createImageMarkReferenceBlock(mark);
      const nextMarks = [...imageMarks, mark];
      setImageMarks(nextMarks);
      setNodes((nodes) => nodes.map((node) => {
        const isSource = node.id === id;
        const isTarget = node.id === identifyTargetNodeId;
        if (!isSource && !isTarget) return node;
        const nodePromptContent = Array.isArray(node.data.promptContent) ? node.data.promptContent as PromptContent[] : [];
        const nextPromptContent = isTarget && !nodePromptContent.some((block) => block.type === 'image_mark_reference' && block.markId === mark.id)
          ? [...nodePromptContent, markBlock]
          : nodePromptContent;
        return {
          ...node,
          data: {
            ...node.data,
            ...(isSource ? { imageMarks: nextMarks } : {}),
            ...(isTarget ? { promptContent: nextPromptContent } : {}),
          },
        };
      }));
      setVisibleSessionMarks((current) => {
        const ids = current.sessionId === activeImageMarkSessionId ? new Set(current.ids) : new Set<string>();
        ids.add(mark.id);
        return { sessionId: activeImageMarkSessionId ?? null, ids };
      });
      setActiveMarkMenuId(null);
    } catch {
      if (requestId !== markRequestIdRef.current) return;
      setPointPickError(true);
    } finally {
      if (requestId === markRequestIdRef.current) setPointPickLoading(false);
    }
  }, [activeImageMarkSessionId, activeImageMarkTargetNodeId, customRoleLabel, data, displayImage, enterOwnMarkMode, id, imageMarks, imageNodeViewModel.canCreateMarks, isCanvasMarkSelectable, isPointPickMode, localReferenceLabel, localReferenceType, markTargetNodeId, resolveCoverGeometry, role, setNodes, translate]);

  useEffect(() => {
    const element = imgRef.current;
    if (!element || !displayImage) return;
    return registerImageMarkCaptureEntry({
      nodeId: id,
      imageUrl: displayImage,
      element,
      canMark: () => imageNodeViewModel.canCreateMarks,
      startIdentify: (event, targetNodeId) => {
        void startIdentifyMark(event, targetNodeId);
      },
    });
  }, [currentResultSet?.isExpanded, displayImage, id, imageNodeViewModel.canCreateMarks, startIdentifyMark]);

  const updateMarkCandidate = useCallback((markId: string, candidateId: string) => {
    if (imageNodeViewModel.isProcessing) return;
    let updatedMark: ImageMark | undefined;
    for (const node of allNodes) {
      const marks = (node.data.imageMarks as ImageMark[] | undefined) ?? [];
      const mark = marks.find((item) => item.id === markId);
      if (mark) {
        updatedMark = { ...mark, selectedCandidateId: candidateId };
        break;
      }
    }
    const candidate = updatedMark?.candidates.find((item) => item.id === candidateId);
    if (!updatedMark || !candidate) return;
    setNodes((nodes) => nodes.map((node) => {
      const marks = (node.data.imageMarks as ImageMark[] | undefined) ?? [];
      const hasMark = marks.some((mark) => mark.id === markId);
      const nextMarks = hasMark
        ? marks.map((mark) => mark.id === markId ? updatedMark as ImageMark : mark)
        : marks;
      const nodePromptContent = Array.isArray(node.data.promptContent) ? node.data.promptContent as PromptContent[] : [];
      const hasMarkBlock = nodePromptContent.some((block) => block.type === 'image_mark_reference' && block.markId === markId);
      const nextPromptContent = nodePromptContent.map((block) => block.type === 'image_mark_reference' && block.markId === markId
        ? {
            ...block,
            candidates: updatedMark.candidates,
            selectedCandidateId: candidate.id,
            markLabel: candidate.label,
            promptText: block.promptTextEdited ? block.promptText : candidate.promptText,
          }
        : block);
      return !hasMark && !hasMarkBlock
        ? node
        : { ...node, data: { ...node.data, imageMarks: nextMarks, promptContent: nextPromptContent } };
    }));
    setActiveMarkMenuId(null);
  }, [allNodes, imageNodeViewModel.isProcessing, setNodes]);

  const deleteImageMark = useCallback((markId: string) => {
    if (!imageNodeViewModel.canEditMarks) return;
    const nextMarks = imageMarks.filter((mark) => mark.id !== markId);
    setImageMarks(nextMarks);
    setNodes((nodes) => nodes.map((node) => {
      const nodePromptContent = Array.isArray(node.data.promptContent) ? node.data.promptContent as PromptContent[] : [];
      const nextPromptContent = nodePromptContent.filter((block) => block.type !== 'image_mark_reference' || block.markId !== markId);
      if (node.id === id) {
        return { ...node, data: { ...node.data, imageMarks: nextMarks, promptContent: nextPromptContent } };
      }
      return nextPromptContent.length === nodePromptContent.length
        ? node
        : { ...node, data: { ...node.data, promptContent: nextPromptContent } };
    }));
    setActiveMarkMenuId(null);
  }, [id, imageMarks, imageNodeViewModel.canEditMarks, setNodes]);

  // Esc to exit point-pick mode
  useEffect(() => {
    if (!isPointPickMode && activeImageMarkTargetNodeId !== id) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (isPointPickMode) exitPointPickMode();
        const onExitSelection = data.onExitCanvasImageMarkSelection as (() => void) | undefined;
        onExitSelection?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeImageMarkTargetNodeId, data.onExitCanvasImageMarkSelection, exitPointPickMode, id, isPointPickMode]);

  const pointPickFeedbackGeometry = pointPickFeedbackPoint ? resolveCoverGeometry() : null;
  const pointPickFeedbackWidth = pointPickError ? 176 : 104;
  const pointPickFeedbackHeight = pointPickError ? 48 : 30;
  const pointPickFeedbackPosition = pointPickFeedbackGeometry && pointPickFeedbackPoint
    ? (() => {
        const { rect, offsetX, offsetY, renderedWidth, renderedHeight } = pointPickFeedbackGeometry;
        const anchorX = rect.left + offsetX + pointPickFeedbackPoint.normalizedX * renderedWidth;
        const anchorY = rect.top + offsetY + pointPickFeedbackPoint.normalizedY * renderedHeight;
        const left = Math.max(rect.left + 6, Math.min(rect.right - pointPickFeedbackWidth - 6, anchorX + 10));
        const preferredTop = anchorY + 10;
        const top = preferredTop + pointPickFeedbackHeight <= rect.bottom - 6
          ? preferredTop
          : Math.max(rect.top + 6, anchorY - pointPickFeedbackHeight - 10);
        return { left, top };
      })()
    : null;
  const canvasMarkSelectionPortal = activeImageMarkTargetNodeId === id
    ? createPortal(
        <div
          className="fixed left-1/2 top-[54px] z-[4100] flex w-auto -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] shadow-[0_10px_26px_rgba(0,0,0,0.3)]"
          style={{
            background: 'rgba(37,37,38,0.9)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.86)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <ScanSearch className="h-4 w-4 flex-shrink-0 text-teal-300/85" />
          <span className="font-medium text-white/75">{t('imageMark.canvasModeHint')}</span>
          <button
            type="button"
            className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/55 transition-colors hover:bg-white/[0.10] hover:text-white/80"
            onClick={(event) => {
              event.stopPropagation();
              const onExitSelection = data.onExitCanvasImageMarkSelection as (() => void) | undefined;
              onExitSelection?.();
            }}
          >
            ESC · {t('imageMark.exit')}
          </button>
        </div>,
        document.body,
      )
    : null;
  const pointPickResultPortal = isPointPickMode && pointPickFeedbackPosition && (pointPickLoading || pointPickError)
    ? createPortal(
        <div
          className="fixed z-[4100] nodrag nowheel rounded-md px-2 py-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.38)]"
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
          style={{
            left: pointPickFeedbackPosition.left,
            top: pointPickFeedbackPosition.top,
            width: pointPickFeedbackWidth,
            minHeight: pointPickFeedbackHeight,
            background: 'rgba(10,10,15,0.9)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {pointPickLoading && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
              {t('imageMark.identifying')}
            </div>
          )}

          {pointPickError && (
            <div className="text-[11px] leading-4 text-white/65">
              {t('imageMark.recognizeFailed')}
            </div>
          )}

        </div>,
        document.body,
      )
    : null;

  // Auto-open light panel when node was created for relighting
  const autoOpenLightPreview = data.autoOpenLightPreview as boolean | undefined;
  useEffect(() => {
    if (autoOpenLightPreview) {
      setPendingLightPanelOpen(true);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, autoOpenLightPreview: undefined } }
            : n,
        ),
      );
    }
  }, [autoOpenLightPreview, id, setNodes]);

  const stopTitleInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const sourceWidth = imgSize?.width || getNodeWidth(data) || 1;
  const sourceHeight = imgSize?.height || getNodeHeight(data) || 1;
  const markImageCursor = isCanvasMarkSelectionMode
    ? isCanvasMarkSelectable ? 'crosshair' : 'not-allowed'
    : isPointPickMode ? 'crosshair' : 'default';
  const renderImageMarkOverlays = () => {
    if (!isCanvasMarkSelectionMode) return null;
    const geometry = resolveCoverGeometry();
    if (!geometry) return null;
    const visibleMarkIds = visibleSessionMarks.sessionId === activeImageMarkSessionId
      ? visibleSessionMarks.ids
      : new Set<string>();
    const currentMarks = imageMarks.filter((mark) => mark.sourceImageUrl === displayImage && visibleMarkIds.has(mark.id));

    return currentMarks.map((mark) => {
      const selectedCandidate = mark.candidates.find((candidate) => candidate.id === mark.selectedCandidateId)
        ?? mark.candidates[0];
      const normalizedX = Math.max(0, Math.min(1, mark.box.normalizedX));
      const normalizedY = Math.max(0, Math.min(1, mark.box.normalizedY));
      const normalizedWidth = Math.max(0, Math.min(1 - normalizedX, mark.box.normalizedWidth));
      const normalizedHeight = Math.max(0, Math.min(1 - normalizedY, mark.box.normalizedHeight));
      const rawLeft = geometry.offsetX + normalizedX * geometry.renderedWidth;
      const rawTop = geometry.offsetY + normalizedY * geometry.renderedHeight;
      const rawRight = rawLeft + normalizedWidth * geometry.renderedWidth;
      const rawBottom = rawTop + normalizedHeight * geometry.renderedHeight;
      const left = Math.max(0, Math.min(geometry.rect.width, rawLeft));
      const top = Math.max(0, Math.min(geometry.rect.height, rawTop));
      const right = Math.max(left, Math.min(geometry.rect.width, rawRight));
      const bottom = Math.max(top, Math.min(geometry.rect.height, rawBottom));
      const width = Math.max(2, right - left);
      const height = Math.max(2, bottom - top);
      const alignRight = left + width / 2 > geometry.rect.width / 2;
      const labelTop = top < 28
        ? Math.min(geometry.rect.height - 27, top + 3)
        : Math.max(2, top - 27);

      return (
        <div key={mark.id} className="contents">
          <div
            className="pointer-events-none absolute z-30 border border-white/90"
            style={{ left, top, width, height, boxShadow: '0 0 0 1px rgba(0,0,0,0.38)' }}
          />
          <button
            ref={(element) => {
              if (element) markLabelButtonRefs.current.set(mark.id, element);
              else markLabelButtonRefs.current.delete(mark.id);
            }}
            type="button"
            className="absolute z-40 flex items-center gap-1 overflow-hidden whitespace-nowrap rounded-md border border-white/20 bg-black/75 px-2 py-1 text-[11px] text-white/90 backdrop-blur-sm"
            style={{
              top: labelTop,
              left: alignRight ? undefined : Math.max(3, left),
              right: alignRight ? Math.max(3, geometry.rect.width - right) : undefined,
              maxWidth: Math.max(80, Math.min(190, geometry.rect.width - 6)),
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setActiveMarkMenuId((current) => current === mark.id ? null : mark.id);
            }}
          >
            <span className="truncate" title={selectedCandidate?.label}>{selectedCandidate?.label || t('imageMark.unknown')}</span>
            <ChevronDown className="h-3 w-3 flex-shrink-0" />
          </button>
        </div>
      );
    });
  };
  const activeImageMark = imageMarks.find((mark) => mark.id === activeMarkMenuId && mark.sourceImageUrl === displayImage);

  useEffect(() => {
    const anchorElement = activeMarkMenuId ? markLabelButtonRefs.current.get(activeMarkMenuId) : null;
    if (!activeImageMark || !anchorElement || !imageNodeViewModel.canEditMarks) {
      const frame = requestAnimationFrame(() => setActiveMarkButtonRect(null));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const updateAnchorRect = () => {
      const nextRect = anchorElement.getBoundingClientRect();
      setActiveMarkButtonRect((currentRect) => {
        if (
          currentRect
          && Math.abs(currentRect.left - nextRect.left) < 0.25
          && Math.abs(currentRect.top - nextRect.top) < 0.25
          && Math.abs(currentRect.width - nextRect.width) < 0.25
          && Math.abs(currentRect.height - nextRect.height) < 0.25
        ) return currentRect;
        return nextRect;
      });
      frame = requestAnimationFrame(updateAnchorRect);
    };
    updateAnchorRect();
    return () => cancelAnimationFrame(frame);
  }, [activeImageMark, activeMarkMenuId, imageNodeViewModel.canEditMarks]);

  const activeMarkMenuMargin = 12;
  const activeMarkMenuWidth = Math.min(210, Math.max(0, window.innerWidth - activeMarkMenuMargin * 2));
  const activeMarkMenuGap = 8;
  const activeMarkMenuEstimatedHeight = Math.min(320, (activeImageMark?.candidates.length ?? 0) * 30 + 44);
  const activeMarkSpaceBelow = activeMarkButtonRect ? window.innerHeight - activeMarkButtonRect.bottom - activeMarkMenuMargin - activeMarkMenuGap : 0;
  const activeMarkSpaceAbove = activeMarkButtonRect ? activeMarkButtonRect.top - activeMarkMenuMargin - activeMarkMenuGap : 0;
  const activeMarkOpenBelow = activeMarkSpaceBelow >= activeMarkMenuEstimatedHeight || activeMarkSpaceBelow >= activeMarkSpaceAbove;
  const activeMarkMenuLeft = activeMarkButtonRect
    ? Math.min(Math.max(activeMarkMenuMargin, activeMarkButtonRect.left), window.innerWidth - activeMarkMenuWidth - activeMarkMenuMargin)
    : activeMarkMenuMargin;
  const activeMarkMenuTop = activeMarkButtonRect
    ? (activeMarkOpenBelow ? activeMarkButtonRect.bottom + activeMarkMenuGap : activeMarkButtonRect.top - activeMarkMenuGap)
    : activeMarkMenuMargin;
  const activeMarkMenuMaxHeight = Math.max(0, activeMarkOpenBelow ? activeMarkSpaceBelow : activeMarkSpaceAbove);
  const activeMarkCandidatePortal = activeImageMark && activeMarkButtonRect && imageNodeViewModel.canEditMarks
    ? createPortal(
        <div
          className="nodrag nopan nowheel fixed z-[4200] overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-[#252526] p-1 shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          style={{
            left: activeMarkMenuLeft,
            top: activeMarkMenuTop,
            width: activeMarkMenuWidth,
            transform: activeMarkOpenBelow ? undefined : 'translateY(-100%)',
            maxHeight: activeMarkMenuMaxHeight,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {activeImageMark.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-white/78 hover:bg-white/[0.08]"
              onClick={() => updateMarkCandidate(activeImageMark.id, candidate.id)}
            >
              <span className="truncate" title={candidate.label}>{candidate.label}</span>
              {candidate.id === activeImageMark.selectedCandidateId && <Check className="h-3 w-3 text-white/75" />}
            </button>
          ))}
          <div className="my-1 border-t border-white/[0.08]" />
          <button
            type="button"
            className="w-full rounded-md px-2 py-1.5 text-left text-[12px] text-red-300/75 hover:bg-red-500/10"
            onClick={() => deleteImageMark(activeImageMark.id)}
          >
            {t('imageMark.deleteMark')}
          </button>
        </div>,
        document.body,
      )
    : null;
  const { cardWidth, cardHeight, imageDisplayScale } = resolveImageNodeSize({
    hasImage: Boolean(displayImage),
    sourceWidth,
    sourceHeight,
  });
  const resultGridGap = 10;
  const imageAspectRatio = sourceHeight / sourceWidth;
  const displayCardWidth = isMultiResultExpanded ? Math.round(cardWidth * 1.92) : cardWidth;
  const displayCardHeight = displayImage
    ? isMultiResultExpanded
      ? Math.round(
          currentResultSet?.images.length === 2
            ? ((displayCardWidth - resultGridGap) / 2) * imageAspectRatio
            : ((displayCardWidth - resultGridGap) / 2) * imageAspectRatio * 2 + resultGridGap,
        )
      : Math.round(sourceHeight * imageDisplayScale)
    : cardHeight;
  const resultMainCardWidth = isMultiResultExpanded ? (displayCardWidth - resultGridGap) / 2 : displayCardWidth;
  const resultMainCardHeight = isMultiResultExpanded
    ? currentResultSet?.images.length === 2
      ? displayCardHeight
      : (displayCardHeight - resultGridGap) / 2
    : displayCardHeight;
  const resultHandleRight = isMultiResultExpanded ? displayCardWidth - resultMainCardWidth : 0;
  const resultHandleTop = isMultiResultExpanded ? resultMainCardHeight / 2 : '50%';
  const expandedResultSlots = useMemo(() => {
    if (!currentResultSet?.images.length) return [];
    const slots = currentResultSet.images.map((image, originalIndex) => ({ image, originalIndex }));
    const primaryIndex = currentResultSet.selectedIndex;
    if (primaryIndex > 0 && slots[primaryIndex]) {
      const previousPrimary = slots[0];
      slots[0] = slots[primaryIndex];
      slots[primaryIndex] = previousPrimary;
    }
    return slots;
  }, [currentResultSet]);
  const showTitleMeta = zoom >= 0.35;
  const roleOption = getImageRoleOption(role, customRoleLabel, translate);
  const RoleIconForTitle = roleOption?.Icon;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);
  const isOnlySelected = selected && selectedNodeCount === 1;

  const handlePreview = useCallback(() => {
    if (!imageNodeViewModel.canPreview) return;
    const resolved = resolveNodeImage(data);
    if (!resolved) return;
    setLocalDisplayImage(resolved.imageUrl);
    setImgSize({ width: resolved.width, height: resolved.height });
    setIsFullscreenPreviewOpen(true);
  }, [data, imageNodeViewModel.canPreview]);

  const handleDisplayImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setImageLoadFailed(false);
    setImgSize((prev) => (
      prev?.width === naturalWidth && prev?.height === naturalHeight
        ? prev
        : { width: naturalWidth, height: naturalHeight }
    ));
  }, []);

  const cancelCrop = useCallback(() => {
    setIsCropMode(false);
  }, []);

  useEffect(() => {
    if (!isCropMode) return;
    let handled = false;
    const handleEscape = (event: KeyboardEvent) => {
      const isEscape = event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape';
      if (!isEscape || handled) return;
      handled = true;
      event.preventDefault();
      event.stopPropagation();
      cancelCrop();
    };
    const resetHandled = () => {
      handled = false;
    };
    document.addEventListener('keydown', handleEscape, true);
    window.addEventListener('keyup', handleEscape, true);
    window.addEventListener('blur', resetHandled);
    return () => {
      document.removeEventListener('keydown', handleEscape, true);
      window.removeEventListener('keyup', handleEscape, true);
      window.removeEventListener('blur', resetHandled);
    };
  }, [cancelCrop, isCropMode]);

  const enterCropMode = useCallback(() => {
    const image = imgRef.current;
    if (!imageNodeViewModel.canUseToolbarActions || !image || !image.complete || !image.naturalWidth || imageLoadFailed) {
      showToast(t('imageNode.cropLoadFailed'));
      return;
    }
    setRoleMenuOpen(false);
    setEditingName(false);
    setIsCropMode(true);
  }, [imageLoadFailed, imageNodeViewModel.canUseToolbarActions, showToast, t]);

  const confirmCrop = useCallback(async (crop: NormalizedCropRect) => {
    const image = imgRef.current;
    if (!image || !image.complete || !image.naturalWidth) {
      showToast(t('imageNode.cropLoadFailed'));
      return;
    }
    try {
      const imageRect = image.getBoundingClientRect();
      const result = await cropCoverImage(image, imageRect.width, imageRect.height, crop);
      const onRegisterObjectUrl = data.onRegisterObjectUrl as ((url: string) => void) | undefined;
      onRegisterObjectUrl?.(result.url);
      const aspectRatio = result.width / result.height;
      const resolution = `${result.width}×${result.height}`;
      setImgSize({ width: result.width, height: result.height });
      setLocalDisplayImage(result.url);
      setCurrentResultSet((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          images: previous.images.map((item, index) => index === previous.selectedIndex
            ? { ...item, imageUrl: result.url, width: result.width, height: result.height }
            : item),
        };
      });
      setNodes((nodes) => nodes.map((node) => {
        if (node.id !== id) return node;
        const resultSet = node.data.currentResultSet as CurrentResultSet | null | undefined;
        const nextResultSet = resultSet ? {
          ...resultSet,
          images: resultSet.images.map((item, index) => index === resultSet.selectedIndex
            ? { ...item, imageUrl: result.url, width: result.width, height: result.height }
            : item),
        } : resultSet;
        return {
          ...node,
          selected: true,
          data: {
            ...node.data,
            image: result.url,
            currentImage: result.url,
            currentResultSet: nextResultSet,
            width: result.width,
            height: result.height,
            aspectRatio,
            resolution,
            fileSize: result.blobSize,
          },
        };
      }));
      setIsCropMode(false);
    } catch {
      showToast(t('imageNode.cropLoadFailed'));
    }
  }, [data.onRegisterObjectUrl, id, setNodes, showToast, t]);

  const handleDownload = useCallback(() => {
    if (!imageNodeViewModel.canDownload) return;
    const resolved = resolveNodeImage(data);
    if (!resolved) return;
    const link = document.createElement('a');
    link.href = resolved.imageUrl;
    link.download = `image-node-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, id, imageNodeViewModel.canDownload]);

  const handleDuplicateNode = useCallback(() => {
    if (!imageNodeViewModel.canUseToolbarActions) return;
    const onDuplicateNode = data.onDuplicateNode as ((nodeId: string) => void) | undefined;
    onDuplicateNode?.(id);
  }, [data, id, imageNodeViewModel.canUseToolbarActions]);

  const handleDeleteNode = useCallback(() => {
    if (!imageNodeViewModel.canUseToolbarActions) return;
    const onDeleteNode = data.onDeleteNode as ((nodeId: string) => void) | undefined;
    onDeleteNode?.(id);
  }, [data, id, imageNodeViewModel.canUseToolbarActions]);

  const imageToolbarActions = useMemo(() => [
    {
      icon: Maximize2,
      label: t('toolbar.fullscreen'),
      action: handlePreview,
      disabled: !imageNodeViewModel.canUseToolbarActions,
    },
    {
      icon: Copy,
      label: t('common.createCopy'),
      action: handleDuplicateNode,
      disabled: !imageNodeViewModel.canUseToolbarActions,
    },
    {
      icon: Download,
      label: t('common.actions.download'),
      action: handleDownload,
      disabled: !imageNodeViewModel.canUseToolbarActions,
    },
    {
      icon: Upload,
      label: t('common.replace'),
      disabled: !imageNodeViewModel.canUseToolbarActions,
      menuItems: [
        {
          label: t('common.uploadFromDevice'),
          action: () => replaceFileRef.current?.click(),
        },
        {
          label: t('common.selectFromCanvas'),
          action: () => undefined,
          disabled: true,
        },
      ],
    },
    {
      icon: Crop,
      label: t('common.crop'),
      action: enterCropMode,
      disabled: !imageNodeViewModel.canUseToolbarActions || imageLoadFailed || !imgSize,
    },
    {
      icon: Trash2,
      label: t('common.actions.delete'),
      action: handleDeleteNode,
      disabled: !imageNodeViewModel.canUseToolbarActions,
      danger: true,
    },
  ], [enterCropMode, handleDeleteNode, handleDownload, handleDuplicateNode, handlePreview, imageLoadFailed, imageNodeViewModel.canUseToolbarActions, imgSize, t]);

  const emptyImageToolbarActions = useMemo(() => [
    {
      icon: Upload,
      label: t('common.uploadFromDevice'),
      action: () => fileRef.current?.click(),
      disabled: !imageNodeViewModel.canUpload,
    },
  ], [imageNodeViewModel.canUpload, t]);

  // Global modifier + G shortcut for generation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (imageNodeViewModel.showControlPanel && isOnlySelected && canGenerate) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [imageNodeViewModel.showControlPanel, isOnlySelected, canGenerate, handleGenerate]);

  return (
    <div
      className={`relative group/image ${isCropMode ? 'nodrag nowheel' : ''}`}
      onContextMenuCapture={isCropMode ? (event) => { event.preventDefault(); event.stopPropagation(); } : undefined}
      style={{ zIndex: selected ? 100 : 1, width: displayCardWidth }}
    >
      {canvasMarkSelectionPortal}
      {pointPickResultPortal}
      {activeMarkCandidatePortal}
      {/* Toolbar — empty nodes expose upload only; image nodes keep their existing actions. */}
      {(imageNodeViewModel.showTopToolbar || imageNodeViewModel.canUpload) && isOnlySelected && !isMultiResultExpanded && !isCropMode && (
        <div className="absolute z-[80] flex justify-center" style={{ top: -80 / zoom, left: displayCardWidth / 2, transform: `translateX(-50%) scale(${inverseScale})`, transformOrigin: 'top center' }}>
          <ImageToolbar
            actions={imageNodeViewModel.canUpload ? emptyImageToolbarActions : imageToolbarActions}
          />
        </div>
      )}

      {/* Title label — fixed screen size, width matches card screen width */}
      <div
        className="absolute z-20 overflow-hidden nodrag"
        onPointerDownCapture={stopTitleInteraction}
        onMouseDownCapture={stopTitleInteraction}
        onClick={stopTitleInteraction}
        style={{
          top: -20 / zoom,
          left: 0,
          width: displayCardWidth * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
          display: isMultiResultExpanded || isCropMode ? 'none' : undefined,
        }}
      >
        <div className="flex items-center justify-between overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
            {imageNodeViewModel.showReferenceUsageControl && !isCropMode && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleMenuOpenChange(true);
                }}
                className={`flex-shrink-0 select-none transition-all ${canEditRole ? 'hover:brightness-125' : ''}`}
                style={{
                  color: getImageRoleColor(role, localReferenceType),
                  fontSize: 11,
                  cursor: canEditRole ? 'pointer' : 'default',
                  opacity: canEditRole ? 1 : 0.5,
                }}
                title={t('imageNode.tooltips.setReferenceRole')}
              >
                {RoleIconForTitle && (
                  <RoleIconForTitle className="inline-block" style={{ width: 11, height: 11, marginRight: 3, verticalAlign: '-0.1em' }} />
                )}
                {getImageRoleLabel(
                  role,
                  customRoleLabel,
                  localReferenceType,
                  localReferenceLabel,
                  translate,
                ) || t('imageNode.undefinedUsage')}
              </span>
            )}
            {editingName ? (
              <input
                ref={nameInputRef}
                defaultValue={nodeName}
                autoFocus
                onBlur={handleNameSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleNameSave();
                }}
                onPointerDown={stopTitleInteraction}
                onMouseDown={stopTitleInteraction}
                onClick={stopTitleInteraction}
                onDoubleClick={stopTitleInteraction}
                className="bg-transparent outline-none truncate nodrag nowheel select-text"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, minWidth: 0, flex: 1, borderBottom: '1px solid rgba(255,255,255,0.2)' }}
              />
            ) : (
              <span
                onClick={() => { if (!isCropMode) setEditingName(true); }}
                className="min-w-0 cursor-pointer truncate transition-colors hover:text-white nodrag"
                style={{ fontSize: 11 }}
              >
                {nodeName}
              </span>
            )}
          </div>
          {imageNodeViewModel.hasImage && showTitleMeta && (
            <span className="flex-shrink-0 ml-2" style={{ fontSize: 11 }}>
              {imgSize ? `${imgSize.width}×${imgSize.height}` : `${getNodeWidth(data) || 1024}×${getNodeHeight(data) || 1024}`}
            </span>
          )}
        </div>
      </div>

      {/* Image card wrapper — relative for handles/upload positioning */}
      <div className="relative" style={{ width: displayCardWidth }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <input ref={replaceFileRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceFileChange} />

        {imageNodeViewModel.showReferenceUsageControl && !isCropMode && (isOnlySelected || roleMenuOpen) && (
          <ImageRoleTag
            role={role}
            customRoleLabel={customRoleLabel}
            localReferenceType={localReferenceType}
            localReferenceLabel={localReferenceLabel}
            onChange={handleRoleChange}
            open={roleMenuOpen && canEditRole}
            onOpenChange={handleRoleMenuOpenChange}
            disabled={!canEditRole}
          />
        )}

        {/* Main card — aspect ratio adapts to uploaded image */}
        <div
          className={`node-preview-card w-full flex items-center justify-center transition-colors relative overflow-hidden ${isCropMode ? 'rounded-none' : 'rounded-[24px]'}`}
          style={{
            width: displayCardWidth,
            height: displayCardHeight,
            background: isMultiResultExpanded ? '#101014' : CANVAS_NODE_CARD_BACKGROUND,
            border: `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid ${selected ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : CANVAS_NODE_CARD_BORDER_COLOR}`,
            borderRadius: isCropMode ? 0 : CANVAS_NODE_CARD_RADIUS,
            boxSizing: 'border-box',
          }}
        >
          {displayImage && currentResultSet && isMultiResultSet ? (
            currentResultSet.isExpanded ? (
              <div className="relative h-full w-full">
                <div
                  className="grid h-full w-full"
                  style={{
                    gap: resultGridGap,
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gridTemplateRows: currentResultSet.images.length === 2 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                  }}
                >
                  {expandedResultSlots.map(({ image: img, originalIndex }, slotIndex) => {
                    const isPrimary = slotIndex === 0;
                    return (
                      <div
                        key={img.resultId}
                        className="group/result relative min-h-0 min-w-0 overflow-hidden"
                        style={{
                          background: '#101014',
                        }}
                      >
                        <img src={img.imageUrl} alt="" className="block h-full w-full object-cover" draggable={false} />
                        {isPrimary && (
                          <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(0,212,255,0.82)', color: '#061216' }}>
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        )}
                        <div className="absolute right-2 top-2 flex gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              downloadResultImage(img);
                            }}
                            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors hover:bg-white/20"
                            style={{ background: 'rgba(22,12,9,0.62)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
                            title={t('common.actions.download')}
                          >
                            <Download className="h-3.5 w-3.5" />
                            {t('common.actions.download')}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isPrimary) {
                                setResultExpanded(false);
                                return;
                              }
                              selectResultImage(originalIndex);
                            }}
                            className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors hover:bg-white/20"
                            style={{
                              background: isPrimary ? 'rgba(0,212,255,0.72)' : 'rgba(22,12,9,0.62)',
                              color: isPrimary ? '#061216' : 'rgba(255,255,255,0.9)',
                              border: isPrimary ? '1px solid rgba(191,244,255,0.38)' : '1px solid rgba(255,255,255,0.14)',
                              backdropFilter: 'blur(8px)',
                              WebkitBackdropFilter: 'blur(8px)',
                            }}
                            title={isPrimary ? t('common.actions.collapse') : t('imageNode.result.setAsMainImage')}
                          >
                            {isPrimary ? <Minimize2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {isPrimary ? t('common.actions.collapse') : t('imageNode.result.setAsMainImage')}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="relative block h-full w-full text-left">
                {currentResultSet.images
                  .filter((_, imageIndex) => imageIndex !== currentResultSet.selectedIndex)
                  .slice(0, Math.min(3, currentResultSet.images.length - 1))
                  .map((img, idx) => (
                    <div
                      key={img.resultId}
                      className="absolute overflow-hidden rounded-[18px]"
                      style={{
                        inset: 0,
                        transform: `translate(${8 + idx * 8}px, ${3 + idx * 4}px) scale(${0.97 - idx * 0.035})`,
                        transformOrigin: 'right center',
                        zIndex: 3 - idx,
                        opacity: 1,
                        background: '#17171d',
                        filter: `brightness(${0.62 - idx * 0.12})`,
                      }}
                    >
                      <img src={img.imageUrl} alt="" className="block h-full w-full object-cover" draggable={false} />
                    </div>
                  ))}
                <div
                  className="absolute inset-0 z-10 overflow-hidden"
                  style={{
                    background: '#101014',
                  }}
                >
                  <img ref={imgRef} src={displayImage} alt="" className="block h-full w-full object-cover" draggable={false} onLoad={handleDisplayImageLoad} style={{ cursor: markImageCursor }} />
                </div>
                <button
                  type="button"
                  className="absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[15px] font-semibold transition-colors hover:bg-black/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResultExpanded(true);
                  }}
                  style={{
                    background: 'rgba(15,12,10,0.68)',
                    color: 'rgba(255,255,255,0.92)',
                    border: '1px solid rgba(255,255,255,0.14)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                  }}
                >
                  <Maximize2 className="h-4 w-4" />
                  {t('modelParams.count.option', { count: currentResultSet.images.length })}
                </button>
              </div>
            )
          ) : displayImage ? (
            <div className="relative w-full h-full">
              <img
                ref={imgRef}
                src={displayImage}
                alt=""
                className="block w-full h-full object-cover"
                draggable={false}
                onLoad={handleDisplayImageLoad}
                onError={() => setImageLoadFailed(true)}
                style={{ cursor: markImageCursor }}
              />
              {renderImageMarkOverlays()}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <Image className="h-12 w-12 text-[rgba(172,176,188,0.42)]" strokeWidth={1.55} />
            </div>
          )}
        </div>

        {isCropMode && displayImage && (
          <ImageCropOverlay
            originalRatio={sourceWidth / sourceHeight}
            zoom={zoom}
            onCancel={cancelCrop}
            onConfirm={confirmCrop}
          />
        )}

        {/* Left visual handle — Input */}
        {shouldShowInputHandle && !isCropMode && (
          <div
            className="image-node-handle input-port"
            data-port-type="input"
            data-data-type="image"
            data-handle-id="left-target"
            data-handle-type="target"
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.stopPropagation();
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
              const onStart = data.onStartLineDraw as ((
                nodeId: string,
                x: number,
                y: number,
                sourceHandleId: string,
                sourceHandleType: 'source' | 'target',
              ) => void) | undefined;
              if (!onStart) return;
              const rect = e.currentTarget.getBoundingClientRect();
              onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2, 'left-target', 'target');
            }}
            style={{
              position: 'absolute',
              left: 0,
              top: resultHandleTop,
              transform: 'translate(-50%, -50%)',
              width: 28,
              height: 28,
              background: 'rgba(20,20,26,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <Plus style={{ width: 14, height: 14, color: 'white' }} />
          </div>
        )}

        {/* Right visual handle — Output */}
        {!isCropMode && <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="image"
          data-handle-id="right-source"
          data-handle-type="source"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            const onStart = data.onStartLineDraw as ((
              nodeId: string,
              x: number,
              y: number,
              sourceHandleId: string,
              sourceHandleType: 'source' | 'target',
            ) => void) | undefined;
            if (!onStart) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2, 'right-source', 'source');
          }}
          style={{
            position: 'absolute',
            right: resultHandleRight,
            top: resultHandleTop,
            transform: 'translate(50%, -50%)',
            width: 28,
            height: 28,
            background: 'rgba(20,20,26,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
        </div>}

        {/* React Flow handles — positioned to overlap visual handles exactly */}
        {shouldShowInputHandle && !isCropMode && (
          <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: resultHandleTop, pointerEvents: 'none' }} />
        )}
        {!isCropMode && <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: resultHandleRight, top: resultHandleTop, pointerEvents: 'none' }} />}
        {!isCropMode && <Handle type="target" position={Position.Right} id="right-target" style={{ opacity: 0, width: 28, height: 28, right: resultHandleRight, top: resultHandleTop, pointerEvents: 'none' }} />}
      </div>

      {/* Control panel — below the preview area */}
      {isOnlySelected && !isMultiResultExpanded && imageNodeViewModel.showControlPanel && !isCropMode && (
        <>
          <div
            className="absolute z-30"
            style={{
              top: displayCardHeight + 12 / zoom,
              left: displayCardWidth / 2,
              width: IMAGE_NODE_CONTROL_WIDTH,
              transform: `translateX(-50%) scale(${inverseScale * CANVAS_NODE_CONTROL_SCALE})`,
              transformOrigin: 'top center',
            }}
          >
            <ImageNodeControlPanel
              promptText={promptText}
              onPromptChange={handlePromptChange}
              promptContent={promptContent}
              onPromptContentChange={handlePromptContentChange}
              lightPreview={lightPreview}
              onLightPreviewChange={handleLightPreviewChange}
              controllers={controllers}
              onControllersChange={handleControllersChange}
              workflowSource={workflowSource}
              onFocusWorkflowSource={(sourceNodeId) => {
                const onFocusNode = data.onFocusNode as ((targetNodeId: string) => void) | undefined;
                onFocusNode?.(sourceNodeId);
              }}
              modelParams={modelParams}
              onModelParamsChange={handleModelParamsChange}
              onGenerate={handleGenerate}
              canGenerate={canGenerate}
              canEditPrompt={imageNodeViewModel.canEditPrompt}
              canEditPromptReferences={imageNodeViewModel.canEditPromptReferences}
              canEditLighting={imageNodeViewModel.canEditLighting}
              canEditModel={imageNodeViewModel.canEditModel}
              canDeleteReference={imageNodeViewModel.canDeleteReference}
              canCreateMarks={canStartMarking}
              isMarkModeActive={activeImageMarkTargetNodeId === id}
              isProcessing={imageNodeViewModel.isProcessing}
              isGenerating={isGenerating}
              generationTask={generationTask}
              textReferences={textReferences}
              currentImageSize={imgSize ?? { width: getNodeWidth(data), height: getNodeHeight(data) }}
              onFocusTextReference={(nodeId) => {
                const onFocusNode = data.onFocusNode as ((targetNodeId: string) => void) | undefined;
                onFocusNode?.(nodeId);
              }}
              references={references}
              onRemoveReference={handleRemoveReference}
              onUseReference={handleUseReference}
              onStartMarkMode={startMarkMode}
              onUpdateMarkCandidate={updateMarkCandidate}
              showToast={showToast}
              autoOpenLightPanel={pendingLightPanelOpen}
              onAcknowledgeAutoOpen={() => setPendingLightPanelOpen(false)}
            />
          </div>

          <div style={{ height: (IMAGE_NODE_CONTROL_HEIGHT * CANVAS_NODE_CONTROL_SCALE + 22) / zoom }} />
        </>
      )}

      {/* Fullscreen preview modal — rendered via portal to escape node bounds */}
      {isFullscreenPreviewOpen && displayImage && createPortal(
        <ImagePreviewModal
          imageUrl={displayImage}
          onClose={() => setIsFullscreenPreviewOpen(false)}
        />,
        document.body,
      )}
    </div>
  );
}
