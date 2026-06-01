import { useState, useRef, useEffect, useCallback, useMemo, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Image, Plus, Upload, Zap } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import type { ImageRole, PromptContent, ReferenceInfo, LocalReferenceType } from '../../types/imageNode.types';
import type { MarkItem, ModelParams } from '../../types/canvas.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import type { GenerationTask, GenerationHistoryItem } from '../../types/generation.types';
import {
  normalizeGeneratedImages,
  getCurrentImage,
  getInputImage,
  getNodeGenerationTask,
  getCurrentResultId,
  getNodeWidth,
  getNodeHeight,
} from '../../types/imageNodeData.types';
import { createGenerationTask, simulateGeneration } from '../../utils/mockGenerationTask';
import { checkGenerationRequestSafety, checkGenerationResultSafety } from '../../utils/contentSafety';
import {
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

  const inputImage = getInputImage(data);
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
  const displayImage = previewImage || currentImage;

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
  const [currentResultId, setCurrentResultId] = useState<string | null>(getCurrentResultId(data));

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
    const next = getCurrentResultId(data);
    setCurrentResultId((prev) => (prev === next ? prev : next));
  }, [data.currentResultId]);

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
  const canGenerate = !isGenerating && (references.length > 0 || role !== null || marks.length > 0 || selectedPresets.length > 0 || selectedStyle !== null || promptText.trim().length > 0 || promptContent.length > 0);

  const handleGenerate = useCallback(async () => {
    const referenceLimitIssue = getReferenceLimitIssueForGenerate(references);
    if (referenceLimitIssue) {
      showToast(formatReferenceLimitIssue(referenceLimitIssue));
      return;
    }

    const { textPrompt, imageReferences, referenceImages, promptBlocks, userPrompt, globalStyle, presets } = buildPromptSubmission(promptText, promptContent, selectedPresets, selectedStyle, references, lightPreview);

    // Content safety check — request phase
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

    // Abort any previous running generation
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
            setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, progress, updatedAt: Date.now() } : prev));
          },
        },
        controller.signal,
      );

      // Content safety check — result phase
      const resultSafety = await checkGenerationResultSafety({
        imageUrl: result.imageUrl,
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

      const batchId = result.taskId;
      const historyItem: GenerationHistoryItem = {
        resultId: result.taskId,
        batchId,
        batchIndex: 1,
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
        kind: 'final',
      };
      const nextGeneratedImages = [...generatedImages, historyItem];
      setPreviewImage(result.imageUrl);
      setGeneratedImages(nextGeneratedImages);

      const resultImage = new window.Image();
      resultImage.onload = () => {
        setImgSize({ width: resultImage.width, height: resultImage.height });
      };
      resultImage.src = result.imageUrl;

      setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, status: 'success', progress: 100, result, updatedAt: Date.now() } : prev));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  image: result.imageUrl,
                  currentImage: result.imageUrl,
                  currentResultId: result.taskId,
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
                  generationTask: { ...task, status: 'success', progress: 100, result, updatedAt: Date.now() },
                  width: result.width,
                  height: result.height,
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
  }, [promptText, promptContent, selectedPresets, selectedStyle, selectedStyleId, references, generatedImages, id, setNodes, modelParams, showToast, lightPreview]);

  const handlePreviewGenerate = useCallback(async () => {
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
            setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, progress, updatedAt: Date.now() } : prev));
          },
        },
        controller.signal,
      );

      const resultSafety = await checkGenerationResultSafety({
        imageUrl: result.imageUrl,
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

      const batchId = result.taskId;
      const historyItem: GenerationHistoryItem = {
        resultId: result.taskId,
        batchId,
        batchIndex: 1,
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
        kind: 'preview',
      };
      const nextGeneratedImages = [...generatedImages, historyItem];
      setPreviewImage(result.imageUrl);
      setGeneratedImages(nextGeneratedImages);

      const resultImage = new window.Image();
      resultImage.onload = () => {
        setImgSize({ width: resultImage.width, height: resultImage.height });
      };
      resultImage.src = result.imageUrl;

      setGenerationTask((prev) => (prev && prev.taskId === task.taskId ? { ...prev, status: 'success', progress: 100, result, updatedAt: Date.now() } : prev));

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  image: result.imageUrl,
                  currentImage: result.imageUrl,
                  currentResultId: result.taskId,
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
                  generationTask: { ...task, status: 'success', progress: 100, result, updatedAt: Date.now() },
                  width: result.width,
                  height: result.height,
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
  }, [promptText, promptContent, selectedPresets, selectedStyle, selectedStyleId, references, generatedImages, id, setNodes, modelParams, showToast, lightPreview]);

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

  const handleSelectResult = (resultId: string | null) => {
    if (resultId === null) {
      setPreviewImage(inputImage);
      setCurrentResultId(null);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, image: inputImage, currentImage: inputImage, currentResultId: null } }
            : n,
        ),
      );
      return;
    }
    const item = generatedImages.find((g) => g.resultId === resultId);
    if (!item) return;
    setPreviewImage(item.imageUrl);
    setCurrentResultId(resultId);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, image: item.imageUrl, currentImage: item.imageUrl, currentResultId: resultId } }
          : n,
      ),
    );
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
      // Empty node: open current node's light panel directly
      setPendingLightPanelOpen(true);
      return;
    }
    const onCreateRelightNode = data.onCreateRelightNode as ((sourceNodeId: string) => void) | undefined;
    if (!onCreateRelightNode) return;
    onCreateRelightNode(id);
  }, [data, id]);

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
        if (isOnlySelected && canGenerate) {
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOnlySelected, canGenerate, handleGenerate]);

  return (
    <div className="relative group/image" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {pointPickModePortal}
      {pointPickResultPortal}
      {/* Toolbar — shown above title only when this node has a real image/result */}
      {displayImage && isOnlySelected && (
        <div className="absolute z-20 flex justify-center" style={{ top: -80 / zoom, left: cardWidth / 2, transform: `translateX(-50%) scale(${inverseScale})`, transformOrigin: 'top center' }}>
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
        style={{ top: -20 / zoom, left: 0, width: cardWidth * zoom, transform: `scale(${inverseScale})`, transformOrigin: 'top left' }}
      >
        <div className="flex items-center justify-between overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
            {displayImage && (
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
      <div className="relative" style={{ width: cardWidth }}>
        {/* Upload icon — inside card top-right, hidden when node has input connection */}
        {isOnlySelected && !hasInputConnection && (
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

        {displayImage && (isOnlySelected || roleMenuOpen) && (
          <ImageRoleTag role={role} customRoleLabel={customRoleLabel} localReferenceType={localReferenceType} localReferenceLabel={localReferenceLabel} onChange={handleRoleChange} onStartPointPick={() => setIsPointPickMode(true)} openManualInputSignal={manualInputSignal} open={roleMenuOpen} onOpenChange={setRoleMenuOpen} />
        )}

        {/* Main card — aspect ratio adapts to uploaded image */}
        <div
          className="node-preview-card w-full rounded-xl flex items-center justify-center transition-all overflow-hidden"
          style={{
            width: cardWidth,
            height: displayImage ? Math.round(sourceHeight * imageDisplayScale) : cardHeight,
            background: '#252526',
            border: `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          {displayImage ? (
            <div className="relative w-full h-full">
              <img
                ref={imgRef}
                src={displayImage}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
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
              {/* Clean placeholder icon */}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="4" y="4" width="48" height="48" rx="12" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <path d="M16 38L24 26L30 34L36 28L40 32" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="38" cy="20" r="4" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <path d="M12 42C18 36 26 36 32 40C38 44 44 40 48 36" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Result history thumbnails — shown at bottom of image when there are generated results */}
        {displayImage && generatedImages.length > 0 && isOnlySelected && (
          <div
            className="absolute z-20 flex items-center gap-1.5 nodrag nowheel"
            style={{
              bottom: 8,
              left: '50%',
              transform: `translateX(-50%)`,
              padding: '4px 6px',
              background: 'rgba(10,10,15,0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              maxWidth: cardWidth - 16,
              overflowX: 'auto',
            }}
          >
            {/* Generated result thumbnails */}
            {generatedImages.map((item, idx) => (
              <button
                key={item.resultId}
                type="button"
                onClick={() => handleSelectResult(item.resultId)}
                className="flex-shrink-0 relative rounded overflow-hidden transition-all"
                style={{
                  width: 28,
                  height: 28,
                  border: currentResultId === item.resultId ? '1.5px solid #00d4ff' : '1.5px solid transparent',
                  boxShadow: currentResultId === item.resultId ? '0 0 0 1px rgba(0,212,255,0.3)' : 'none',
                }}
                title={item.kind === 'preview' ? `预览 ${idx + 1}` : `${idx + 1}`}
              >
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                {item.kind === 'preview' && (
                  <div className="absolute bottom-0 right-0 flex items-center justify-center rounded-tl-sm" style={{ background: 'rgba(0,0,0,0.58)', width: 10, height: 10 }}>
                    <Zap className="w-[7px] h-[7px]" style={{ color: '#fbbf24' }} />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

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
            right: 0,
            top: '50%',
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
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />
      </div>

      {/* Control panel — below the preview area */}
      {/* 空节点或有生成历史的节点才显示控制面板；纯上传/拖入的素材节点隐藏；多选时也不显示 */}
      {isOnlySelected && (!displayImage || generatedImages.length > 0) && (
        <>
          <div
            className="absolute z-30"
            style={{
              top: cardHeight + 12 / zoom,
              left: cardWidth / 2,
              width: IMAGE_NODE_CONTROL_WIDTH,
              transform: `translateX(-50%) scale(${inverseScale})`,
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
              onPreviewGenerate={handlePreviewGenerate}
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

          <div style={{ height: (IMAGE_NODE_CONTROL_HEIGHT + 22) / zoom }} />
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
