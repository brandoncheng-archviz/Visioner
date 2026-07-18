import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { Home, Plus, Sparkles } from 'lucide-react';
import { CANVAS_NODE_CARD_BACKGROUND, CANVAS_NODE_CARD_BORDER_COLOR, CANVAS_NODE_CARD_BORDER_WIDTH, CANVAS_NODE_CARD_RADIUS, CANVAS_NODE_CARD_SELECTED_BORDER_COLOR } from '../../constants/canvasConstants';
import { resolveNodeImage } from '../../utils/resolveNodeImage';
import { QuickRenderAtmospherePanel } from './QuickRenderAtmospherePanel';
import { QuickRenderAtmosphereReference } from './QuickRenderAtmosphereReference';
import { QuickRenderConnectedImages } from './QuickRenderConnectedImages';
import { QuickRenderFooter } from './QuickRenderFooter';
import { QuickRenderPromptPanel } from './QuickRenderPromptPanel';
import { QuickRenderStructurePanel } from './QuickRenderStructurePanel';
import type { QuickRenderConnectedImage, QuickRenderExteriorNodeData } from './quickRenderExterior.types';
import {
  createQuickRenderExteriorNodeData,
  createUploadedQuickRenderInputImage,
  readImageFileAsDataUrl,
} from './quickRenderExteriorUtils';

export function QuickRenderExteriorNode({ data, selected, id }: NodeProps) {
  const { setNodes, setEdges } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const generateTimeoutRef = useRef<number | null>(null);
  const canvasInputImages = useStore((state) => {
    return state.edges
      .filter((edge) => edge.target === id && edge.data?.kind !== 'atmosphereReference')
      .flatMap((edge) => {
        const sourceNode = state.nodes.find((node) => node.id === edge.source);
        const resolved = resolveNodeImage(sourceNode?.data);
        if (!sourceNode || !resolved) return [];
        return [{
          id: `canvas-${edge.id}`,
          sourceType: 'canvas' as const,
          imageUrl: resolved.imageUrl,
          sourceNodeId: sourceNode.id,
          sourceEdgeId: edge.id,
          width: resolved.width,
          height: resolved.height,
          label: typeof sourceNode.data?.label === 'string' ? sourceNode.data.label : undefined,
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
  const inputImagesSignature = JSON.stringify(inputImages.map((image) => `${image.id}:${image.imageUrl}`));
  const storedConnectedImagesSignature = JSON.stringify((nodeData.connectedImages || []).map((image) => `${image.id}:${image.imageUrl}`));

  const updateData = useCallback((patch: Partial<QuickRenderExteriorNodeData>) => {
    setNodes((nodes) => nodes.map((node) => node.id === id ? { ...node, data: { ...node.data, ...patch } } : node));
  }, [id, setNodes]);

  useEffect(() => {
    return () => {
      if (generateTimeoutRef.current) window.clearTimeout(generateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (inputImagesSignature === storedConnectedImagesSignature) return;
    updateData({ connectedImages: inputImages });
  }, [inputImages, inputImagesSignature, storedConnectedImagesSignature, updateData]);

  const removeConnectedImage = (image: QuickRenderConnectedImage) => {
    if (image.sourceType === 'canvas') {
      setEdges((edges) => edges.filter((edge) => edge.id !== image.sourceEdgeId));
      return;
    }
    updateData({
      connectedImages: (nodeData.connectedImages || []).filter((item) => item.id !== image.id),
    });
  };

  const handleInputUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const uploadedImages = await Promise.all(Array.from(files).map(async (file) => {
      const imageUrl = await readImageFileAsDataUrl(file);
      return createUploadedQuickRenderInputImage(imageUrl, file.name, file.type);
    }));
    updateData({
      connectedImages: [
        ...(nodeData.connectedImages || []),
        ...uploadedImages,
      ],
    });
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
    <div className="relative w-[520px]">
      <div
        className="absolute z-20 overflow-hidden nodrag"
        style={{
          top: -20 / zoom,
          left: 0,
          width: 520 * zoom,
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

      <div className="relative w-[520px]">
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
          className="node-preview-card flex h-[600px] w-[520px] flex-col overflow-hidden"
          style={{
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
            <div className="space-y-4 p-4 pr-3">
              <QuickRenderConnectedImages
                images={inputImages as QuickRenderConnectedImage[]}
                onRemove={removeConnectedImage}
                onUpload={handleInputUpload}
              />
              <QuickRenderAtmosphereReference data={nodeData} onChange={updateData} />
              <QuickRenderAtmospherePanel data={nodeData} onChange={updateData} />
              <QuickRenderStructurePanel data={nodeData} onChange={updateData} />
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
