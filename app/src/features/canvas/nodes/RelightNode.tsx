import { useCallback, useEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Handle, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { Loader2, Play, Plus, Square, Sun, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SunSkyNodeControls } from './SunSkyNode/SunSkyNodeControls';
import { SunSkyNodeInfo } from './SunSkyNode/SunSkyNodeInfo';
import { resolveSunSkyDerived } from './SunSkyNode/resolveSunSkyDerived';
import { clamp, snapToStep } from './SunSkyNode/sunSkyNode.utils';
import type { LightPreviewData } from '../types/lightPreview.types';
import {
  mockRelightPreview,
  mockRelightGenerate,
  cancelRelightTask,
  type RelightTaskState,
} from '../utils/mockRelightTask';
import { CANVAS_NODE_CONTROL_SCALE, IMAGE_NODE_CONTROL_WIDTH } from '../constants/canvasConstants';
import { resolveImageNodeSize } from '../utils/imageNodeSizing';
import { getCurrentImage, getNodeHeight, getNodeWidth } from '../types/imageNodeData.types';

export type RelightStatus = 'empty' | 'previewing' | 'previewResult' | 'generating' | 'result' | 'error';

export interface RelightNodeData {
  label?: string;
  generationMode?: 'relight';
  sourceImageNodeIds?: string[];
  status?: RelightStatus;
  previewImageUrl?: string;
  resultImageUrl?: string;
  currentImage?: string;
  width?: number;
  height?: number;
  lightPreview?: LightPreviewData;
  relightTask?: RelightTaskState;
  error?: string;
}

const DEFAULT_SUN = { elevation: 33, azimuth: 55 };
const RELIGHT_COST = 14;
const RELIGHT_CONTROL_PANEL_HEIGHT = 360;

function createLightPreview(sun: { elevation: number; azimuth: number }): LightPreviewData {
  const elevation = snapToStep(clamp(sun.elevation, 0, 90), 3);
  const azimuth = snapToStep(clamp(sun.azimuth, 0, 360), 5);
  return {
    enabled: true,
    sun: { elevation, azimuth },
    derived: resolveSunSkyDerived({ elevation, azimuth }),
  };
}

export function RelightNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;

  const nodeData = data as unknown as RelightNodeData;
  const initialLightPreview = nodeData.lightPreview ?? createLightPreview(DEFAULT_SUN);

  const [elevation, setElevation] = useState(initialLightPreview.sun.elevation);
  const [azimuth, setAzimuth] = useState(initialLightPreview.sun.azimuth);

  // Refs for task cancellation and debounce
  const taskCancelRef = useRef<(() => void) | null>(null);
  const debounceRef = useRef<number | null>(null);

  const connectedInput = useStore((state) => {
    const sourceIds = nodeData.sourceImageNodeIds ?? [];
    const inputEdge = state.edges.find((edge) => edge.target === id);
    const sourceNodeId = sourceIds[0] || inputEdge?.source;
    const sourceNode = state.nodes.find((node) => node.id === sourceNodeId);
    const imageUrl = getCurrentImage(sourceNode?.data);
    if (!sourceNodeId || !imageUrl) return null;
    return {
      nodeId: sourceNodeId,
      imageUrl,
      width: getNodeWidth(sourceNode?.data) || 1024,
      height: getNodeHeight(sourceNode?.data) || 1024,
    };
  });

  const lightPreview = useMemo(() => createLightPreview({ elevation, azimuth }), [elevation, azimuth]);

  const status = nodeData.status ?? 'empty';
  const displayImage =
    status === 'result'
      ? nodeData.resultImageUrl || nodeData.currentImage
      : nodeData.previewImageUrl;

  const sizeSourceWidth = connectedInput?.width || nodeData.width || 1;
  const sizeSourceHeight = connectedInput?.height || nodeData.height || 1;

  const previewSize = resolveImageNodeSize({
    hasImage: Boolean(connectedInput || displayImage),
    sourceWidth: sizeSourceWidth,
    sourceHeight: sizeSourceHeight,
  });

  const cardWidth = previewSize.cardWidth;
  const previewHeight = previewSize.cardHeight;
  const controlPanelWidth = IMAGE_NODE_CONTROL_WIDTH;
  const controlPanelHeight = RELIGHT_CONTROL_PANEL_HEIGHT;

  const isPreviewing = status === 'previewing';
  const isGenerating = status === 'generating';
  const hasPreviewResult = Boolean(nodeData.previewImageUrl);
  const connectedInputNodeId = connectedInput?.nodeId;

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
          currentLight?.derived.previewImagePath === lightPreview.derived.previewImagePath;
        const sourceUnchanged =
          (currentData.sourceImageNodeIds?.[0] || '') === (nextSourceIds?.[0] || '');
        if (lightUnchanged && sourceUnchanged) {
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
          },
        };
      });
      return didChange ? nextNodes : nds;
    });
  }, [connectedInputNodeId, id, lightPreview, setNodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;
    };
  }, []);

  const startPreviewTask = useCallback(
    (sunParams?: { elevation: number; azimuth: number }) => {
      if (!connectedInput) return;

      // Cancel any existing task
      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;

      const sourceIds = nodeData.sourceImageNodeIds?.length
        ? nodeData.sourceImageNodeIds
        : connectedInput
          ? [connectedInput.nodeId]
          : [];

      const previewData = sunParams ? createLightPreview(sunParams) : lightPreview;

      updateData({
        status: 'previewing',
        relightTask: undefined,
        error: undefined,
      });

      const { task, cancel } = mockRelightPreview(
        id,
        sourceIds,
        previewData,
        (t, url) => {
          taskCancelRef.current = null;
          updateData({
            status: 'previewResult',
            previewImageUrl: url,
            relightTask: t,
            error: undefined,
          });
        },
      );
      taskCancelRef.current = cancel;
      updateData({ relightTask: task });
    },
    [connectedInput, id, lightPreview, nodeData.sourceImageNodeIds, updateData],
  );

  const stopPreview = useCallback(() => {
    cancelRelightTask(taskCancelRef.current);
    taskCancelRef.current = null;
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    updateData({
      status: hasPreviewResult ? 'previewResult' : 'empty',
      relightTask: undefined,
      error: undefined,
    });
  }, [hasPreviewResult, updateData]);

  const handlePreviewToggle = useCallback(() => {
    if (isPreviewing) {
      stopPreview();
    } else {
      startPreviewTask();
    }
  }, [isPreviewing, startPreviewTask, stopPreview]);

  const handleGenerate = useCallback(() => {
    if (!connectedInput || isGenerating) return;

    // Cancel any running preview or debounce
    cancelRelightTask(taskCancelRef.current);
    taskCancelRef.current = null;
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
      relightTask: undefined,
      error: undefined,
    });

    const { task, cancel } = mockRelightGenerate(
      id,
      sourceIds,
      lightPreview,
        (t, url) => {
          taskCancelRef.current = null;
          updateData({
            status: 'result',
            resultImageUrl: url,
            currentImage: url,
            relightTask: t,
            error: undefined,
          });
        },
      );
    taskCancelRef.current = cancel;
    updateData({ relightTask: task });
  }, [connectedInput, isGenerating, lightPreview, nodeData.sourceImageNodeIds, id, updateData]);

  const handleSliderChange = useCallback(
    (newElevation: number, newAzimuth: number) => {
      setElevation(newElevation);
      setAzimuth(newAzimuth);

      if (!isPreviewing) return;

      // Cancel current preview task
      cancelRelightTask(taskCancelRef.current);
      taskCancelRef.current = null;

      // Cancel pending debounce
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      // Debounce and restart preview
      const delay = 300 + Math.floor(Math.random() * 300);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null;
        startPreviewTask({ elevation: newElevation, azimuth: newAzimuth });
      }, delay);
    },
    [isPreviewing, startPreviewTask],
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
      {/* Label */}
      <div className="absolute z-20" style={{ top: -20, left: 0, width: cardWidth }}>
        <div className="flex items-center gap-1 text-[11px] text-white/50">
          <Sun className="h-3.5 w-3.5 text-[#00d4ff]" />
          <span className="truncate">{label}</span>
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
        onPointerDown={stopNodeEvent}
        onMouseDown={stopNodeEvent}
        onTouchStart={stopNodeEvent}
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

      {/* Control panel */}
      <div
        className="absolute z-30"
        style={{
          top: previewHeight + 12 / zoom,
          left: cardWidth / 2,
          width: controlPanelWidth,
          transform: `translateX(-50%) scale(${inverseScale * CANVAS_NODE_CONTROL_SCALE})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          className="nodrag nopan nowheel overflow-hidden rounded-[18px] border"
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
          {/* Header */}
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="min-w-0">
              <div className="truncate text-[16px] font-semibold text-white/90">光影预览 / Light Preview</div>
              <div className="mt-1.5 truncate text-[13px] text-white/42">
                {lightPreview.derived.timeLabel} · {lightPreview.derived.directionLabel}
              </div>
            </div>
          </div>

          {/* Controls body */}
          <div className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: '205px minmax(0, 1fr)' }}>
            <div className="relative flex h-[205px] items-center justify-center overflow-hidden rounded-xl bg-[#0f1219]">
              <img
                src={lightPreview.derived.previewImagePath}
                alt="光影预览"
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
            <div className="min-w-0 space-y-3">
              <SunSkyNodeControls
                elevation={elevation}
                azimuth={azimuth}
                directionLabel={lightPreview.derived.directionLabel}
                onElevationChange={handleElevationChange}
                onAzimuthChange={handleAzimuthChange}
              />
              <SunSkyNodeInfo elevation={elevation} azimuth={azimuth} derived={lightPreview.derived} compact />
            </div>
          </div>

          {/* Footer buttons */}
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
              className="nodrag nowheel inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-35"
              style={{
                color: isPreviewing ? '#ffcf66' : 'rgba(255,255,255,0.78)',
                background: 'rgba(255,255,255,0.05)',
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {isPreviewing ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-current" />
              )}
              {isPreviewing ? '停止预览' : '实时预览'}
            </button>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!connectedInput || isGenerating}
              className="nodrag nowheel inline-flex items-center gap-1.5 rounded-lg px-5 py-2 text-[13px] font-medium transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-35"
              style={{ color: '#fff', background: '#208cff' }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              生成 · {RELIGHT_COST}
              <Zap className="h-3.5 w-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>

      {/* Spacer for control panel */}
      <div style={{ height: (controlPanelHeight * CANVAS_NODE_CONTROL_SCALE + 22) / zoom }} />
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
