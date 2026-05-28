import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useStore, useReactFlow, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { ArrowLeftRight, Columns2, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveNodeImage } from '../utils/resolveNodeImage';

interface ConnectedImage {
  nodeId: string;
  imageUrl: string;
  label: string;
  width?: number;
  height?: number;
}

interface CompareImageAreaProps {
  leftImage: ConnectedImage | null;
  rightImage: ConnectedImage | null;
  sliderPosition: number;
  width: number | string;
  height: number | string;
  emptyContent: React.ReactNode;
  singleContent: React.ReactNode;
  onSliderChange: (value: number) => void;
}

function stopNodeControlEvent(event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function preventNodeContextMenu(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

const DEFAULT_COMPARE_RATIO = 16 / 9;
const CLOSE_RATIO_THRESHOLD = 0.15;
const CARD_PADDING_X = 24;
const MIN_IMAGE_WIDTH = 300;
const MAX_IMAGE_WIDTH = 620;
const MIN_IMAGE_HEIGHT = 220;
const MAX_IMAGE_HEIGHT = 420;
const MIN_NODE_WIDTH = 340;
const MAX_NODE_WIDTH = 680;
const EMPTY_IMAGE_WIDTH = 420;
const SQUARE_IMAGE_SIZE = 420;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getImageRatio(image: ConnectedImage | null) {
  if (!image?.width || !image.height || image.width <= 0 || image.height <= 0) return null;
  return image.width / image.height;
}

function getCompareAspectRatio(leftImage: ConnectedImage | null, rightImage: ConnectedImage | null) {
  const leftRatio = getImageRatio(leftImage);
  const rightRatio = getImageRatio(rightImage);

  if (leftRatio && rightRatio) {
    return Math.abs(leftRatio - rightRatio) < CLOSE_RATIO_THRESHOLD
      ? (leftRatio + rightRatio) / 2
      : leftRatio;
  }

  return leftRatio || rightRatio || DEFAULT_COMPARE_RATIO;
}

function getCompareSize(aspectRatio: number) {
  let imageWidth: number;
  let imageHeight: number;

  if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
    imageWidth = SQUARE_IMAGE_SIZE;
    imageHeight = SQUARE_IMAGE_SIZE;
  } else if (aspectRatio >= 1) {
    imageWidth = MAX_IMAGE_WIDTH;
    imageHeight = imageWidth / aspectRatio;

    if (imageHeight < MIN_IMAGE_HEIGHT) {
      imageHeight = MIN_IMAGE_HEIGHT;
      imageWidth = imageHeight * aspectRatio;
    }
  } else {
    imageHeight = MAX_IMAGE_HEIGHT;
    imageWidth = imageHeight * aspectRatio;

    if (imageWidth < MIN_IMAGE_WIDTH) {
      imageWidth = MIN_IMAGE_WIDTH;
      imageHeight = imageWidth / aspectRatio;
    }
  }

  imageWidth = Math.round(clamp(imageWidth, MIN_IMAGE_WIDTH, MAX_IMAGE_WIDTH));
  imageHeight = Math.round(clamp(imageHeight, MIN_IMAGE_HEIGHT, MAX_IMAGE_HEIGHT));

  const nodeWidth = Math.round(clamp(imageWidth + CARD_PADDING_X, MIN_NODE_WIDTH, MAX_NODE_WIDTH));
  const imageAreaWidth = nodeWidth - CARD_PADDING_X;
  const imageAreaHeight = Math.round(clamp(imageAreaWidth / aspectRatio, MIN_IMAGE_HEIGHT, MAX_IMAGE_HEIGHT));

  return {
    imageAreaWidth,
    imageAreaHeight,
    nodeWidth,
  };
}

function CompareImageArea({
  leftImage,
  rightImage,
  sliderPosition,
  width,
  height,
  emptyContent,
  singleContent,
  onSliderChange,
}: CompareImageAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasBothImages = Boolean(leftImage && rightImage);

  const updateSlider = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width;
      const clamped = Math.max(0, Math.min(1, x));
      onSliderChange(Math.round(clamped * 100));
    },
    [onSliderChange],
  );

  const handleSliderPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!hasBothImages || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      updateSlider(event.clientX);
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [hasBothImages, updateSlider],
  );

  const handleSliderPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      updateSlider(event.clientX);
    },
    [isDragging, updateSlider],
  );

  const handleSliderPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width,
        height,
        cursor: 'default',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
      }}
    >
      {!leftImage && !rightImage && emptyContent}

      {(leftImage || rightImage) && !(leftImage && rightImage) && singleContent}

      {hasBothImages && leftImage && rightImage && (
        <>
          <img
            src={leftImage.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: 'contain' }}
            draggable={false}
          />
          <div
            className="absolute inset-0 h-full w-full"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={rightImage.imageUrl}
              alt=""
              className="h-full w-full"
              style={{ objectFit: 'contain' }}
              draggable={false}
            />
          </div>
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{
              left: `${sliderPosition}%`,
              background: 'rgba(255,255,255,0.82)',
              boxShadow: '0 0 8px rgba(0,0,0,0.42)',
            }}
          />
          <div
            className="nodrag nowheel absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2"
            style={{
              left: `${sliderPosition}%`,
              cursor: isDragging ? 'col-resize' : 'ew-resize',
            }}
            onPointerDown={handleSliderPointerDown}
            onPointerMove={handleSliderPointerMove}
            onPointerUp={handleSliderPointerEnd}
            onPointerCancel={handleSliderPointerEnd}
          >
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{
                background: 'rgba(255,255,255,0.92)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.34)',
              }}
            >
              <ArrowLeftRight className="h-4 w-4" style={{ color: '#111' }} />
            </div>
          </div>
          <div
            className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[12px]"
            style={{
              background: 'rgba(20,20,26,0.72)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.82)',
              boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
            }}
          >
            {sliderPosition}%
          </div>
        </>
      )}
    </div>
  );
}

export function CompareNode({ id, data, selected }: NodeProps) {
  const { t } = useTranslation();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);
  const { setNodes, setEdges } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  const [sliderPosition, setSliderPosition] = useState<number>((data.sliderPosition as number) ?? 50);

  const inputEdges = useMemo(() => allEdges.filter((edge) => edge.target === id), [allEdges, id]);
  const connectedImages: ConnectedImage[] = useMemo(
    () =>
      inputEdges
        .map((edge): ConnectedImage | null => {
          const sourceNode = allNodes.find((node) => node.id === edge.source);
          if (!sourceNode) return null;
          const resolvedImage = resolveNodeImage(sourceNode.data);
          if (!resolvedImage) return null;
          return {
            nodeId: sourceNode.id,
            imageUrl: resolvedImage.imageUrl,
            label: (sourceNode.data?.label as string) || sourceNode.id,
            width: resolvedImage.width,
            height: resolvedImage.height,
          };
        })
        .filter((item): item is ConnectedImage => item !== null)
        .slice(0, 2),
    [allNodes, inputEdges],
  );

  const leftImage = connectedImages[0] || null;
  const rightImage = connectedImages[1] || null;
  const singleImage = leftImage || rightImage;
  const hasBothImages = Boolean(leftImage && rightImage);
  const nodeTitle = (data.label as string) || t('canvas.nodeLabels.compare');
  const compareSize = useMemo(() => {
    if (!leftImage && !rightImage) {
      return {
        imageAreaWidth: EMPTY_IMAGE_WIDTH,
        imageAreaHeight: Math.round(EMPTY_IMAGE_WIDTH / DEFAULT_COMPARE_RATIO),
        nodeWidth: EMPTY_IMAGE_WIDTH + CARD_PADDING_X,
      };
    }

    const aspectRatio = getCompareAspectRatio(leftImage, rightImage);
    return getCompareSize(aspectRatio);
  }, [leftImage, rightImage]);
  const { imageAreaWidth, imageAreaHeight, nodeWidth } = compareSize;
  const removeReferenceEdge = data.onRemoveReferenceEdge as ((targetNodeId: string, sourceNodeId: string) => void) | undefined;
  const swapCompareInputs = data.onSwapCompareInputs as
    | ((targetNodeId: string, leftSourceNodeId: string, rightSourceNodeId: string) => void)
    | undefined;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageAreaHeight, nodeWidth, updateNodeInternals]);

  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, sliderPosition } } : node,
      ),
    );
  }, [sliderPosition, id, setNodes]);

  const handleSwap = useCallback(() => {
    if (!leftImage || !rightImage) return;
    if (swapCompareInputs) {
      swapCompareInputs(id, leftImage.nodeId, rightImage.nodeId);
      return;
    }
    const leftEdge = inputEdges[0];
    const rightEdge = inputEdges[1];
    if (!leftEdge || !rightEdge) return;
    setEdges((edges) =>
      edges.map((edge) => {
        if (edge.id === leftEdge.id) return { ...edge, source: rightEdge.source };
        if (edge.id === rightEdge.id) return { ...edge, source: leftEdge.source };
        return edge;
      }),
    );
  }, [id, inputEdges, leftImage, rightImage, setEdges, swapCompareInputs]);

  const handleReset = useCallback(() => {
    setSliderPosition(50);
  }, []);

  const handleClearLeft = useCallback(() => {
    if (!leftImage) return;
    if (removeReferenceEdge) {
      removeReferenceEdge(id, leftImage.nodeId);
      return;
    }
    setEdges((edges) => edges.filter((edge) => !(edge.target === id && edge.source === leftImage.nodeId)));
  }, [id, leftImage, removeReferenceEdge, setEdges]);

  const handleClearRight = useCallback(() => {
    if (!rightImage) return;
    if (removeReferenceEdge) {
      removeReferenceEdge(id, rightImage.nodeId);
      return;
    }
    setEdges((edges) => edges.filter((edge) => !(edge.target === id && edge.source === rightImage.nodeId)));
  }, [id, removeReferenceEdge, rightImage, setEdges]);

  const renderEmptyState = (compact = false) => (
    <div className="grid h-full w-full grid-cols-2 gap-2 p-3">
      {[t('compare.left'), t('compare.right')].map((label) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
          style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.42)' }}
        >
          <Columns2 className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          <span className="text-xs">{label}</span>
        </div>
      ))}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-5 text-center text-xs"
        style={{ color: 'rgba(255,255,255,0.38)' }}
      >
        {t('compare.connectTwoImages')}
      </div>
    </div>
  );

  const renderSingleState = () => (
    <div className="relative h-full w-full">
      {singleImage && (
        <img
          src={singleImage.imageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-contain"
          draggable={false}
        />
      )}
      <div
        className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg px-3 py-2 text-center text-xs"
        style={{
          background: 'rgba(20,20,26,0.78)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.56)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.25)',
        }}
      >
        <Columns2 className="h-4 w-4 flex-shrink-0" />
        <span className="whitespace-nowrap">{t('compare.connectSecondImage')}</span>
      </div>
    </div>
  );

  const nodeActionButton = (
    icon: React.ReactNode,
    label: string,
    onClick: (event: React.MouseEvent<HTMLButtonElement>) => void,
    disabled = false,
  ) => (
    <button
      type="button"
      onPointerDown={stopNodeControlEvent}
      onClick={(event) => {
        stopNodeControlEvent(event);
        onClick(event);
      }}
      disabled={disabled}
      className="nodrag nowheel flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-30"
      style={{
        color: 'rgba(255,255,255,0.62)',
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div
      className="relative group/compare"
      style={{ zIndex: selected ? 100 : 1, width: nodeWidth, cursor: 'default' }}
      onContextMenu={preventNodeContextMenu}
    >
      <div
        className="absolute z-20"
        style={{
          top: -20 / zoom,
          left: 0,
          width: nodeWidth * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <Columns2 className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{nodeTitle}</span>
        </div>
      </div>

      <div className="relative" style={{ width: nodeWidth }}>
        <div
          className="node-preview-card w-full overflow-hidden rounded-[16px] transition-all"
          style={{
            width: nodeWidth,
            background: '#1a1a1a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          <div className="px-3 pt-3">
            <div
              className="mx-auto overflow-hidden rounded-xl"
              style={{
                width: imageAreaWidth,
                border: '1px solid rgba(255,255,255,0.04)',
              }}
            >
              <CompareImageArea
                leftImage={leftImage}
                rightImage={rightImage}
                sliderPosition={sliderPosition}
                width={imageAreaWidth}
                height={imageAreaHeight}
                emptyContent={renderEmptyState(true)}
                singleContent={renderSingleState()}
                onSliderChange={setSliderPosition}
              />
            </div>
          </div>

          <div className="px-4 pb-3 pt-2">
            {/* Compact source labels row */}
            <div className="flex items-center gap-2 text-[11px]">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('compare.left')}:</span>
                <span className="min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.62)' }}>{leftImage?.label || '-'}</span>
                {leftImage && (
                  <button
                    type="button"
                    onPointerDown={stopNodeControlEvent}
                    onClick={(event) => {
                      stopNodeControlEvent(event);
                      handleClearLeft();
                    }}
                    className="nodrag nowheel flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition hover:bg-white/[0.08] hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.34)' }}
                    title={t('common.remove')}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
              <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.18)' }}>|</span>
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <span className="flex-shrink-0" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('compare.right')}:</span>
                <span className="min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.62)' }}>{rightImage?.label || '-'}</span>
                {rightImage && (
                  <button
                    type="button"
                    onPointerDown={stopNodeControlEvent}
                    onClick={(event) => {
                      stopNodeControlEvent(event);
                      handleClearRight();
                    }}
                    className="nodrag nowheel flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition hover:bg-white/[0.08] hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.34)' }}
                    title={t('common.remove')}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              {nodeActionButton(<ArrowLeftRight className="h-4 w-4" />, t('compare.swap'), () => {
                  handleSwap();
                }, !hasBothImages)}
              {nodeActionButton(<RotateCcw className="h-4 w-4" />, t('compare.reset'), () => {
                  handleReset();
                })}
            </div>
          </div>
        </div>

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
          <Columns2 style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
      </div>
    </div>
  );
}
