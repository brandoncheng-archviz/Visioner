import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, Plus, Loader2, AlertCircle } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import {
  CANVAS_NODE_CARD_BACKGROUND,
  CANVAS_NODE_CARD_BORDER_COLOR,
  CANVAS_NODE_CARD_BORDER_WIDTH,
  CANVAS_NODE_CARD_RADIUS,
  CANVAS_NODE_CARD_SELECTED_BORDER_COLOR,
  IMAGE_NODE_EMPTY_HEIGHT,
  IMAGE_NODE_MAX_IMAGE_HEIGHT,
  IMAGE_NODE_MAX_IMAGE_WIDTH,
  IMAGE_NODE_MIN_IMAGE_HEIGHT,
  IMAGE_NODE_MIN_IMAGE_WIDTH,
  IMAGE_NODE_PREVIEW_WIDTH,
} from '../constants/canvasConstants';
import { UpscaleParamPanel } from '../components/UpscaleParamPanel';
import { UpscaleResultToolbar } from '../components/UpscaleResultToolbar';
import { ImagePreviewModal } from '../components/ImagePreviewModal';
import { createUpscaleTask, simulateUpscale } from '../utils/mockUpscaleTask';
import { resolveImageNodeSize } from '../utils/imageNodeSizing';
import type { UpscaleNodeData, UpscaleHistoryItem } from '../types/upscaleNode.types';
import { getCurrentImage, getNodeHeight, getNodeWidth } from '../types/imageNodeData.types';

function getModeFromParams(data: UpscaleNodeData): UpscaleNodeData['mode'] {
  if (data.engine === 'topazlabs') {
    const map: Record<string, UpscaleNodeData['mode']> = {
      general: 'preserve',
      lowRes: 'denoise',
      animation3d: 'creative_detail',
      highFidelity: 'clarity',
      textOpt: 'sharpen',
    };
    return map[data.tlModel || 'general'] || 'preserve';
  }
  if (data.engine === 'magnific_creative') {
    const map: Record<string, UpscaleNodeData['mode']> = {
      standard: 'preserve',
      softPortrait: 'clarity',
      hardPortrait: 'clarity',
      artIllustration: 'creative_detail',
      gameAsset: 'creative_detail',
      natureLandscape: 'denoise',
      filmPhoto: 'material',
      render3d: 'sharpen',
    };
    return map[data.mcOptimized || 'standard'] || 'preserve';
  }
  return 'preserve';
}

function uiEngineToData(engine: string): UpscaleNodeData['engine'] {
  if (engine === 'magnific-precision') return 'magnific_precision_v2';
  if (engine === 'magnific-creative') return 'magnific_creative';
  return 'topazlabs';
}

function dataEngineToUi(engine: UpscaleNodeData['engine']): string {
  if (engine === 'magnific_precision_v2') return 'magnific-precision';
  if (engine === 'magnific_creative') return 'magnific-creative';
  return 'topazlabs';
}

function resolveResultImageSize(sourceWidth: number, sourceHeight: number) {
  const safeWidth = Math.max(1, sourceWidth || IMAGE_NODE_PREVIEW_WIDTH);
  const safeHeight = Math.max(1, sourceHeight || IMAGE_NODE_PREVIEW_WIDTH);
  let displayWidth = IMAGE_NODE_MAX_IMAGE_WIDTH;
  let displayHeight = displayWidth * safeHeight / safeWidth;

  if (displayHeight > IMAGE_NODE_MAX_IMAGE_HEIGHT) {
    const scale = IMAGE_NODE_MAX_IMAGE_HEIGHT / displayHeight;
    displayWidth *= scale;
    displayHeight = IMAGE_NODE_MAX_IMAGE_HEIGHT;
  }

  if (displayHeight < IMAGE_NODE_MIN_IMAGE_HEIGHT) {
    const scale = IMAGE_NODE_MIN_IMAGE_HEIGHT / displayHeight;
    const nextWidth = displayWidth * scale;
    if (nextWidth <= IMAGE_NODE_MAX_IMAGE_WIDTH) {
      displayWidth = nextWidth;
      displayHeight = IMAGE_NODE_MIN_IMAGE_HEIGHT;
    }
  }

  if (displayWidth < IMAGE_NODE_MIN_IMAGE_WIDTH) {
    const scale = IMAGE_NODE_MIN_IMAGE_WIDTH / displayWidth;
    const nextHeight = displayHeight * scale;
    if (nextHeight <= IMAGE_NODE_MAX_IMAGE_HEIGHT) {
      displayWidth = IMAGE_NODE_MIN_IMAGE_WIDTH;
      displayHeight = nextHeight;
    }
  }

  return {
    width: Math.round(displayWidth),
    height: Math.round(displayHeight),
  };
}

export function UpscaleNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);
  const isOnlySelected = selected && selectedNodeCount === 1;
  const connectedInputSignature = useStore((state) => {
    const inputEdge = state.edges.find((edge) => edge.target === id);
    if (!inputEdge) return null;
    const sourceNode = state.nodes.find((node) => node.id === inputEdge.source);
    const imageUrl = getCurrentImage(sourceNode?.data);
    if (!imageUrl) return null;
    const width = getNodeWidth(sourceNode?.data) || 1024;
    const height = getNodeHeight(sourceNode?.data) || 1024;
    return JSON.stringify({ imageUrl, width, height });
  });
  const { setNodes } = useReactFlow();
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [resultNaturalSize, setResultNaturalSize] = useState<{
    imageUrl: string;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const nodeData = useMemo(() => {
    const d = data as unknown as UpscaleNodeData;
    return {
      inputImage: d.inputImage || '',
      outputImage: d.outputImage || '',
      width: d.width || 1024,
      height: d.height || 1024,
      status: d.status || 'idle',
      progress: d.progress || 0,
      error: d.error || '',
      engine: d.engine || 'magnific_precision_v2',
      scale: d.scale || 2,
      mode: d.mode || 'preserve',
      fidelity: d.fidelity ?? 0,
      sharpness: d.sharpness ?? 7,
      denoise: d.denoise ?? 0,
      detail: d.detail ?? 30,
      materialDetail: d.materialDetail ?? 7,
      compressionRepair: d.compressionRepair ?? 0,
      history: d.history || [],
      tlModel: d.tlModel || 'general',
      tlScale: d.tlScale || 4,
      mcUpscale: d.mcUpscale || '2x',
      mcOptimized: d.mcOptimized || 'standard',
      mcCreativity: d.mcCreativity ?? 0,
      mcDetail: d.mcDetail ?? 0,
      mcSimilarity: d.mcSimilarity ?? 0,
      mcPromptStr: d.mcPromptStr ?? 0,
      mpUpscale: d.mpUpscale || '2x',
      mpSharpen: d.mpSharpen ?? 7,
      mpGrain: d.mpGrain ?? 7,
      mpUltra: d.mpUltra ?? 30,
    };
  }, [data]);

  const connectedInput = useMemo(() => {
    if (!connectedInputSignature) return null;
    try {
      const parsed = JSON.parse(connectedInputSignature) as {
        imageUrl?: string;
        width?: number;
        height?: number;
      };
      if (!parsed.imageUrl) return null;
      return {
        imageUrl: parsed.imageUrl,
        width: Number(parsed.width) || 1024,
        height: Number(parsed.height) || 1024,
      };
    } catch {
      return null;
    }
  }, [connectedInputSignature]);

  useEffect(() => {
    if (!connectedInput) return;

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== id) return node;
        const currentData = node.data as Partial<UpscaleNodeData>;
        if (currentData.inputImage === connectedInput.imageUrl) return node;

        return {
          ...node,
          data: {
            ...node.data,
            inputImage: connectedInput.imageUrl,
            image: connectedInput.imageUrl,
            outputImage: undefined,
            currentImage: undefined,
            width: connectedInput.width,
            height: connectedInput.height,
            status: 'idle',
            progress: 0,
            error: undefined,
          },
        };
      }),
    );
  }, [connectedInput, id, setNodes]);

  const isResultMode = nodeData.status === 'success' && !!nodeData.outputImage;
  const isProcessing = !isResultMode;

  const displayImage = nodeData.outputImage || nodeData.inputImage;
  const loadedResultSize = resultNaturalSize?.imageUrl === nodeData.outputImage ? resultNaturalSize : null;
  const sourceWidth = isResultMode ? loadedResultSize?.width || nodeData.width || 1 : nodeData.width || 1;
  const sourceHeight = isResultMode ? loadedResultSize?.height || nodeData.height || 1 : nodeData.height || 1;
  const processingSize = resolveImageNodeSize({
    hasImage: Boolean(displayImage),
    sourceWidth,
    sourceHeight,
  });
  const resultSize = resolveResultImageSize(sourceWidth, sourceHeight);
  const cardWidth = isResultMode ? resultSize.width : processingSize.cardWidth;
  const cardHeight = isResultMode
    ? resultSize.height
    : displayImage
      ? processingSize.cardHeight
      : IMAGE_NODE_EMPTY_HEIGHT;

  const handleParamChange = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const nextEngine = (patch.engine as string | undefined) ?? dataEngineToUi(nodeData.engine);
          const dataEngine = uiEngineToData(nextEngine);
          const nextData: Record<string, unknown> = { ...n.data, ...patch, engine: dataEngine };
          if (dataEngine === 'topazlabs') {
            nextData.scale = (patch.tlScale as number) || nodeData.tlScale;
            nextData.mode = getModeFromParams(nextData as unknown as UpscaleNodeData);
          } else if (dataEngine === 'magnific_creative') {
            nextData.scale = (patch.mcUpscale as string) === '4x' ? 4 : 2;
            nextData.mode = getModeFromParams(nextData as unknown as UpscaleNodeData);
            nextData.fidelity = patch.mcSimilarity !== undefined ? (patch.mcSimilarity as number) : nodeData.mcSimilarity;
            nextData.detail = patch.mcDetail !== undefined ? (patch.mcDetail as number) : nodeData.mcDetail;
            nextData.denoise = patch.mcCreativity !== undefined ? (patch.mcCreativity as number) : nodeData.mcCreativity;
            nextData.materialDetail = patch.mcPromptStr !== undefined ? (patch.mcPromptStr as number) : nodeData.mcPromptStr;
          } else {
            nextData.scale = (patch.mpUpscale as string) === '4x' ? 4 : 2;
            nextData.mode = 'preserve';
            nextData.sharpness = patch.mpSharpen !== undefined ? (patch.mpSharpen as number) : nodeData.mpSharpen;
            nextData.detail = patch.mpUltra !== undefined ? (patch.mpUltra as number) : nodeData.mpUltra;
            nextData.materialDetail = patch.mpGrain !== undefined ? (patch.mpGrain as number) : nodeData.mpGrain;
          }
          return { ...n, data: nextData };
        }),
      );
    },
    [id, nodeData, setNodes],
  );

  const handleGenerate = useCallback(async () => {
    if (!nodeData.inputImage) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const task = createUpscaleTask({
      sourceNodeId: id,
      engine: nodeData.engine,
      scale: nodeData.scale,
      mode: nodeData.mode,
    });

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                status: 'running',
                progress: 0,
                error: undefined,
              },
            }
          : n,
      ),
    );

    try {
      const result = await simulateUpscale(
        {
          sourceNodeId: id,
          engine: nodeData.engine,
          scale: nodeData.scale,
          mode: nodeData.mode,
        },
        {
          onProgress: (p) => {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        progress: p,
                      },
                    }
                  : n,
              ),
            );
          },
        },
        controller.signal,
      );

      const historyItem: UpscaleHistoryItem = {
        id: task.taskId,
        image: result.imageUrl,
        createdAt: Date.now(),
        engine: nodeData.engine,
        scale: nodeData.scale,
        mode: nodeData.mode,
      };

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: 'success',
                  progress: 100,
                  image: result.imageUrl,
                  currentImage: result.imageUrl,
                  outputImage: result.imageUrl,
                  width: result.width,
                  height: result.height,
                  history: [...(((n.data as Partial<UpscaleNodeData>).history as UpscaleHistoryItem[] | undefined) || []), historyItem],
                },
              }
            : n,
        ),
      );
    } catch (err) {
      if (controller.signal.aborted) return;
      const errorMessage = err instanceof Error ? err.message : 'Detail enhancement failed';
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  status: 'failed',
                  error: errorMessage,
                },
              }
            : n,
        ),
      );
    }
  }, [id, nodeData, setNodes]);

  const handleUpscaleAgain = useCallback(() => {
    if (!nodeData.outputImage) return;
    const onCreateUpscaleNode = (data as unknown as UpscaleNodeData).onCreateUpscaleNode;
    if (!onCreateUpscaleNode) return;
    onCreateUpscaleNode(id, nodeData.outputImage, nodeData.width, nodeData.height);
  }, [id, nodeData, data]);

  const handleDelete = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
  }, [id, setNodes]);

  const handleDownload = useCallback(() => {
    if (!nodeData.outputImage) return;
    const link = document.createElement('a');
    link.href = nodeData.outputImage;
    link.download = `upscale-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [nodeData]);

  const params = useMemo(
    () => ({
      engine: dataEngineToUi(nodeData.engine),
      tlModel: nodeData.tlModel,
      tlScale: nodeData.tlScale,
      mcUpscale: nodeData.mcUpscale,
      mcOptimized: nodeData.mcOptimized,
      mcCreativity: nodeData.mcCreativity,
      mcDetail: nodeData.mcDetail,
      mcSimilarity: nodeData.mcSimilarity,
      mcPromptStr: nodeData.mcPromptStr,
      mpUpscale: nodeData.mpUpscale,
      mpSharpen: nodeData.mpSharpen,
      mpGrain: nodeData.mpGrain,
      mpUltra: nodeData.mpUltra,
    }),
    [nodeData],
  );

  const canGenerate = Boolean(nodeData.inputImage) && nodeData.status !== 'running';

  return (
    <div className="relative group/upscale" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {/* Result toolbar — shown above title when success and node is selected */}
      {isResultMode && isOnlySelected && (
        <div
          className="absolute z-20 flex justify-center"
          style={{
            top: -80 / zoom,
            left: cardWidth / 2,
            transform: `translateX(-50%) scale(${inverseScale})`,
            transformOrigin: 'top center',
          }}
        >
          <UpscaleResultToolbar
            onPreview={() => setShowPreview(true)}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onUpscaleAgain={handleUpscaleAgain}
          />
        </div>
      )}

      {/* Title label */}
      <div className="absolute z-20" style={{ top: -20 / zoom, left: 0, width: cardWidth * zoom, transform: `scale(${inverseScale})`, transformOrigin: 'top left' }}>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <Sparkles className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{(data.label as string) || t('canvas.nodeLabels.upscale')}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative" style={{ width: cardWidth }}>
        {isResultMode ? (
          <div
            className="node-preview-card w-full rounded-[24px] transition-all overflow-hidden"
            style={{
              width: cardWidth,
              height: cardHeight,
              background: 'transparent',
              borderRadius: CANVAS_NODE_CARD_RADIUS,
              outline: selected ? `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid ${CANVAS_NODE_CARD_SELECTED_BORDER_COLOR}` : `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid transparent`,
              outlineOffset: 0,
              boxShadow: 'none',
            }}
          >
            <img
              src={nodeData.outputImage}
              alt=""
              className="block h-full w-full"
              style={{ objectFit: 'fill' }}
              draggable={false}
              onLoad={(event) => {
                const { naturalWidth, naturalHeight } = event.currentTarget;
                if (naturalWidth <= 0 || naturalHeight <= 0) return;
                setResultNaturalSize((current) => {
                  if (
                    current?.imageUrl === nodeData.outputImage &&
                    current.width === naturalWidth &&
                    current.height === naturalHeight
                  ) {
                    return current;
                  }
                  return {
                    imageUrl: nodeData.outputImage,
                    width: naturalWidth,
                    height: naturalHeight,
                  };
                });
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setShowPreview(true);
              }}
            />
          </div>
        ) : (
          <div
            className="node-preview-card w-full rounded-[24px] flex items-center justify-center transition-all overflow-hidden"
            style={{
              width: cardWidth,
              height: cardHeight,
              background: CANVAS_NODE_CARD_BACKGROUND,
              border: `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid ${selected ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : CANVAS_NODE_CARD_BORDER_COLOR}`,
              borderRadius: CANVAS_NODE_CARD_RADIUS,
              boxShadow: 'none',
              boxSizing: 'border-box',
            }}
          >
            {displayImage ? (
              <div className="relative w-full h-full">
                <img
                  src={displayImage}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                  }}
                />
                {isProcessing && nodeData.status === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.35)' }}>
                    <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {t('upscale.waiting')}
                    </span>
                  </div>
                )}
                {nodeData.status === 'running' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ background: 'rgba(0,0,0,0.5)' }}>
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#00d4ff' }} />
                    <span className="text-sm font-medium" style={{ color: '#00d4ff' }}>
                      {nodeData.progress}%
                    </span>
                  </div>
                )}
                {nodeData.status === 'failed' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(0,0,0,0.55)' }}>
                    <AlertCircle className="w-5 h-5" style={{ color: '#ef4444' }} />
                    <span className="text-xs font-medium px-3 text-center" style={{ color: '#ef4444' }}>
                      {nodeData.error || t('upscale.failed')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {t('imageNode.connectImageToEnhance', { defaultValue: '连接图片后增强细节' })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Left visual handle — Input */}
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

        {/* React Flow handles */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />
      </div>

      {/* Param panel — shown only in processing state */}
      {isProcessing && selected && selectedNodeCount === 1 && (
        <div
          className="absolute"
          style={{
            left: -(320 - cardWidth) / 2,
            top: cardHeight + 12 / zoom,
            width: 320,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top center',
            zIndex: 20,
          }}
        >
          <UpscaleParamPanel
            params={params}
            onChange={handleParamChange}
            onGenerate={handleGenerate}
            status={nodeData.status}
            progress={nodeData.progress}
            canGenerate={canGenerate}
          />
        </div>
      )}

      {/* Fullscreen preview modal */}
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
