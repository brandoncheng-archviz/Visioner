import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Image, Plus, Upload } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../hooks/useToast';
import type { ImageRole, PromptContent, ReferenceInfo } from '../../types/imageNode.types';
import type { MarkItem, ModelParams } from '../../types/canvas.types';
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
import {
  IMAGE_NODE_PREVIEW_WIDTH,
  IMAGE_NODE_EMPTY_HEIGHT,
  IMAGE_NODE_MIN_IMAGE_SIZE,
  IMAGE_NODE_MAX_IMAGE_WIDTH,
  IMAGE_NODE_MAX_IMAGE_HEIGHT,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  DEFAULT_MODEL_PARAMS,
} from '../../constants/canvasConstants';
import { UNIQUE_USAGES, getImageRoleOption, getImageRoleLabel, getImageRoleColor } from '../../constants/imageUsages';
import { getStylePresetById, getPresetById } from '../../constants/presets';
import { buildPromptSubmission } from '../../utils/promptUtils';
import { getRoleData } from '../../utils/referenceUtils';
import { resolveNodeImage } from '../../utils/resolveNodeImage';
import { ImageToolbar } from '../../components/ImageToolbar';
import { ImagePreviewModal } from '../../components/ImagePreviewModal';
import { ImageRoleTag } from '../../components/ImageRoleTag';
import { ImageNodeControlPanel } from './ImageNodeControlPanel';

export function ImageNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { show: showToast } = useToast();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const hasInputConnection = useStore((state) => state.edges.some((e) => e.target === id));

  const inputImage = getInputImage(data);
  const currentImage = getCurrentImage(data);
  const role = (data.role as ImageRole | null | undefined) ?? null;
  const customRoleLabel = data.customRoleLabel as string | undefined;
  const fileRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [nodeName, setNodeName] = useState((data.label as string) || 'Image');
  const [previewImage, setPreviewImage] = useState(currentImage);
  const [editingName, setEditingName] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { setNodes, setEdges } = useReactFlow();

  /* ─── Extended node state ─── */
  const [promptText, setPromptText] = useState((data.prompt as string) || '');
  const [promptContent, setPromptContent] = useState<PromptContent[]>((data.promptContent as PromptContent[]) || []);
  const [marks, setMarks] = useState<MarkItem[]>((data.marks as MarkItem[]) || []);
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
  const inputEdges = allEdges.filter((e) => e.target === id);
  const referenceOrder = (data.referenceOrder as string[]) || [];
  const rawReferences = inputEdges.flatMap((edge) => {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (sourceNode?.type === 'sunSky') return [];
    const edgeRole = edge.data?.role as ImageRole | null | undefined;
    const edgeCustomRoleLabel = edge.data?.customRoleLabel as string | undefined;
    const sourceRole = (sourceNode?.data?.role as ImageRole | null) || null;
    const sourceCustomRoleLabel = sourceNode?.data?.customRoleLabel as string | undefined;
    const referenceRole = edgeRole ?? sourceRole;
    const referenceCustomRoleLabel = edgeCustomRoleLabel ?? sourceCustomRoleLabel;
    const imageUrl = getCurrentImage(sourceNode?.data);
    if (!imageUrl) return [];
    return [{
      nodeId: edge.source,
      index: 0,
      role: referenceRole,
      roleLabel: getImageRoleLabel(referenceRole, referenceCustomRoleLabel),
      customRoleLabel: referenceCustomRoleLabel,
      imageUrl,
      width: getNodeWidth(sourceNode?.data),
      height: getNodeHeight(sourceNode?.data),
    }];
  });
  const references: ReferenceInfo[] = rawReferences
    .sort((a, b) => {
      const aIndex = referenceOrder.indexOf(a.nodeId);
      const bIndex = referenceOrder.indexOf(b.nodeId);
      if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex;
      if (aIndex >= 0) return -1;
      if (bIndex >= 0) return 1;
      return 0;
    })
    .map((ref, idx) => ({ ...ref, index: idx + 1 }));
  const referencesSignature = JSON.stringify(
    references.map((reference) => ({
      nodeId: reference.nodeId,
      role: reference.role,
      roleLabel: reference.roleLabel,
      customRoleLabel: reference.customRoleLabel,
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
    const { textPrompt, imageReferences, referenceImages, promptBlocks, userPrompt, globalStyle, presets } = buildPromptSubmission(promptText, promptContent, selectedPresets, selectedStyle, references);

    // Abort any previous running generation
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const task = createGenerationTask({
      sourceNodeId: id,
      prompt: textPrompt,
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
          prompt: textPrompt,
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

      const batchId = result.taskId;
      const historyItem: GenerationHistoryItem = {
        resultId: result.taskId,
        batchId,
        batchIndex: 1,
        imageUrl: result.imageUrl,
        prompt: textPrompt,
        userPrompt: userPrompt || '',
        inputRefs: task.inputRefs,
        presetIds: selectedPresets,
        styleId: selectedStyleId,
        modelParams: { ...modelParams },
        seed: result.seed,
        width: result.width,
        height: result.height,
        createdAt: Date.now(),
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
                  finalPrompt: textPrompt,
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
  }, [promptText, promptContent, selectedPresets, selectedStyle, selectedStyleId, references, generatedImages, id, setNodes, modelParams]);

  const handlePromptChange = (value: string) => {
    setPromptText(value);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n)));
  };

  const handlePromptContentChange = (content: PromptContent[]) => {
    setPromptContent(content);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, promptContent: content } } : n)));
  };

  const handleMarksChange = (newMarks: MarkItem[]) => {
    setMarks(newMarks);
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, marks: newMarks } } : n)));
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

  const handleAssignReferenceRole = (sourceNodeId: string, nextRole: ImageRole, nextCustomRoleLabel?: string) => {
    const roleOption = getImageRoleOption(nextRole, nextCustomRoleLabel);
    const roleData = getRoleData(nextRole, nextCustomRoleLabel);
    const assignReferenceEdgeRole = data.onAssignReferenceEdgeRole as ((targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string) => void) | undefined;
    if (assignReferenceEdgeRole) {
      assignReferenceEdgeRole(id, sourceNodeId, nextRole, nextCustomRoleLabel);
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
      roleLabel: roleOption?.label || existingReference.roleLabel,
    };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(file);

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

  const handleRoleChange = (nextRole: ImageRole, nextCustomRoleLabel?: string) => {
    if (UNIQUE_USAGES.includes(nextRole)) {
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
        showToast(t('reference.downstreamConflict', { role: getImageRoleLabel(nextRole, nextCustomRoleLabel) }));
        return;
      }
    }
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...getRoleData(nextRole, nextCustomRoleLabel) } } : n)));
  };

  const stopTitleInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const displayImage = previewImage || currentImage;
  const sourceWidth = imgSize?.width || getNodeWidth(data) || 1;
  const sourceHeight = imgSize?.height || getNodeHeight(data) || 1;
  const aspectRatio = sourceWidth / sourceHeight;
  const imageDisplayScale = displayImage
    ? Math.min(
        IMAGE_NODE_MAX_IMAGE_WIDTH / sourceWidth,
        IMAGE_NODE_MAX_IMAGE_HEIGHT / sourceHeight,
        Math.max(IMAGE_NODE_MIN_IMAGE_SIZE / sourceWidth, IMAGE_NODE_MIN_IMAGE_SIZE / sourceHeight),
      )
    : 1;
  const cardWidth = displayImage ? Math.round(sourceWidth * imageDisplayScale) : IMAGE_NODE_PREVIEW_WIDTH;
  const cardHeight = displayImage
    ? Math.max(120, Math.min(Math.round(cardWidth / aspectRatio), 320))
    : IMAGE_NODE_EMPTY_HEIGHT;
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

  const handleSunSky = useCallback(() => {
    const resolved = resolveNodeImage(data);
    if (!resolved) {
      showToast(t('imageNode.noImageForSunSky'));
      return;
    }

    const onCreateSunSkyNode = data.onCreateSunSkyNode as ((sourceNodeId: string, inputImage: string, width: number, height: number) => void) | undefined;
    if (!onCreateSunSkyNode) return;
    onCreateSunSkyNode(id, resolved.imageUrl, resolved.width, resolved.height);
  }, [data, id, showToast, t]);

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
      {/* Toolbar — shown above title when image exists and node is selected */}
      {displayImage && isOnlySelected && (
        <div className="absolute z-20 flex justify-center" style={{ top: -80 / zoom, left: cardWidth / 2, transform: `translateX(-50%) scale(${inverseScale})`, transformOrigin: 'top center' }}>
          <ImageToolbar
            onSunSky={handleSunSky}
            onUpscale={handleUpscale}
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
                style={{ color: getImageRoleColor(role), fontSize: 11 }}
                title={t('imageNode.setImagePurpose')}
              >
                {RoleIconForTitle && (
                  <RoleIconForTitle className="inline-block" style={{ width: 11, height: 11, marginRight: 3, verticalAlign: '-0.1em' }} />
                )}
                {roleOption?.label || t('imageNode.undefinedUsage')}
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
          <ImageRoleTag role={role} customRoleLabel={customRoleLabel} onChange={handleRoleChange} open={roleMenuOpen} onOpenChange={setRoleMenuOpen} />
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
            <img
              src={displayImage}
              alt=""
              className="w-full h-full object-contain"
              draggable={false}
              onDoubleClick={(event) => {
                event.stopPropagation();
                handlePreview();
              }}
            />
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
                title={`${idx + 1}`}
              >
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
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
              marks={marks}
              onMarksChange={handleMarksChange}
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
