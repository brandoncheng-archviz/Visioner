import { useState, useRef, useEffect, useCallback, useMemo, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Image, Maximize2, Minimize2, Plus, Upload } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import type { ImageRole, PromptContent, ReferenceInfo, LocalReferenceType } from '../../types/imageNode.types';
import type { MarkItem, ModelParams } from '../../types/canvas.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import type { GenerationTask, GenerationHistoryItem } from '../../types/generation.types';
import type { CurrentResultSet, ResultSetBatch, GeneratedImage } from '../../types/history.types';
import {
  normalizeGeneratedImages,
  getCurrentImage,
  getNodeGenerationTask,
  getNodeWidth,
  getNodeHeight,
} from '../../types/imageNodeData.types';
import { useHistory } from '../../contexts/HistoryContext';
import { createGenerationTask, simulateGeneration } from '../../utils/mockGenerationTask';
import { checkGenerationRequestSafety, checkGenerationResultSafety } from '../../utils/contentSafety';
import {
  CANVAS_NODE_CONTROL_SCALE,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  DEFAULT_MODEL_PARAMS,
} from '../../constants/canvasConstants';
import { UNIQUE_USAGES, getImageRoleOption, getImageRoleLabel, getImageRoleColor, getLocalReferenceTypeFromRole, getLocalReferenceLabel, getReferenceUsageInfo, normalizeLocalReferenceType, localReferenceOptions } from '../../constants/imageUsages';
import { getStylePresetById, getPresetById } from '../../constants/presets';
import { buildPromptSubmission } from '../../utils/promptUtils';
import { getRoleData } from '../../utils/referenceUtils';
import { resolveNodeImage } from '../../utils/resolveNodeImage';
import { resolveImageNodeSize } from '../../utils/imageNodeSizing';
import { formatReferenceLimitIssue, getReferenceLimitIssueForGenerate } from '../../utils/referenceLimits';
import { identifyImageElement } from '../../services/identifyElement';
import { ImageToolbar } from '../../components/ImageToolbar';
import { ImagePreviewModal } from '../../components/ImagePreviewModal';
import { ImageRoleTag } from '../../components/ImageRoleTag';
import { ImageNodeControlPanel } from './ImageNodeControlPanel';

export function ImageNode({ data, selected, id }: NodeProps) {
  const { t, i18n } = useTranslation();
  const { show: showToast } = useToast();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const hasInputConnection = useStore((state) => state.edges.some((e) => e.target === id));

  const currentImage = getCurrentImage(data);
  const rawRole = (data.role as ImageRole | null | undefined) ?? null;
  const role = rawRole;
  const customRoleLabel = data.customRoleLabel as string | undefined;
  const localReferenceType = normalizeLocalReferenceType((data.localReferenceType as LocalReferenceType | undefined)) ?? getLocalReferenceTypeFromRole(rawRole);
  const localReferenceLabel = (data.localReferenceLabel as string | undefined) ?? getLocalReferenceLabel(rawRole, localReferenceType, data.localReferenceLabel as string | undefined, customRoleLabel);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [nodeName, setNodeName] = useState((data.label as string) || t('canvas.nodeLabels.image', { defaultValue: '图片' }));
  const [previewImage, setPreviewImage] = useState(currentImage);
  const [editingName, setEditingName] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  /* ─── Point-pick mode for local reference ─── */
  const [isPointPickMode, setIsPointPickMode] = useState(false);
  const [manualInputSignal, setManualInputSignal] = useState(0);
  const [pendingLightPanelOpen, setPendingLightPanelOpen] = useState(false);
  const [pointPickLoading, setPointPickLoading] = useState(false);
  const [pointPickResult, setPointPickResult] = useState<{ label: string; normalizedType?: string; confidence?: number } | null>(null);
  const [pointPickError, setPointPickError] = useState(false);
  const [pointPickPosition, setPointPickPosition] = useState<{ x: number; y: number } | null>(null);
  const [pointPickImageRect, setPointPickImageRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [isEditingPointPickLabel, setIsEditingPointPickLabel] = useState(false);
  const [pointPickEditLabel, setPointPickEditLabel] = useState('');
  const pointPickEditRef = useRef<HTMLInputElement>(null);
  const { setNodes, setEdges } = useReactFlow();

  /* ─── Extended node state ─── */
  const [promptText, setPromptText] = useState((data.prompt as string) || '');
  const [promptContent, setPromptContent] = useState<PromptContent[]>((data.promptContent as PromptContent[]) || []);
  const [marks] = useState<MarkItem[]>((data.marks as MarkItem[]) || []);
  const [lightPreview, setLightPreview] = useState<LightPreviewData | null>((data.lightPreview as LightPreviewData | null | undefined) ?? null);
  const [selectedPresets, setSelectedPresets] = useState<string[]>((data.selectedPresets as string[]) || []);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>((data.selectedStyleId as string | null | undefined) || null);
  const [modelParams, setModelParams] = useState<ModelParams>((data.modelParams as ModelParams) || DEFAULT_MODEL_PARAMS);
  const [generatedImages, setGeneratedImages] = useState<GenerationHistoryItem[]>(normalizeGeneratedImages(data.generatedImages));
  const [generationTask, setGenerationTask] = useState<GenerationTask | null>(getNodeGenerationTask(data));

  /* ─── Current Result Set ─── */
  const { addBatch } = useHistory();
  const parseCount = useCallback((count: string): number => {
    if (count === '1张') return 1;
    if (count === '2张') return 2;
    if (count === '4张') return 4;
    return 1;
  }, []);

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
    : previewImage || currentImage;
  const resultImageCount = currentResultSet?.images.length ?? 0;
  const isMultiResultSet = resultImageCount > 1;
  const isResultResource = Boolean(currentResultSet && resultImageCount > 0 && generationTask?.status !== 'running');
  const isHistoryAsset = Boolean(data.isHistoryAsset);
  const isMultiResultExpanded = Boolean(isMultiResultSet && currentResultSet?.isExpanded);

  // Cleanup: abort running generation on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
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
    setPreviewImage((prev) => (prev === nextCurrent ? prev : nextCurrent));
  }, [data.currentImage, data.image, data.inputImage]);

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
    const nextName = (data.label as string | undefined) || t('canvas.nodeLabels.image', { defaultValue: '图片' });
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
        prev.images.every((image, index) => image.resultId === next.images[index]?.resultId)
      ) {
        return prev;
      }
      return next;
    });
  }, [data.currentResultSet]);

  // Sync currentResultSet and selected result image back to node.data.
  useEffect(() => {
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
  const referenceOrder = (data.referenceOrder as string[]) || [];
  const references: ReferenceInfo[] = useMemo(() => {
    const inputEdges = allEdges.filter((e) => e.target === id);
    const rawReferences = inputEdges.flatMap((edge) => {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (sourceNode?.type === 'sunSky') return [];
      const edgeRole = edge.data?.role as ImageRole | null | undefined;
      const edgeCustomRoleLabel = edge.data?.customRoleLabel as string | undefined;
      const edgeLocalRefType = edge.data?.localReferenceType as LocalReferenceType | undefined;
      const edgeLocalRefLabel = edge.data?.localReferenceLabel as string | undefined;
      const sourceRole = (sourceNode?.data?.role as ImageRole | null) || null;
      const sourceCustomRoleLabel = sourceNode?.data?.customRoleLabel as string | undefined;
      const sourceLocalRefType = sourceNode?.data?.localReferenceType as LocalReferenceType | undefined;
      const sourceLocalRefLabel = sourceNode?.data?.localReferenceLabel as string | undefined;
      const referenceRole = edgeRole ?? sourceRole;
      const referenceCustomRoleLabel = edgeCustomRoleLabel ?? sourceCustomRoleLabel;
      const usageInfo = getReferenceUsageInfo(
        referenceRole,
        referenceCustomRoleLabel,
        edgeLocalRefType ?? sourceLocalRefType,
        edgeLocalRefLabel ?? sourceLocalRefLabel,
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
        imageUrl,
        width: getNodeWidth(sourceNode?.data),
        height: getNodeHeight(sourceNode?.data),
      }];
    });
    return rawReferences
      .sort((a, b) => {
        const aIndex = referenceOrder.indexOf(a.nodeId);
        const bIndex = referenceOrder.indexOf(b.nodeId);
        if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
        if (aIndex >= 0) return -1;
        if (bIndex >= 0) return 1;
        return 0;
      })
      .map((ref, idx) => ({ ...ref, index: idx + 1 }));
  }, [allEdges, allNodes, id, referenceOrder, i18n.language]);
  const referencesSignature = JSON.stringify(
    references.map((reference) => ({
      nodeId: reference.nodeId,
      role: reference.role,
      roleLabel: reference.roleLabel,
      customRoleLabel: reference.customRoleLabel,
      localReferenceType: reference.localReferenceType,
      localReferenceLabel: reference.localReferenceLabel,
      imageUrl: reference.imageUrl,
      width: reference.width,
      height: reference.height,
    })),
  );
  const savedReferencesSignature = data.referencesSignature as string | undefined;

  useEffect(() => {
    if (savedReferencesSignature === referencesSignature) return;
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
            })),
            referencesSignature,
          },
        };
      }),
    );
  }, [id, references, referencesSignature, savedReferencesSignature, setNodes]);

  const selectedStyle = getStylePresetById(selectedStyleId);
  const isGenerating = generationTask?.status === 'running';
  const canGenerate = !isGenerating && (references.length > 0 || role !== null || marks.length > 0 || selectedStyle !== null || promptText.trim().length > 0 || promptContent.length > 0);

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
        modelParams: firstHistoryItem?.modelParams || { ...modelParams },
        createdAt: firstHistoryItem?.createdAt || Date.now(),
      };
    },
    [generatedImages, id, lightPreview, modelParams, selectedPresets, selectedStyleId],
  );

  const runGeneration = useCallback(async () => {
    const referenceLimitIssue = getReferenceLimitIssueForGenerate(references);
    if (referenceLimitIssue) {
      showToast(formatReferenceLimitIssue(referenceLimitIssue));
      return;
    }

    const { textPrompt, imageReferences, referenceImages, promptBlocks, userPrompt, globalStyle, presets } = buildPromptSubmission(promptText, promptContent, selectedPresets, selectedStyle, references, lightPreview);

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
      showToast(safetyResult.message ?? '当前内容不适合生成，请修改后再试。');
      return;
    }
    const safePrompt =
      safetyResult.level === 'rewrite' && safetyResult.rewrittenPrompt
        ? safetyResult.rewrittenPrompt
        : textPrompt;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const task = createGenerationTask({
      sourceNodeId: id,
      prompt: safePrompt,
      inputRefs: referenceImages.map((ref) => ({
        imageId: ref.imageId,
        imageUrl: ref.imageUrl,
        usageKey: ref.usageKey,
        usageLabel: ref.usageLabel,
        customUsageName: ref.customUsageName,
        promptText: ref.promptText,
      })),
      modelParams: {
        model: modelParams.model,
        ratio: modelParams.ratio,
        resolution: modelParams.resolution,
      },
    });
    setGenerationTask(task);

    try {
      const count = parseCount(modelParams.count);
      const results: import('../../types/generation.types').GenerationResult[] = [];

      for (let i = 0; i < count; i++) {
        const result = await simulateGeneration(
          {
            sourceNodeId: id,
            prompt: safePrompt,
            inputRefs: task.inputRefs,
            modelParams: {
              model: modelParams.model,
              ratio: modelParams.ratio,
              resolution: modelParams.resolution,
            },
          },
          {
            onProgress: (progress) => {
              const overall = Math.floor(((i + progress / 100) / count) * 100);
              setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, progress: overall, updatedAt: Date.now() } : prev));
            },
          },
          controller.signal,
        );
        results.push(result);
      }

      if (results.length > 0) {
        const resultSafety = await checkGenerationResultSafety({
          imageUrl: results[0].imageUrl,
        });
        if (!resultSafety.allowed) {
          showToast(resultSafety.message ?? '生成结果未通过安全检查，请调整提示词后重试。');
          setGenerationTask((prev) =>
            prev && prev.taskId === task.taskId
              ? { ...prev, status: 'failed', errorMessage: resultSafety.message ?? '安全检查未通过', updatedAt: Date.now() }
              : prev,
          );
          setNodes((nds) =>
            nds.map((n) =>
              n.id === id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      generationTask: { ...task, status: 'failed', errorMessage: resultSafety.message ?? '安全检查未通过', updatedAt: Date.now() },
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
        presetIds: selectedPresets,
        styleId: selectedStyleId,
        modelParams: { ...modelParams },
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
        modelParams: { ...modelParams },
        createdAt: Date.now(),
      });
      setCurrentResultSet(newResultSet);
      setPreviewImage(generatedImageItems[0]?.imageUrl || '');
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
                  finalPrompt: safePrompt,
                  textPrompt,
                  imageReferences,
                  referenceImages,
                  references,
                  promptBlocks,
                  userPrompt,
                  globalStyle,
                  presets,
                  promptContent,
                  generatedImages: nextGeneratedImages,
                  generationTask: { ...task, status: 'success', progress: 100, result: results[0], updatedAt: Date.now() },
                  width: results[0]?.width,
                  height: results[0]?.height,
                },
              }
            : n,
        ),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '生成失败';
      setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, status: 'failed', errorMessage, updatedAt: Date.now() } : prev));
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  generationTask: { ...task, status: 'failed', errorMessage, updatedAt: Date.now() },
                },
              }
            : n,
        ),
      );
    }
  }, [promptText, promptContent, selectedPresets, selectedStyle, selectedStyleId, references, generatedImages, id, setNodes, modelParams, showToast, lightPreview, currentResultSet, addBatch, parseCount, buildHistoryBatchFromCurrentResultSet]);

  const handleGenerate = useCallback(() => runGeneration(), [runGeneration]);

  const handlePromptChange = (value: string) => {
    setPromptText(value);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n)));
  };

  const handlePromptContentChange = (content: PromptContent[]) => {
    setPromptContent(content);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, promptContent: content } } : n)));
  };

  const handleLightPreviewChange = (data: LightPreviewData | null) => {
    setLightPreview(data);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, lightPreview: data } } : n)));
  };

  const handlePresetsChange = (presets: string[]) => {
    const presetOnly = presets.filter((presetId) => getPresetById(presetId)?.category !== 'style');
    setSelectedPresets(presetOnly);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, selectedPresets: presetOnly } } : n)));
  };

  const handleStyleChange = (styleId: string | null) => {
    setSelectedStyleId(styleId);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, selectedStyleId: styleId } } : n)));
  };

  const handleModelParamsChange = (params: ModelParams) => {
    setModelParams(params);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, modelParams: params } } : n)));
  };

  const handleRemoveReference = (sourceNodeId: string) => {
    const removeReferenceEdge = data.onRemoveReferenceEdge as ((targetNodeId: string, sourceNodeId: string) => void) | undefined;
    if (removeReferenceEdge) {
      removeReferenceEdge(id, sourceNodeId);
    } else {
      setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === id)));
    }
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const referenceOrder = ((n.data.referenceOrder as string[]) || []).filter((nodeId) => nodeId !== sourceNodeId);
        return { ...n, data: { ...n.data, referenceOrder } };
      }),
    );
    // 同步清理 promptContent 中对应的图片引用块（规则11）
    const nextPromptContent = promptContent.filter((item) => item.type !== 'image_reference' || item.sourceNodeId !== sourceNodeId);
    if (nextPromptContent.length !== promptContent.length) {
      handlePromptContentChange(nextPromptContent);
    }
  };

  const handleReorderReferences = (newOrder: string[]) => {
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, referenceOrder: newOrder } } : n)));
  };

  const handleUseReference = () => {
    // Shared entry point for top thumbnails and the @ reference menu.
  };

  const handleAssignReferenceRole = (sourceNodeId: string, nextRole: ImageRole, nextCustomRoleLabel?: string, nextLocalRefType?: LocalReferenceType, nextLocalRefLabel?: string) => {
    const roleOption = getImageRoleOption(nextRole, nextCustomRoleLabel);
    const roleData = getRoleData(nextRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel);
    const assignReferenceEdgeRole = data.onAssignReferenceEdgeRole as ((targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string, localReferenceType?: LocalReferenceType, localReferenceLabel?: string) => void) | undefined;
    if (assignReferenceEdgeRole) {
      assignReferenceEdgeRole(id, sourceNodeId, nextRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel);
    } else {
      setEdges((eds) =>
        eds.map((edge) =>
          edge.source === sourceNodeId && edge.target === id
            ? { ...edge, data: { ...edge.data, ...roleData } }
            : edge,
        ),
      );
      setNodes((nds) => nds.map((node) => (node.id === sourceNodeId ? { ...node, data: { ...node.data, ...roleData } } : node)));
    }

    const existingReference = references.find((reference) => reference.nodeId === sourceNodeId);
    if (!existingReference) return null;
    return {
      ...existingReference,
      role: nextRole,
      customRoleLabel: nextCustomRoleLabel,
      localReferenceType: nextLocalRefType,
      localReferenceLabel: nextLocalRefLabel,
      roleLabel: getImageRoleLabel(nextRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel) || roleOption?.label || existingReference.roleLabel,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setPreviewImage(url);
  };

  const handleNameSave = () => {
    const newName = nameInputRef.current?.value.trim() || nodeName;
    setNodeName(newName);
    setEditingName(false);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: newName } } : n)));
  };

  const handleRoleChange = (nextRole: ImageRole | null, nextCustomRoleLabel?: string, nextLocalRefType?: LocalReferenceType, nextLocalRefLabel?: string) => {
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
        showToast(t('reference.downstreamConflict', { role: getImageRoleLabel(nextRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel) }));
        return;
      }
    }
    const safeRole = nextRole ?? 'undefined_usage';
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...getRoleData(safeRole, nextCustomRoleLabel, nextLocalRefType, nextLocalRefLabel),
                localReferencePoint: undefined,
              },
            }
          : n,
      ),
    );
  };

  const exitPointPickMode = useCallback(() => {
    setIsPointPickMode(false);
    setPointPickLoading(false);
    setPointPickResult(null);
    setPointPickError(false);
    setPointPickPosition(null);
    setPointPickImageRect(null);
    setIsEditingPointPickLabel(false);
    setPointPickEditLabel('');
  }, []);

  const resolveDisplayedImageRect = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;

    const rect = img.getBoundingClientRect();
    const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
    const width = img.naturalWidth * scale;
    const height = img.naturalHeight * scale;
    const left = rect.left + (rect.width - width) / 2;
    const top = rect.top + (rect.height - height) / 2;

    return { left, top, width, height };
  }, []);

  useEffect(() => {
    if (!isPointPickMode || !displayImage) return;

    let frameId = 0;
    const updateRect = () => {
      const nextRect = resolveDisplayedImageRect();
      setPointPickImageRect((prev) => {
        if (
          prev &&
          nextRect &&
          Math.abs(prev.left - nextRect.left) < 0.5 &&
          Math.abs(prev.top - nextRect.top) < 0.5 &&
          Math.abs(prev.width - nextRect.width) < 0.5 &&
          Math.abs(prev.height - nextRect.height) < 0.5
        ) {
          return prev;
        }
        return nextRect;
      });
      frameId = requestAnimationFrame(updateRect);
    };

    updateRect();
    return () => cancelAnimationFrame(frameId);
  }, [displayImage, isPointPickMode, resolveDisplayedImageRect]);

  const handleImageClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isPointPickMode || !displayImage || !imgRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const displayedRect = resolveDisplayedImageRect();
    if (!displayedRect) return;

    if (
      e.clientX < displayedRect.left ||
      e.clientX > displayedRect.left + displayedRect.width ||
      e.clientY < displayedRect.top ||
      e.clientY > displayedRect.top + displayedRect.height
    ) {
      return;
    }

    const normalizedX = (e.clientX - displayedRect.left) / displayedRect.width;
    const normalizedY = (e.clientY - displayedRect.top) / displayedRect.height;

    setPointPickPosition({ x: normalizedX, y: normalizedY });
    setPointPickLoading(true);
    setPointPickError(false);
    setPointPickResult(null);
    setIsEditingPointPickLabel(false);

    try {
      const result = await identifyImageElement({
        imageUrl: displayImage,
        point: { x: normalizedX, y: normalizedY },
      });
      setPointPickResult(result);
    } catch {
      setPointPickError(true);
    } finally {
      setPointPickLoading(false);
    }
  };

  const applyPointPickResult = () => {
    if (!pointPickResult) return;
    const isFixedType = pointPickResult.normalizedType && pointPickResult.normalizedType !== 'custom';
    const fixedItem = localReferenceOptions.find((opt) => opt.value === pointPickResult.normalizedType);

    let nextType: LocalReferenceType;
    let nextLabel: string;

    if (isFixedType && fixedItem) {
      nextType = fixedItem.value as LocalReferenceType;
      nextLabel = fixedItem.label;
    } else {
      nextType = 'custom';
      nextLabel = pointPickResult.label;
    }

    const safeRole: ImageRole = 'local_reference';
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...getRoleData(safeRole, undefined, nextType, nextLabel),
                localReferencePoint: pointPickPosition,
              },
            }
          : n,
      ),
    );
    exitPointPickMode();
  };

  const applyEditedPointPickLabel = () => {
    if (!pointPickEditLabel.trim() || !pointPickPosition) return;
    const safeRole: ImageRole = 'local_reference';
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                ...getRoleData(safeRole, undefined, 'custom', pointPickEditLabel.trim()),
                localReferencePoint: pointPickPosition,
              },
            }
          : n,
      ),
    );
    exitPointPickMode();
  };

  const openPointPickManualInput = () => {
    exitPointPickMode();
    setRoleMenuOpen(true);
    setManualInputSignal((s) => s + 1);
  };

  // Esc to exit point-pick mode
  useEffect(() => {
    if (!isPointPickMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitPointPickMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isPointPickMode, exitPointPickMode]);

  const stopPointPickOverlayEvent = useCallback((event: SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const pointPickCardWidth = imgRef.current?.getBoundingClientRect().width ?? pointPickImageRect?.width ?? 280;
  const pointPickResultPanelWidth = Math.min(320, Math.max(180, pointPickCardWidth));
  const pointPickResultPanelLeft = pointPickImageRect
    ? Math.min(
        Math.max(16, pointPickImageRect.left + pointPickImageRect.width / 2 - pointPickResultPanelWidth / 2),
        Math.max(16, window.innerWidth - pointPickResultPanelWidth - 16),
      )
    : 16;
  const pointPickResultPanelTop = pointPickImageRect
    ? pointPickImageRect.top + pointPickImageRect.height + 14
    : 16;
  const pointPickModeBarWidth = Math.min(420, window.innerWidth - 32);
  const pointPickModePortal = isPointPickMode && pointPickImageRect
    ? createPortal(
        <>
          {[
            { left: 0, top: 0, width: '100vw', height: pointPickImageRect.top },
            { left: 0, top: pointPickImageRect.top + pointPickImageRect.height, width: '100vw', height: `calc(100vh - ${pointPickImageRect.top + pointPickImageRect.height}px)` },
            { left: 0, top: pointPickImageRect.top, width: pointPickImageRect.left, height: pointPickImageRect.height },
            { left: pointPickImageRect.left + pointPickImageRect.width, top: pointPickImageRect.top, width: `calc(100vw - ${pointPickImageRect.left + pointPickImageRect.width}px)`, height: pointPickImageRect.height },
          ].map((rect, index) => (
            <div
              key={index}
              className="fixed z-[80] cursor-default"
              style={{
                left: rect.left,
                top: rect.top,
                width: rect.width,
                height: rect.height,
                background: 'rgba(0,0,0,0.74)',
                backdropFilter: 'brightness(0.42)',
                WebkitBackdropFilter: 'brightness(0.42)',
              }}
              onClick={stopPointPickOverlayEvent}
              onDoubleClick={stopPointPickOverlayEvent}
              onPointerDown={stopPointPickOverlayEvent}
              onPointerMove={stopPointPickOverlayEvent}
              onMouseDown={stopPointPickOverlayEvent}
              onWheel={stopPointPickOverlayEvent}
              onContextMenu={stopPointPickOverlayEvent}
            />
          ))}
          <div
            className="fixed z-[120] flex items-center gap-3 rounded-full px-4 py-2 text-[12px] shadow-[0_12px_34px_rgba(0,0,0,0.45)]"
            style={{
              left: Math.max(16, window.innerWidth / 2 - pointPickModeBarWidth / 2),
              top: 72,
              width: pointPickModeBarWidth,
              background: 'rgba(37,37,38,0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
            }}
            onPointerDown={stopPointPickOverlayEvent}
            onClick={stopPointPickOverlayEvent}
            onWheel={stopPointPickOverlayEvent}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: '#2dd4bf', boxShadow: '0 0 10px rgba(45,212,191,0.72)' }} />
              <span className="shrink-0 font-semibold">{t('reference.pointPickTitle', { defaultValue: '点选参考元素' })}</span>
              <span className="min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.58)' }}>
                {t('reference.pointPickModeHint', { defaultValue: '点击当前图片中要参考的部分' })}
              </span>
              <span className="shrink-0" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('reference.pointPickEsc', { defaultValue: 'Esc 退出' })}</span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                stopPointPickOverlayEvent(event);
                exitPointPickMode();
              }}
              className="rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.72)', background: 'rgba(255,255,255,0.06)' }}
            >
              {t('common.exit', { defaultValue: '退出' })}
            </button>
          </div>
        </>,
        document.body,
      )
    : null;
  const pointPickResultPortal = isPointPickMode && pointPickImageRect && (pointPickLoading || pointPickResult || pointPickError)
    ? createPortal(
        <div
          className="fixed z-[130] rounded-xl p-3 nodrag nowheel shadow-[0_14px_36px_rgba(0,0,0,0.46)]"
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
            left: pointPickResultPanelLeft,
            top: pointPickResultPanelTop,
            width: pointPickResultPanelWidth,
            background: 'rgba(10,10,15,0.94)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          {pointPickLoading && (
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
              {t('reference.identifying', { defaultValue: '正在识别...' })}
            </div>
          )}

          {pointPickError && (
            <div>
              <div className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {t('reference.recognizeFailed', { defaultValue: '未能识别该区域' })}
              </div>
              <div className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {t('reference.recognizeFailedHint', { defaultValue: '请重新点选，或手动输入参考元素' })}
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPointPickResult(null);
                    setPointPickError(false);
                    setPointPickPosition(null);
                  }}
                  className="flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors hover:bg-white/10"
                  style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)' }}
                >
                  {t('reference.repick', { defaultValue: '重新点选' })}
                </button>
                <button
                  type="button"
                  onClick={openPointPickManualInput}
                  className="flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors hover:bg-white/10"
                  style={{ color: '#2dd4bf', background: 'rgba(20,184,166,0.15)' }}
                >
                  {t('reference.manualInput', { defaultValue: '手动输入' })}
                </button>
              </div>
            </div>
          )}

          {pointPickResult && !pointPickError && (
            <div>
              {!isEditingPointPickLabel ? (
                <>
                  <div className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {t('reference.selectedElement', { defaultValue: `已选择：${pointPickResult.label}`, label: pointPickResult.label })}
                  </div>
                  <div className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t('reference.selectedFromArea', { defaultValue: '来自你点击的图片区域' })}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={applyPointPickResult}
                      className="flex-1 rounded-md py-1.5 text-[11px] font-medium transition-colors"
                      style={{ color: '#ffffff', background: 'rgba(20,184,166,0.35)' }}
                    >
                      {t('common.apply', { defaultValue: '应用' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPointPickResult(null);
                        setPointPickPosition(null);
                      }}
                      className="flex-1 rounded-md py-1.5 text-[11px] transition-colors hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)' }}
                    >
                      {t('reference.repick', { defaultValue: '重新点选' })}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPointPickEditLabel(pointPickResult.label);
                        setIsEditingPointPickLabel(true);
                      }}
                      className="flex-1 rounded-md py-1.5 text-[11px] transition-colors hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.06)' }}
                    >
                      {t('reference.editName', { defaultValue: '修改名称' })}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1.5 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {t('reference.elementNameLabel', { defaultValue: '参考元素名称' })}
                  </div>
                  <input
                    ref={pointPickEditRef}
                    value={pointPickEditLabel}
                    onChange={(e) => setPointPickEditLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (pointPickEditLabel.trim()) applyEditedPointPickLabel();
                      }
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setIsEditingPointPickLabel(false);
                        setPointPickEditLabel('');
                      }
                    }}
                    className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  />
                  <div className="mt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingPointPickLabel(false);
                        setPointPickEditLabel('');
                      }}
                      className="rounded-md px-2.5 py-1 text-[11px] transition-colors hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.62)' }}
                    >
                      {t('common.cancel', { defaultValue: '取消' })}
                    </button>
                    <button
                      type="button"
                      onClick={applyEditedPointPickLabel}
                      disabled={!pointPickEditLabel.trim()}
                      className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                      style={{
                        color: pointPickEditLabel.trim() ? '#ffffff' : 'rgba(255,255,255,0.35)',
                        background: pointPickEditLabel.trim() ? 'rgba(20,184,166,0.35)' : 'rgba(255,255,255,0.06)',
                        cursor: pointPickEditLabel.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {t('common.apply', { defaultValue: '应用' })}
                    </button>
                  </div>
                </>
              )}
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
  const roleOption = getImageRoleOption(role, customRoleLabel);
  const RoleIconForTitle = roleOption?.Icon;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);
  const isOnlySelected = selected && selectedNodeCount === 1;

  const handleUpscale = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) {
      showToast(t('imageNode.noImageForUpscale'));
      return;
    }

    const onCreateUpscaleNode = data.onCreateUpscaleNode as ((sourceNodeId: string, inputImage: string, width: number, height: number) => void) | undefined;
    if (!onCreateUpscaleNode) return;
    onCreateUpscaleNode(id, resolved.imageUrl, resolved.width, resolved.height);
  }, [data, id, showToast, t]);

  const handleRelight = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) {
      showToast('当前节点没有可改光的图片。');
      return;
    }
    const onCreateRelightNode = data.onCreateRelightNode as ((sourceNodeId: string, inputImage: string, width: number, height: number) => void) | undefined;
    if (!onCreateRelightNode) return;
    onCreateRelightNode(id, resolved.imageUrl, resolved.width, resolved.height);
  }, [data, id, showToast]);

  const handleCompare = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) {
      showToast(t('imageNode.noImageForCompare'));
      return;
    }

    const onCreateCompareNode = data.onCreateCompareNode as ((sourceNodeId: string, inputImage: string, width: number, height: number) => void) | undefined;
    if (!onCreateCompareNode) return;
    onCreateCompareNode(id, resolved.imageUrl, resolved.width, resolved.height);
  }, [data, id, showToast, t]);

  const handlePreview = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) return;
    setPreviewImage(resolved.imageUrl);
    setImgSize({ width: resolved.width, height: resolved.height });
    setShowPreview(true);
  }, [data]);

  const handleDisplayImageLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (!naturalWidth || !naturalHeight) return;
    setImgSize((prev) => (
      prev?.width === naturalWidth && prev?.height === naturalHeight
        ? prev
        : { width: naturalWidth, height: naturalHeight }
    ));
  }, []);

  const handleDownload = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) return;
    const link = document.createElement('a');
    link.href = resolved.imageUrl;
    link.download = `image-node-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [data, id]);

  // Global Ctrl+G / Cmd+G shortcut for generation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (!isResultResource && isOnlySelected && canGenerate) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isResultResource, isOnlySelected, canGenerate, handleGenerate]);

  return (
    <div className="relative group/image" style={{ zIndex: selected ? 100 : 1, width: displayCardWidth, cursor: 'default' }}>
      {pointPickModePortal}
      {pointPickResultPortal}
      {/* Toolbar — shown above title only when this node has a real image/result */}
      {displayImage && isOnlySelected && !isMultiResultExpanded && (
        <div className="absolute z-20 flex justify-center" style={{ top: -80 / zoom, left: displayCardWidth / 2, transform: `translateX(-50%) scale(${inverseScale})`, transformOrigin: 'top center' }}>
          <ImageToolbar
            onUpscale={handleUpscale}
            onRelight={handleRelight}
            onCompare={handleCompare}
            onPreview={handlePreview}
            onDownload={handleDownload}
            hasImage={!!displayImage}
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
          display: isMultiResultExpanded ? 'none' : undefined,
        }}
      >
        <div className="flex items-center justify-between overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
            {displayImage && !isResultResource && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setRoleMenuOpen(true);
                }}
                className="flex-shrink-0 cursor-pointer select-none transition-all hover:brightness-125"
                style={{ color: getImageRoleColor(role, localReferenceType), fontSize: 11 }}
                title={t('imageNode.setImagePurpose')}
              >
                {RoleIconForTitle && (
                  <RoleIconForTitle className="inline-block" style={{ width: 11, height: 11, marginRight: 3, verticalAlign: '-0.1em' }} />
                )}
                {getImageRoleLabel(role, customRoleLabel, localReferenceType, localReferenceLabel) || t('imageNode.undefinedUsage')}
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
                onClick={() => setEditingName(true)}
                className="min-w-0 cursor-pointer truncate transition-colors hover:text-white nodrag"
                style={{ fontSize: 11 }}
              >
                {nodeName}
              </span>
            )}
          </div>
          {displayImage && showTitleMeta && (
            <span className="flex-shrink-0 ml-2" style={{ fontSize: 11 }}>
              {imgSize ? `${imgSize.width}×${imgSize.height}` : `${getNodeWidth(data) || 1024}×${getNodeHeight(data) || 1024}`}
            </span>
          )}
        </div>
      </div>

      {/* Image card wrapper — relative for handles/upload positioning */}
      <div className="relative" style={{ width: displayCardWidth }}>
        {/* Upload icon — inside card top-right, hidden when node has input connection */}
        {isOnlySelected && !hasInputConnection && !isResultResource && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute z-20 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                background: 'rgba(37,37,48,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Upload style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </>
        )}

        {displayImage && !isResultResource && (isOnlySelected || roleMenuOpen) && (
          <ImageRoleTag role={role} customRoleLabel={customRoleLabel} localReferenceType={localReferenceType} localReferenceLabel={localReferenceLabel} onChange={handleRoleChange} onStartPointPick={() => setIsPointPickMode(true)} openManualInputSignal={manualInputSignal} open={roleMenuOpen} onOpenChange={setRoleMenuOpen} />
        )}

        {/* Main card — aspect ratio adapts to uploaded image */}
        <div
          className={`node-preview-card w-full rounded-xl flex items-center justify-center transition-all relative ${isMultiResultSet && !isMultiResultExpanded ? 'overflow-visible' : 'overflow-hidden'}`}
          style={{
            width: displayCardWidth,
            height: displayCardHeight,
            background: isMultiResultExpanded ? 'transparent' : '#252526',
            border: isMultiResultExpanded ? 'none' : `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: isMultiResultExpanded ? 'none' : selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
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
                        className="group/result relative min-h-0 min-w-0 overflow-hidden rounded-xl"
                        style={{
                          border: isPrimary ? '1.5px solid rgba(0,212,255,0.55)' : '1px solid rgba(255,255,255,0.10)',
                          background: '#101014',
                          boxShadow: '0 12px 24px rgba(0,0,0,0.24)',
                        }}
                      >
                        <img src={img.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
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
                            title="下载"
                          >
                            <Download className="h-3.5 w-3.5" />
                            下载
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
                            title={isPrimary ? '收起' : '设为主图'}
                          >
                            {isPrimary ? <Minimize2 className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                            {isPrimary ? '收起' : '设为主图'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="relative block h-full w-full overflow-visible rounded-xl text-left">
                {currentResultSet.images
                  .filter((_, imageIndex) => imageIndex !== currentResultSet.selectedIndex)
                  .slice(0, Math.min(3, currentResultSet.images.length - 1))
                  .map((img, idx) => (
                    <div
                      key={img.resultId}
                      className="absolute overflow-hidden rounded-xl"
                      style={{
                        inset: 0,
                        transform: `translate(${10 + idx * 10}px, ${3 + idx * 4}px) scale(${0.97 - idx * 0.035})`,
                        transformOrigin: 'right center',
                        zIndex: 3 - idx,
                        opacity: 1,
                        background: '#17171d',
                        border: '1px solid rgba(255,255,255,0.14)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.38)',
                        filter: `brightness(${0.62 - idx * 0.12})`,
                      }}
                    >
                      <img src={img.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                    </div>
                  ))}
                <div
                  className="absolute inset-0 z-10 overflow-hidden rounded-xl"
                  style={{
                    border: '1px solid rgba(255,255,255,0.16)',
                    boxShadow: '0 18px 42px rgba(0,0,0,0.34)',
                    background: '#101014',
                  }}
                >
                  <img ref={imgRef} src={displayImage} alt="" className="h-full w-full object-cover" draggable={false} onLoad={handleDisplayImageLoad} />
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
                  {currentResultSet.images.length}张
                </button>
              </div>
            )
          ) : displayImage && currentResultSet && currentResultSet.images.length > 1 && !currentResultSet.isExpanded ? (
            <div className="relative w-full h-full">
              {currentResultSet.images
                .filter((_, imageIndex) => imageIndex !== currentResultSet.selectedIndex)
                .slice(0, 2)
                .map((img, idx) => (
                <div
                  key={img.resultId}
                  className="absolute rounded-lg overflow-hidden"
                  style={{
                    top: 4 + idx * 3,
                    left: 4 + idx * 3,
                    right: 4 - idx * 3,
                    bottom: 4 - idx * 3,
                    opacity: 0.35 - idx * 0.1,
                    transform: `scale(${0.96 - idx * 0.02})`,
                    zIndex: 1 + idx,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                </div>
              ))}
              <div className="absolute inset-0 z-10">
                <img
                  ref={imgRef}
                  src={displayImage}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                  onLoad={handleDisplayImageLoad}
                  onClick={handleImageClick}
                  style={{ cursor: isPointPickMode ? 'crosshair' : 'default' }}
                />
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentResultSet((prev) => prev ? { ...prev, isExpanded: true } : prev);
                }}
                className="absolute top-2 right-2 z-20 flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-white/15"
                style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <span>{currentResultSet.images.length}张</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.7 }}>
                  <path d="M2 4L5 7L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : displayImage && currentResultSet && currentResultSet.images.length > 1 && currentResultSet.isExpanded ? (
            <div className="relative w-full h-full p-2.5">
              <div
                className={currentResultSet.images.length === 2 ? 'flex h-full gap-2' : 'grid h-full gap-2'}
                style={{
                  gridTemplateColumns: currentResultSet.images.length === 2 ? undefined : '1fr 1fr',
                  gridTemplateRows: currentResultSet.images.length <= 2 ? undefined : '1fr 1fr',
                }}
              >
                {currentResultSet.images.map((img, idx) => (
                  <div
                    key={img.resultId}
                    className="group/result relative h-full min-w-0 flex-1 overflow-hidden rounded-lg"
                    style={{
                      border: idx === currentResultSet.selectedIndex ? '1.5px solid #00d4ff' : '1.5px solid rgba(255,255,255,0.10)',
                      background: 'rgba(255,255,255,0.035)',
                    }}
                  >
                    <img src={img.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                    <div className="absolute right-1.5 top-1.5 flex gap-1">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          downloadResultImage(img);
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/20"
                        style={{ background: 'rgba(0,0,0,0.56)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.12)' }}
                        title="下载"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          selectResultImage(idx);
                        }}
                        className="h-6 rounded-md px-2 text-[11px] font-medium transition-colors hover:bg-white/20"
                        style={{
                          background: idx === currentResultSet.selectedIndex ? 'rgba(0,212,255,0.24)' : 'rgba(0,0,0,0.56)',
                          color: idx === currentResultSet.selectedIndex ? '#bff4ff' : 'rgba(255,255,255,0.84)',
                          border: idx === currentResultSet.selectedIndex ? '1px solid rgba(0,212,255,0.36)' : '1px solid rgba(255,255,255,0.12)',
                        }}
                      >
                        {idx === currentResultSet.selectedIndex ? '主图' : '设为主图'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentResultSet((prev) => prev ? { ...prev, isExpanded: false } : prev);
                }}
                className="absolute top-2 right-2 z-20 flex items-center justify-center rounded-md transition-colors hover:bg-white/15"
                style={{ width: 24, height: 24, background: 'rgba(0,0,0,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.8 }}>
                  <path d="M2 6L5 3L8 6" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ) : displayImage ? (
            <div className="relative w-full h-full">
              <img
                ref={imgRef}
                src={displayImage}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
                onLoad={handleDisplayImageLoad}
                onClick={handleImageClick}
                onPointerDown={(event) => {
                  if (!isPointPickMode) return;
                  event.stopPropagation();
                }}
                onMouseDown={(event) => {
                  if (!isPointPickMode) return;
                  event.stopPropagation();
                }}
                style={{ cursor: isPointPickMode ? 'crosshair' : 'default' }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <Image
                className="h-12 w-12"
                strokeWidth={1.35}
                style={{ color: 'rgba(255,255,255,0.22)' }}
              />
            </div>
          )}
        </div>

        {/* Left visual handle — Input (hidden when image exists) */}
        {!displayImage && (
          <div
            className="image-node-handle input-port"
            data-port-type="input"
            data-data-type="image"
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
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
        <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="image"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            const onStart = data.onStartLineDraw as ((nodeId: string, x: number, y: number) => void) | undefined;
            if (!onStart) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
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
        </div>

        {/* React Flow handles — positioned to overlap visual handles exactly */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: resultHandleTop }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: resultHandleRight, top: resultHandleTop }} />
      </div>

      {/* Control panel — below the preview area */}
      {isOnlySelected && !isHistoryAsset && !isMultiResultExpanded && (!displayImage || generatedImages.length > 0 || isGenerating || isResultResource) && (
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
              selectedPresets={selectedPresets}
              onPresetsChange={handlePresetsChange}
              selectedStyleId={selectedStyleId}
              onStyleChange={handleStyleChange}
              modelParams={modelParams}
              onModelParamsChange={handleModelParamsChange}
              onGenerate={handleGenerate}
              canGenerate={canGenerate}
              isGenerating={isGenerating}
              generationTask={generationTask}
              references={references}
              onRemoveReference={handleRemoveReference}
              onReorderReferences={handleReorderReferences}
              onUseReference={handleUseReference}
              onAssignReferenceRole={handleAssignReferenceRole}
              showToast={showToast}
              autoOpenLightPanel={pendingLightPanelOpen}
              onAcknowledgeAutoOpen={() => setPendingLightPanelOpen(false)}
            />
          </div>

          <div style={{ height: (IMAGE_NODE_CONTROL_HEIGHT * CANVAS_NODE_CONTROL_SCALE + 22) / zoom }} />
        </>
      )}

      {/* Fullscreen preview modal — rendered via portal to escape node bounds */}
      {showPreview && displayImage && createPortal(
        <ImagePreviewModal
          imageUrl={displayImage}
          onClose={() => setShowPreview(false)}
        />,
        document.body,
      )}
    </div>
  );
}
