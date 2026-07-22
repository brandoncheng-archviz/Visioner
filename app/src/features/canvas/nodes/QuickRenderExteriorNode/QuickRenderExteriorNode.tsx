import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useStore, type Node, type NodeProps } from '@xyflow/react';
import { Home, Plus, Sparkles } from 'lucide-react';
import { CANVAS_NODE_CARD_BACKGROUND, CANVAS_NODE_CARD_BORDER_COLOR, CANVAS_NODE_CARD_BORDER_WIDTH, CANVAS_NODE_CARD_RADIUS, CANVAS_NODE_CARD_SELECTED_BORDER_COLOR } from '../../constants/canvasConstants';
import { getReferenceUsageInfo } from '../../constants/imageUsages';
import type { ImageRole, LocalReferencePoint, LocalReferenceType } from '../../types/imageNode.types';
import { resolveNodeImage } from '../../utils/resolveNodeImage';
import { QuickRenderAtmospherePanel } from './QuickRenderAtmospherePanel';
import { QuickRenderConnectedImages } from './QuickRenderConnectedImages';
import { QuickRenderFooter } from './QuickRenderFooter';
import { QuickRenderPromptPanel } from './QuickRenderPromptPanel';
import { QuickRenderStructurePanel } from './QuickRenderStructurePanel';
import type { QuickRenderConnectedImage, QuickRenderExteriorNodeData } from './quickRenderExterior.types';
import {
  createQuickRenderStructureChannel,
  createQuickRenderExteriorNodeData,
  detectQuickRenderStructureChannelType,
  sortQuickRenderStructureChannels,
} from './quickRenderExteriorUtils';

const QUICK_RENDER_NODE_WIDTH = 520;
const QUICK_RENDER_NODE_HEIGHT = 640;
type CanvasSelectionMode = 'input' | 'structure' | null;

export function QuickRenderExteriorNode({ data, selected, id }: NodeProps) {
  const { getNodes, setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const generateTimeoutRef = useRef<number | null>(null);
  const [canvasSelectionMode, setCanvasSelectionMode] = useState<CanvasSelectionMode>(null);
  const hoveredSelectableNodeRef = useRef<HTMLElement | null>(null);
  const canvasInputImages = useStore((state) => {
    return state.edges
      .filter((edge) => edge.target === id && edge.data?.kind !== 'atmosphereReference')
      .flatMap((edge) => {
        const sourceNode = state.nodes.find((node) => node.id === edge.source);
        const resolved = resolveNodeImage(sourceNode?.data);
        if (!sourceNode || !resolved) return [];
        const edgeRole = edge.data?.role as ImageRole | null | undefined;
        const sourceRole = sourceNode.data?.role as ImageRole | null | undefined;
        const role = edgeRole ?? sourceRole ?? null;
        const customRoleLabel = (edge.data?.customRoleLabel as string | undefined)
          ?? (sourceNode.data?.customRoleLabel as string | undefined);
        const localReferenceType = (edge.data?.localReferenceType as LocalReferenceType | undefined)
          ?? (sourceNode.data?.localReferenceType as LocalReferenceType | undefined);
        const localReferenceLabel = (edge.data?.localReferenceLabel as string | undefined)
          ?? (sourceNode.data?.localReferenceLabel as string | undefined);
        const localReferencePoint = (edge.data?.localReferencePoint as LocalReferencePoint | undefined)
          ?? (sourceNode.data?.localReferencePoint as LocalReferencePoint | undefined);
        const usageInfo = getReferenceUsageInfo(role, customRoleLabel, localReferenceType, localReferenceLabel);
        return [{
          id: `canvas-${edge.id}`,
          sourceType: 'canvas' as const,
          imageUrl: resolved.imageUrl,
          sourceNodeId: sourceNode.id,
          sourceEdgeId: edge.id,
          width: resolved.width,
          height: resolved.height,
          label: typeof sourceNode.data?.label === 'string' ? sourceNode.data.label : undefined,
          role,
          roleLabel: usageInfo.label,
          roleColor: usageInfo.color,
          customRoleLabel,
          localReferenceType: usageInfo.localReferenceType,
          localReferenceLabel: usageInfo.localReferenceLabel,
          localReferencePoint,
        }];
      });
  });
  const nodeData = useMemo(
    () => ({ ...createQuickRenderExteriorNodeData(String(data.label || '快速渲染-室外')), ...(data as QuickRenderExteriorNodeData) }),
    [data],
  );
  const modelParams = nodeData.modelParams || { model: 'Nano Banana 2', aspectRatio: '1:1', resolution: '2K', count: 1 };
  const uploadedInputImages = useMemo(
    () => (nodeData.connectedImages || []).filter((image) => image.sourceType === 'upload'),
    [nodeData.connectedImages],
  );
  const inputImages = useMemo(
    () => [...canvasInputImages, ...uploadedInputImages],
    [canvasInputImages, uploadedInputImages],
  );
  const hasAtmosphereReferenceInput = inputImages.some((image) => image.role === 'atmosphere_reference' || image.role === 'overall_reference' || image.roleLabel?.includes('氛围'));

  const updateData = useCallback((patch: Partial<QuickRenderExteriorNodeData>) => {
    setNodes((nodes) => nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node));
  }, [id, setNodes]);

  const clearCanvasSelectionHighlight = useCallback(() => {
    if (!hoveredSelectableNodeRef.current) return;
    hoveredSelectableNodeRef.current.classList.remove('quick-render-canvas-selectable-hover');
    hoveredSelectableNodeRef.current = null;
  }, []);

  const getSelectableImageNode = useCallback((nodeId: string | null | undefined) => {
    if (!nodeId || nodeId === id) return null;
    const node = getNodes().find((item) => item.id === nodeId);
    if (!node) return null;
    if (node.type === 'text' || node.type === 'compare' || node.type === 'upscale' || node.type === 'quickRenderExterior') return null;
    const resolved = resolveNodeImage(node.data);
    if (!resolved?.imageUrl) return null;
    return { node, resolved };
  }, [getNodes, id]);

  const addCanvasInputEdge = useCallback((sourceNode: Node) => {
    nodeData.onAddQuickRenderInputEdge?.(id, sourceNode.id);
  }, [id, nodeData]);

  const startCanvasImageSelection = useCallback(() => {
    setCanvasSelectionMode('input');
  }, []);

  const addStructureChannelFromNode = useCallback((sourceNode: Node, resolved: { imageUrl: string; width?: number; height?: number }) => {
    const label = typeof sourceNode.data?.label === 'string' ? sourceNode.data.label : '';
    const fileName = (sourceNode.data?.fileName as string | undefined) || label || 'canvas-image';
    const type = detectQuickRenderStructureChannelType(fileName) || 'unknown';
    const nextChannel = createQuickRenderStructureChannel(
      type,
      resolved.imageUrl,
      fileName,
      undefined,
      'canvas',
      sourceNode.id,
      resolved.width,
      resolved.height,
    );
    const structure = nodeData.structure || {};
    updateData({
      structureEnabled: true,
      structure: {
        ...structure,
        channels: sortQuickRenderStructureChannels([...(structure.channels || []), nextChannel]),
        pendingFiles: [],
      },
    });
  }, [nodeData.structure, updateData]);

  const startStructureChannelSelection = useCallback(() => {
    setCanvasSelectionMode('structure');
  }, []);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) window.clearTimeout(generateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!canvasSelectionMode) {
      clearCanvasSelectionHighlight();
      return;
    }

    const getNodeIdFromEvent = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return null;
      return target.closest('.react-flow__node')?.getAttribute('data-id') ?? null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const nodeId = getNodeIdFromEvent(event);
      const selectable = getSelectableImageNode(nodeId);
      const nodeElement = selectable
        ? document.querySelector(`.react-flow__node[data-id="${selectable.node.id}"]`) as HTMLElement | null
        : null;
      if (hoveredSelectableNodeRef.current === nodeElement) return;
      clearCanvasSelectionHighlight();
      if (!nodeElement) return;
      nodeElement.classList.add('quick-render-canvas-selectable-hover');
      hoveredSelectableNodeRef.current = nodeElement;
    };

    const handlePointerDown = (event: PointerEvent) => {
      const nodeId = getNodeIdFromEvent(event);
      const selectable = getSelectableImageNode(nodeId);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      if (selectable) {
        if (canvasSelectionMode === 'input') {
          addCanvasInputEdge(selectable.node);
        } else {
          addStructureChannelFromNode(selectable.node, selectable.resolved);
        }
      }
      setCanvasSelectionMode(null);
      clearCanvasSelectionHighlight();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setCanvasSelectionMode(null);
      clearCanvasSelectionHighlight();
    };

    document.body.style.cursor = 'crosshair';
    window.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('pointerdown', handlePointerDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('pointerdown', handlePointerDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      clearCanvasSelectionHighlight();
    };
  }, [addCanvasInputEdge, addStructureChannelFromNode, canvasSelectionMode, clearCanvasSelectionHighlight, getSelectableImageNode]);

  const removeConnectedImage = (image: QuickRenderConnectedImage) => {
    const removeCachedImage = (candidate: QuickRenderConnectedImage) => {
      if (candidate.id === image.id) return false;
      if (image.sourceEdgeId && candidate.sourceEdgeId === image.sourceEdgeId) return false;
      if (
        image.sourceType === 'canvas' &&
        image.sourceNodeId &&
        candidate.sourceType === 'canvas' &&
        candidate.sourceNodeId === image.sourceNodeId
      ) {
        return false;
      }
      return true;
    };

    if (image.sourceType === 'canvas') {
      nodeData.onRemoveQuickRenderInputEdge?.(id, image.sourceNodeId || '', image.sourceEdgeId);
    }

    updateData({
      connectedImages: (nodeData.connectedImages || []).filter(removeCachedImage),
    });
  };

  const handleInputUpload = (files: FileList | null) => {
    nodeData.onUploadQuickRenderInputImages?.(id, files);
  };

  const handleGenerate = () => {
    if (nodeData.status === 'generating') return;
    updateData({ status: 'generating', mockResultMessage: '正在模拟快速渲染...' });
    generateTimeoutRef.current = window.setTimeout(() => {
      updateData({ status: 'success', mockResultMessage: 'Mock 生成完成，后续将自动创建图片结果节点。' });
    }, 1200);
  };

  const isGenerating = nodeData.status === 'generating';
  const creditCost = 60;
  const handleTop = '50%';
  const handleSize = 28;
  const visibleMockResultMessage = nodeData.mockResultMessage?.includes('从画布添加')
    ? ''
    : nodeData.mockResultMessage;

  const startHandleDraw = (
    event: React.PointerEvent<HTMLDivElement>,
    sourceHandleId: string,
    sourceHandleType: 'source' | 'target',
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    const onStart = data.onStartLineDraw as ((
      nodeId: string,
      x: number,
      y: number,
      sourceHandleId: string,
      sourceHandleType: 'source' | 'target',
    ) => void) | undefined;
    if (!onStart) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2, sourceHandleId, sourceHandleType);
  };

  return (
    <div className="quick-render-exterior-node relative" style={{ width: QUICK_RENDER_NODE_WIDTH }}>
      <style>
        {`
          .quick-render-exterior-node [data-slot="switch-thumb"] {
            background: #24252a !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
          }
          .quick-render-exterior-node .quick-render-inner-switch-thumb {
            background: #24252a !important;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
          }
        `}
      </style>
      {canvasSelectionMode && typeof document !== 'undefined' && createPortal(
        <>
          <style>
            {`
              .react-flow__node.quick-render-canvas-selectable-hover .node-preview-card {
                border-color: rgba(47, 107, 255, 0.95) !important;
                box-shadow: 0 0 0 2px rgba(47, 107, 255, 0.35), 0 16px 36px rgba(0, 0, 0, 0.38) !important;
              }
            `}
          </style>
          <div className="pointer-events-none fixed left-1/2 top-5 z-[2300] -translate-x-1/2 rounded-full border border-white/[0.10] bg-[#222224]/95 px-3 py-2 text-[12px] font-medium text-white/72 shadow-[0_12px_30px_rgba(0,0,0,0.42)]">
            {canvasSelectionMode === 'input' ? '选择一张画布图片作为输入，Esc 取消' : '选择一张画布图片作为结构通道，Esc 取消'}
          </div>
        </>,
        document.body,
      )}
      <div
        className="absolute z-20 overflow-hidden nodrag"
        style={{
          top: -20 / zoom,
          left: 0,
          width: QUICK_RENDER_NODE_WIDTH * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-center justify-between overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <Home className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
            <span className="min-w-0 truncate" style={{ fontSize: 11 }}>
              {nodeData.label || '快速渲染-室外'}
            </span>
          </div>
        </div>
      </div>

      <div className="relative" style={{ width: QUICK_RENDER_NODE_WIDTH }}>
        <div
          className="image-node-handle input-port"
          data-port-type="input"
          data-data-type="image"
          data-handle-id="left-target"
          data-handle-type="target"
          onPointerDown={(event) => startHandleDraw(event, 'left-target', 'target')}
          style={{
            position: 'absolute',
            left: 0,
            top: handleTop,
            transform: 'translate(-50%, -50%)',
            width: handleSize,
            height: handleSize,
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
        <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="image"
          data-handle-id="right-source"
          data-handle-type="source"
          onPointerDown={(event) => startHandleDraw(event, 'right-source', 'source')}
          style={{
            position: 'absolute',
            right: 0,
            top: handleTop,
            transform: 'translate(50%, -50%)',
            width: handleSize,
            height: handleSize,
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
        <Handle id="left-target" type="target" position={Position.Left} style={{ opacity: 0, width: handleSize, height: handleSize, left: 0, top: handleTop, pointerEvents: 'none' }} />
        <Handle id="right-source" type="source" position={Position.Right} style={{ opacity: 0, width: handleSize, height: handleSize, right: 0, top: handleTop, pointerEvents: 'none' }} />
        <Handle id="right-target" type="target" position={Position.Right} style={{ opacity: 0, width: handleSize, height: handleSize, right: 0, top: handleTop, pointerEvents: 'none' }} />

        <div
          className="node-preview-card flex flex-col overflow-hidden"
          style={{
            width: QUICK_RENDER_NODE_WIDTH,
            height: QUICK_RENDER_NODE_HEIGHT,
            background: CANVAS_NODE_CARD_BACKGROUND,
            borderRadius: CANVAS_NODE_CARD_RADIUS,
            borderWidth: CANVAS_NODE_CARD_BORDER_WIDTH,
            borderColor: selected ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : CANVAS_NODE_CARD_BORDER_COLOR,
          }}
        >
          <div
            className="quick-render-node-scrollbar nowheel min-h-0 flex-1 overflow-y-auto"
            onWheel={(event) => event.stopPropagation()}
          >
            <div className="space-y-3 p-4 pb-5">
              <QuickRenderConnectedImages
                images={inputImages as QuickRenderConnectedImage[]}
                onRemove={removeConnectedImage}
                onUpload={handleInputUpload}
                onSelectFromCanvas={startCanvasImageSelection}
              />
              <QuickRenderStructurePanel data={nodeData} onChange={updateData} onSelectFromCanvas={startStructureChannelSelection} />
              <QuickRenderAtmospherePanel data={nodeData} hasAtmosphereReference={hasAtmosphereReferenceInput} onChange={updateData} />
              <QuickRenderPromptPanel value={nodeData.prompt || ''} onChange={(prompt) => updateData({ prompt })} />
              {visibleMockResultMessage && (
                <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-3 py-2 text-[12px] text-white/52">
                  <Sparkles className="h-3.5 w-3.5" />
                  {visibleMockResultMessage}
                </div>
              )}
            </div>
          </div>

          <QuickRenderFooter
            params={modelParams}
            isGenerating={isGenerating}
            creditCost={creditCost}
            onChange={(params) => updateData({ modelParams: params })}
            onGenerate={handleGenerate}
          />
        </div>
      </div>
    </div>
  );
}
