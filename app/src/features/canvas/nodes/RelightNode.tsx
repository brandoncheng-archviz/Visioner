import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { Loader2, Play, Plus, Square, Sun, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LightPreviewData } from '../types/lightPreview.types';
import type { RelightCreationOptions, RelightPreset, RelightSettings } from '../types/relight.types';
import type { CurrentResultSet } from '../types/history.types';
import {
  mockRelightPreview,
  mockRelightGenerate,
  cancelRelightTask,
  type RelightTaskState,
} from '../utils/mockRelightTask';
import { CANVAS_NODE_CONTROL_SCALE, IMAGE_NODE_CONTROL_WIDTH } from '../constants/canvasConstants';
import { resolveImageNodeSize } from '../utils/imageNodeSizing';
import { getCurrentImage, getNodeHeight, getNodeWidth } from '../types/imageNodeData.types';
import { useHistory } from '../contexts/HistoryContext';
import { DEFAULT_RELIGHT_SETTINGS, DEFAULT_RELIGHT_SUN } from '../constants/relightPresets';
import { createRelightLightPreview } from '../utils/relightSettings';
import {
  RelightControlBody,
  RELIGHT_ADVANCED_PANEL_WIDTH,
  RELIGHT_CONTROL_PANEL_EXPANDED_HEIGHT,
  RELIGHT_CONTROL_PANEL_HEIGHT,
} from '../components/RelightControlBody';
import { ImageToolbar } from '../components/ImageToolbar';
import { ImagePreviewModal } from '../components/ImagePreviewModal';

export type RelightStatus = 'empty' | 'previewing' | 'previewResult' | 'generating' | 'result' | 'error';

export interface RelightNodeData {
  label?: string;
  generationMode?: 'relight';
  sourceImageNodeIds?: string[];
  status?: RelightStatus;
  previewImageUrl?: string;
  resultImageUrl?: string;
  inputImage?: string;
  currentImage?: string;
  currentResultSet?: CurrentResultSet | null;
  width?: number;
  height?: number;
  lightPreview?: LightPreviewData;
  relightSettings?: RelightSettings;
  relightTask?: RelightTaskState;
  error?: string;
  viewMode?: 'edit' | 'result';
  onCreateUpscaleNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateCompareNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
  onCreateRelightNode?: (
    sourceNodeId: string,
    inputImage: string,
    width: number,
    height: number,
    options?: RelightCreationOptions,
  ) => void;
}

const RELIGHT_COST = 14;

export function RelightNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const { addBatch } = useHistory();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;

  const nodeData = data as unknown as RelightNodeData;
  const status = nodeData.status ?? 'empty';
  const initialSettings = nodeData.relightSettings ?? DEFAULT_RELIGHT_SETTINGS;
  const initialLightPreview = nodeData.lightPreview ?? createRelightLightPreview(DEFAULT_RELIGHT_SUN, initialSettings);

  const [elevation, setElevation] = useState(initialLightPreview.sun.elevation);
  const [azimuth, setAzimuth] = useState(initialLightPreview.sun.azimuth);
  const [relightSettings, setRelightSettings] = useState<RelightSettings>(initialSettings);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isRealtimePreviewEnabled, setIsRealtimePreviewEnabled] = useState(status === 'previewing');
  const [showResultPreview, setShowResultPreview] = useState(false);

  // Refs for task cancellation and debounce
  const taskCancelRef = useRef<(() => void) | null>(null);
  const taskRef = useRef<RelightTaskState | null>(nodeData.relightTask ?? null);
  const debounceRef = useRef<number | null>(null);

  const connectedInput = useStore((state) => {
    const sourceIds = nodeData.sourceImageNodeIds ?? [];
    const inputEdge = state.edges.find((edge) => edge.target === id);
    const sourceNodeId = sourceIds[0] || inputEdge?.source;
    const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
    const imageUrl = nodeData.inputImage || getCurrentImage(sourceNode?.data);
    if (!sourceNodeId || !imageUrl) return null;
    return {
      nodeId: sourceNodeId,
      imageUrl,
      width: getNodeWidth(sourceNode?.data) || 1024,
      height: getNodeHeight(sourceNode?.data) || 1024,
    };
  });

  const lightPreview = useMemo(
    () => createRelightLightPreview({ elevation, azimuth }, relightSettings),
    [azimuth, elevation, relightSettings],
  );

  const isResultMode = status === 'result' && nodeData.viewMode !== 'edit';
  const isEditMode = !isResultMode;
  const selectedResult = nodeData.currentResultSet?.images[nodeData.currentResultSet.selectedIndex];
  const resultImage = selectedResult?.imageUrl || nodeData.resultImageUrl || nodeData.currentImage;
  const resultWidth = selectedResult?.width || nodeData.width || connectedInput?.width || 1024;
  const resultHeight = selectedResult?.height || nodeData.height || connectedInput?.height || 1024;
  const displayImage = isResultMode
    ? resultImage
    : nodeData.previewImageUrl || resultImage;

  const sizeSourceWidth = connectedInput?.width || nodeData.width || 1;
  const sizeSourceHeight = connectedInput?.height || nodeData.height || 1;

  const previewSize = resolveImageNodeSize({
    hasImage: Boolean(connectedInput || displayImage),
    sourceWidth: sizeSourceWidth,
    sourceHeight: sizeSourceHeight,
  });

  const cardWidth = previewSize.cardWidth;
  const previewHeight = previewSize.cardHeight;
  const controlPanelWidth = IMAGE_NODE_CONTROL_WIDTH + (showAdvancedSettings ? RELIGHT_ADVANCED_PANEL_WIDTH : 0);
  const controlPanelHeight = showAdvancedSettings
    ? RELIGHT_CONTROL_PANEL_EXPANDED_HEIGHT
    : RELIGHT_CONTROL_PANEL_HEIGHT;

  const isPreviewing = status === 'previewing';
  const isGenerating = status === 'generating';
  const isRealtimePreviewActive = isRealtimePreviewEnabled || isPreviewing;
  const hasPreviewResult = Boolean(nodeData.previewImageUrl);
  const connectedInputNodeId = connectedInput?.nodeId;
  const selectedNodeCount = useStore((state) => state.nodes.filter((node) => node.selected).length);
  const isOnlySelected = selected && selectedNodeCount === 1;
  const showControlPanel = isOnlySelected && isEditMode;

  const label = nodeData.label || t('canvas.nodeLabels.relight', { defaultValue: '改光' });

  const stopNodeEvent = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const updateData = useCallback(
    (patch: Partial<RelightNodeData>) => {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  ...patch,
                },
              }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  // Sync local slider state back to node data (lightPreview, source ids)
  useEffect(() => {
    setNodes((nds) => {
      let didChange = false;
      const nextNodes = nds.map((node) => {
        if (node.id !== id) return node;
        const currentData = node.data as unknown as RelightNodeData;
        const nextSourceIds = connectedInputNodeId ? [connectedInputNodeId] : currentData.sourceImageNodeIds;
        const currentLight = currentData.lightPreview;
        const lightUnchanged =
          currentLight?.enabled === lightPreview.enabled &&
          currentLight?.sun.elevation === lightPreview.sun.elevation &&
          currentLight?.sun.azimuth === lightPreview.sun.azimuth &&
          currentLight?.derived.previewImagePath === lightPreview.derived.previewImagePath &&
          currentLight?.derived.summary === lightPreview.derived.summary &&
          currentLight?.derived.promptText === lightPreview.derived.promptText;
        const settingsUnchanged =
          currentData.relightSettings?.cloudAmount === relightSettings.cloudAmount &&
          currentData.relightSettings?.fogLevel === relightSettings.fogLevel &&
          currentData.relightSettings?.lightingPresetId === relightSettings.lightingPresetId;
        const sourceUnchanged =
          (currentData.sourceImageNodeIds?.[0] || '') === (nextSourceIds?.[0] || '');
        if (lightUnchanged && settingsUnchanged && sourceUnchanged) {
          return node;
        }
        didChange = true;
        return {
          ...node,
          data: {
            ...node.data,
            generationMode: 'relight',
            sourceImageNodeIds: nextSourceIds,
            lightPreview,
            relightSettings,
          },
        };
      });
      return didChange ? nextNodes : nds;
    });
  }, [connectedInputNodeId, id, lightPreview, relightSettings, setNodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;
      taskRef.current = null;
    };
  }, []);

  const startPreviewTask = useCallback(
    (previewData: LightPreviewData = lightPreview) => {
      if (!connectedInput) return;

      // Cancel any existing task
      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;
      taskRef.current = null;

      const sourceIds = nodeData.sourceImageNodeIds?.length
        ? nodeData.sourceImageNodeIds
        : connectedInput
          ? [connectedInput.nodeId]
          : [];

      updateData({
        status: 'previewing',
        viewMode: 'edit',
        relightTask: undefined,
        error: undefined,
      });

      const { task, cancel } = mockRelightPreview(
        id,
        sourceIds,
        previewData,
        (t, url) => {
          taskCancelRef.current = null;
          taskRef.current = null;
          updateData({
            status: 'previewResult',
            previewImageUrl: url,
            relightTask: t,
            error: undefined,
          });
        },
      );
      taskCancelRef.current = cancel;
      taskRef.current = task;
      updateData({ relightTask: task });
    },
    [connectedInput, id, lightPreview, nodeData.sourceImageNodeIds, updateData],
  );

  const schedulePreviewTask = useCallback(
    (previewData: LightPreviewData) => {
      if (!isRealtimePreviewActive) return;

      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;
      taskRef.current = null;

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }

      const delay = 300 + Math.floor(Math.random() * 301);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        startPreviewTask(previewData);
      }, delay);
    },
    [isRealtimePreviewActive, startPreviewTask],
  );

  const stopPreview = useCallback(() => {
    cancelRelightTask(taskCancelRef.current);
    const cancelledTask = taskRef.current
      ? {
          ...taskRef.current,
          status: 'cancelled' as const,
        }
      : undefined;
    taskCancelRef.current = null;
    taskRef.current = null;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setIsRealtimePreviewEnabled(false);
    updateData({
      status: hasPreviewResult ? 'previewResult' : 'empty',
      relightTask: cancelledTask,
      error: undefined,
    });
  }, [hasPreviewResult, updateData]);

  const handlePreviewToggle = useCallback(() => {
    if (isRealtimePreviewActive) {
      stopPreview();
    } else {
      setIsRealtimePreviewEnabled(true);
      startPreviewTask(lightPreview);
    }
  }, [isRealtimePreviewActive, lightPreview, startPreviewTask, stopPreview]);

  const handleGenerate = useCallback(() => {
    if (!connectedInput || isGenerating) return;

    // Cancel any running preview or debounce
    cancelRelightTask(taskCancelRef.current);
    taskCancelRef.current = null;
    taskRef.current = null;
    setIsRealtimePreviewEnabled(false);
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    const sourceIds = nodeData.sourceImageNodeIds?.length
      ? nodeData.sourceImageNodeIds
      : connectedInput
        ? [connectedInput.nodeId]
        : [];

    updateData({
      status: 'generating',
      viewMode: 'edit',
      relightTask: undefined,
      error: undefined,
    });

    const { task, cancel } = mockRelightGenerate(
      id,
      sourceIds,
      lightPreview,
        (t, url) => {
          taskCancelRef.current = null;
          taskRef.current = null;
          const resultId = t.id;
          const createdAt = Date.now();
          addBatch({
            batchId: resultId,
            nodeId: id,
            assetType: 'relight',
            sourceNodeId: id,
            sourceImageNodeIds: sourceIds,
            images: [
              {
                resultId,
                imageUrl: url,
                width: connectedInput.width,
                height: connectedInput.height,
                seed: createdAt,
              },
            ],
            prompt: lightPreview.derived.promptText,
            userPrompt: '',
            inputRefs: [],
            presetIds: relightSettings.lightingPresetId ? [relightSettings.lightingPresetId] : [],
            styleId: null,
            lightPreview,
            modelParams: {
              model: 'mock-relight',
              ratio: `${connectedInput.width}:${connectedInput.height}`,
              resolution: `${connectedInput.width}x${connectedInput.height}`,
              lens: '',
              count: '1',
            },
            createdAt,
          });
          updateData({
            status: 'result',
            viewMode: 'result',
            resultImageUrl: url,
            currentImage: url,
            relightTask: t,
            error: undefined,
          });
        },
      );
    taskCancelRef.current = cancel;
    taskRef.current = task;
    updateData({ relightTask: task });
  }, [addBatch, connectedInput, isGenerating, lightPreview, nodeData.sourceImageNodeIds, id, relightSettings.lightingPresetId, updateData]);

  const handleContinueRelight = useCallback(() => {
    if (!resultImage) return;
    nodeData.onCreateRelightNode?.(
      id,
      resultImage,
      resultWidth,
      resultHeight,
      {
        lightPreview,
        relightSettings,
      },
    );
  }, [id, lightPreview, nodeData, relightSettings, resultHeight, resultImage, resultWidth]);

  const handleUpscaleResult = useCallback(() => {
    if (!resultImage) return;
    nodeData.onCreateUpscaleNode?.(id, resultImage, resultWidth, resultHeight);
  }, [id, nodeData, resultHeight, resultImage, resultWidth]);

  const handleCompareResult = useCallback(() => {
    if (!resultImage) return;
    nodeData.onCreateCompareNode?.(id, resultImage, resultWidth, resultHeight);
  }, [id, nodeData, resultHeight, resultImage, resultWidth]);

  const handleDownloadResult = useCallback(() => {
    if (!resultImage) return;
    const link = document.createElement('a');
    link.href = resultImage;
    link.download = `relight-node-${id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [id, resultImage]);

  const handleSliderChange = useCallback(
    (newElevation: number, newAzimuth: number) => {
      setElevation(newElevation);
      setAzimuth(newAzimuth);
      schedulePreviewTask(createRelightLightPreview(
        { elevation: newElevation, azimuth: newAzimuth },
        { ...relightSettings, lightingPresetId: undefined },
      ));
      setRelightSettings((current) => ({ ...current, lightingPresetId: undefined }));
    },
    [relightSettings, schedulePreviewTask],
  );

  const handleElevationChange = useCallback(
    (value: number) => {
      handleSliderChange(value, azimuth);
    },
    [handleSliderChange, azimuth],
  );

  const handleAzimuthChange = useCallback(
    (value: number) => {
      handleSliderChange(elevation, value);
    },
    [handleSliderChange, elevation],
  );

  const handleAdvancedSettingsChange = useCallback(
    (nextSettings: RelightSettings) => {
      setRelightSettings(nextSettings);
      schedulePreviewTask(createRelightLightPreview({ elevation, azimuth }, nextSettings));
    },
    [azimuth, elevation, schedulePreviewTask],
  );

  const handlePresetSelect = useCallback(
    (preset: RelightPreset) => {
      const nextSettings: RelightSettings = {
        cloudAmount: preset.cloudAmount,
        fogLevel: preset.fogLevel,
        lightingPresetId: preset.id,
      };
      setElevation(preset.elevation);
      setAzimuth(preset.azimuth);
      setRelightSettings(nextSettings);
      schedulePreviewTask(createRelightLightPreview(
        { elevation: preset.elevation, azimuth: preset.azimuth },
        nextSettings,
      ));
    },
    [schedulePreviewTask],
  );

  const renderPreviewContent = () => {
    if (isGenerating) {
      return (
        <StatusMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} text="改光生成中..." />
      );
    }
    if (isPreviewing) {
      return (
        <StatusMessage icon={<Loader2 className="h-4 w-4 animate-spin" />} text="实时预览中..." />
      );
    }
    if (displayImage) {
      return <img src={displayImage} alt="" className="h-full w-full object-cover" draggable={false} />;
    }
    return (
      <StatusMessage
        icon={<Sun className="h-4 w-4" />}
        text={connectedInput ? '调整阳光方向后生成图像' : '连接图片后配置改光图像'}
      />
    );
  };

  return (
    <div className="relative group/relight" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {resultImage && isResultMode && isOnlySelected && (
        <div
          className="absolute z-20 flex justify-center"
          style={{
            top: -80 / zoom,
            left: cardWidth / 2,
            transform: `translateX(-50%) scale(${inverseScale})`,
            transformOrigin: 'top center',
          }}
        >
          <ImageToolbar
            onUpscale={handleUpscaleResult}
            onRelight={handleContinueRelight}
            onCompare={handleCompareResult}
            onPreview={() => setShowResultPreview(true)}
            onDownload={handleDownloadResult}
            hasImage
            relightLabel="继续改光"
            relightTooltip="基于当前结果创建新的改光节点"
          />
        </div>
      )}

      {/* Label */}
      <div
        className="absolute z-20 overflow-hidden nodrag"
        onPointerDownCapture={stopNodeEvent}
        onMouseDownCapture={stopNodeEvent}
        onClick={stopNodeEvent}
        style={{
          top: -20 / zoom,
          left: 0,
          width: cardWidth * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <Sun className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13, color: '#00d4ff' }} />
          <span className="min-w-0 truncate transition-colors hover:text-white">{label}</span>
        </div>
      </div>

      {/* Preview area */}
      <div
        className="node-preview-card relative flex items-center justify-center overflow-hidden rounded-xl transition-all nowheel"
        style={{
          width: cardWidth,
          height: previewHeight,
          background: '#252526',
          border: `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
        }}
        onWheel={stopNodeEvent}
      >
        {renderPreviewContent()}
      </div>

      {/* Input handle visual */}
      <div
        className="image-node-handle input-port"
        data-port-type="input"
        data-data-type="image"
        style={{
          position: 'absolute',
          left: 0,
          top: previewHeight / 2,
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
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
      >
        <Plus style={{ width: 14, height: 14, color: 'white' }} />
      </div>

      {/* Output handle visual */}
      <div
        className="image-node-handle output-port"
        data-port-type="output"
        data-data-type="image"
        style={{
          position: 'absolute',
          right: 0,
          top: previewHeight / 2,
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
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          e.nativeEvent.stopImmediatePropagation();
          const onStart = data.onStartLineDraw as
            | ((nodeId: string, x: number, y: number) => void)
            | undefined;
          if (!onStart) return;
          const rect = e.currentTarget.getBoundingClientRect();
          onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
        }}
      >
        <Plus style={{ width: 14, height: 14, color: 'white' }} />
      </div>

      {/* React Flow handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ opacity: 0, width: 28, height: 28, left: 0, top: previewHeight / 2 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ opacity: 0, width: 28, height: 28, right: 0, top: previewHeight / 2 }}
      />

      {showControlPanel && (
        <>
          {/* Control panel */}
          <div
            className="absolute z-30 transition-[width] duration-300 ease-out"
            style={{
              top: previewHeight + 12 / zoom,
              left: cardWidth / 2,
              width: controlPanelWidth,
              transform: `translateX(-50%) scale(${inverseScale * CANVAS_NODE_CONTROL_SCALE})`,
              transformOrigin: 'top center',
            }}
          >
            <div
              className="nodrag nopan nowheel overflow-hidden rounded-[18px] border transition-[width,min-height] duration-300 ease-out"
              style={{
                width: controlPanelWidth,
                minHeight: controlPanelHeight,
                background: '#252526',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
              }}
              onWheel={stopNodeEvent}
              onPointerDown={stopNodeEvent}
              onPointerMove={stopNodeEvent}
              onMouseDown={stopNodeEvent}
              onClick={stopNodeEvent}
              onTouchStart={stopNodeEvent}
              onTouchMove={stopNodeEvent}
            >
              <RelightControlBody
                lightPreview={lightPreview}
                elevation={elevation}
                azimuth={azimuth}
                settings={relightSettings}
                showAdvancedSettings={showAdvancedSettings}
                onToggleAdvancedSettings={() => setShowAdvancedSettings((current) => !current)}
                onElevationChange={handleElevationChange}
                onAzimuthChange={handleAzimuthChange}
                onSettingsChange={handleAdvancedSettingsChange}
                onPresetSelect={handlePresetSelect}
              />

              {/* Footer actions span the complete control panel. */}
              <div
                className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3"
                onWheel={stopNodeEvent}
                onPointerDown={stopNodeEvent}
                onPointerMove={stopNodeEvent}
                onMouseDown={stopNodeEvent}
                onClick={stopNodeEvent}
                onTouchStart={stopNodeEvent}
                onTouchMove={stopNodeEvent}
              >
                <button
                  type="button"
                  onClick={handlePreviewToggle}
                  disabled={!connectedInput || isGenerating}
                  className="nodrag nowheel inline-flex h-[34px] items-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
                  style={{
                    color: isRealtimePreviewActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                    background: isRealtimePreviewActive ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.045)',
                    borderColor: 'rgba(255,255,255,0.075)',
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {isRealtimePreviewActive ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Play className="h-3.5 w-3.5 fill-current" />
                  )}
                  {isRealtimePreviewActive ? '停止预览' : '实时预览'}
                </button>
                <div
                  className="flex h-12 items-center overflow-hidden rounded-[15px] border"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderColor: 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="flex h-full items-center gap-1.5 px-4 text-[13px] font-medium"
                    style={{ color: 'rgba(255,255,255,0.58)' }}
                    title={`消耗 ${RELIGHT_COST} 积分`}
                  >
                    <Zap className="h-3.5 w-3.5 fill-current text-[#b8a36d]" />
                    <span>{RELIGHT_COST}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!connectedInput || isGenerating}
                    className="nodrag nowheel flex h-10 w-10 items-center justify-center rounded-[11px] transition duration-200 hover:brightness-105 hover:shadow-[0_4px_14px_rgba(255,255,255,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      marginRight: 3,
                      color: 'rgba(0,0,0,0.86)',
                      background: connectedInput && !isGenerating
                        ? 'rgba(255,255,255,0.92)'
                        : 'rgba(255,255,255,0.34)',
                    }}
                    title={isGenerating ? '改光生成中...' : `生成，消耗 ${RELIGHT_COST} 积分`}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <span className="text-[17px] font-semibold leading-none">↑</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Spacer for control panel */}
          <div style={{ height: (controlPanelHeight * CANVAS_NODE_CONTROL_SCALE + 22) / zoom }} />
        </>
      )}

      {showResultPreview && resultImage && createPortal(
        <ImagePreviewModal imageUrl={resultImage} onClose={() => setShowResultPreview(false)} />,
        document.body,
      )}
    </div>
  );
}

function StatusMessage({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 text-center text-white/50">
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55">
        {icon}
      </span>
      <span className="text-[13px]">{text}</span>
    </div>
  );
}
