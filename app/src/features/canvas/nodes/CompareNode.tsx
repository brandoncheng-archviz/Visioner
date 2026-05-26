import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { ArrowLeftRight, GitCompare, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConnectedImage {
  nodeId: string;
  imageUrl: string;
  label: string;
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

  const handlePointerDown = useCallback(
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

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      updateSlider(event.clientX);
    },
    [isDragging, updateSlider],
  );

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
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
        cursor: hasBothImages ? (isDragging ? 'col-resize' : 'ew-resize') : 'default',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
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
            className="pointer-events-none absolute top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{
              left: `${sliderPosition}%`,
              background: 'rgba(255,255,255,0.92)',
              boxShadow: '0 6px 18px rgba(0,0,0,0.34)',
            }}
          >
            <ArrowLeftRight className="h-4 w-4" style={{ color: '#111' }} />
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

  const [sliderPosition, setSliderPosition] = useState<number>((data.sliderPosition as number) ?? 50);

  const inputEdges = useMemo(() => allEdges.filter((edge) => edge.target === id), [allEdges, id]);
  const connectedImages: ConnectedImage[] = useMemo(
    () =>
      inputEdges
        .map((edge) => {
          const sourceNode = allNodes.find((node) => node.id === edge.source);
          if (!sourceNode) return null;
          const imageUrl = (sourceNode.data?.currentImage || sourceNode.data?.image || sourceNode.data?.inputImage) as string | undefined;
          if (!imageUrl) return null;
          return {
            nodeId: sourceNode.id,
            imageUrl,
            label: (sourceNode.data?.label as string) || sourceNode.id,
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

  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, sliderPosition } } : node,
      ),
    );
  }, [sliderPosition, id, setNodes]);

  const handleSwap = useCallback(() => {
    if (!leftImage || !rightImage) return;
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
  }, [inputEdges, leftImage, rightImage, setEdges]);

  const handleReset = useCallback(() => {
    setSliderPosition(50);
  }, []);

  const handleClearLeft = useCallback(() => {
    if (!leftImage) return;
    setEdges((edges) => edges.filter((edge) => !(edge.target === id && edge.source === leftImage.nodeId)));
  }, [id, leftImage, setEdges]);

  const handleClearRight = useCallback(() => {
    if (!rightImage) return;
    setEdges((edges) => edges.filter((edge) => !(edge.target === id && edge.source === rightImage.nodeId)));
  }, [id, rightImage, setEdges]);

  const renderEmptyState = (compact = false) => (
    <div className="grid h-full w-full grid-cols-2 gap-2 p-3">
      {[t('compare.left'), t('compare.right')].map((label) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
          style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.42)' }}
        >
          <GitCompare className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
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
    <div className="grid h-full w-full grid-cols-2 gap-2 p-3">
      <div className="relative overflow-hidden rounded-xl" style={{ background: 'rgba(0,0,0,0.28)' }}>
        {singleImage && (
          <img
            src={singleImage.imageUrl}
            alt=""
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}
      </div>
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed"
        style={{ borderColor: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.42)' }}
      >
        <GitCompare className="h-5 w-5" />
        <span className="px-4 text-center text-xs leading-5">{t('compare.connectSecondImage')}</span>
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
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-30"
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

  const containerWidth = 560;
  const imageWidth = 536;
  const containerHeight = 326;

  return (
    <div className="relative group/compare" style={{ zIndex: selected ? 100 : 1, width: containerWidth, cursor: 'default' }}>
      <div
        className="absolute z-20"
        style={{
          top: -20 / zoom,
          left: 0,
          width: containerWidth * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <GitCompare className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{nodeTitle}</span>
        </div>
      </div>

      <div className="relative" style={{ width: containerWidth }}>
        <div
          className="node-preview-card w-full overflow-hidden rounded-[16px] transition-all"
          style={{
            width: containerWidth,
            background: '#1a1a1a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          <div className="px-3 pt-3">
            <div className="overflow-hidden rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
              <CompareImageArea
                leftImage={leftImage}
                rightImage={rightImage}
                sliderPosition={sliderPosition}
                width={imageWidth}
                height={containerHeight}
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
                    onClick={(event) => { event.stopPropagation(); handleClearLeft(); }}
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition hover:bg-white/[0.08] hover:text-white"
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
                    onClick={(event) => { event.stopPropagation(); handleClearRight(); }}
                    className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded transition hover:bg-white/[0.08] hover:text-white"
                    style={{ color: 'rgba(255,255,255,0.34)' }}
                    title={t('common.remove')}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              {nodeActionButton(<ArrowLeftRight className="h-4 w-4" />, t('compare.swap'), (event) => {
                  event.stopPropagation();
                  handleSwap();
                }, !hasBothImages)}
              {nodeActionButton(<RotateCcw className="h-4 w-4" />, t('compare.reset'), (event) => {
                  event.stopPropagation();
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
          <GitCompare style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
      </div>
    </div>
  );
}
