import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useStore, useReactFlow, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Columns2, Maximize2, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveNodeImage } from '../utils/resolveNodeImage';
import { ImageToolbar } from '../components/ImageToolbar';
import { CompareFullscreenViewer } from '../components/CompareFullscreenViewer';
import { CompareModeSwitcher } from '../components/CompareModeSwitcher';
import { getCompareEdgesBySlot } from '../utils/compareSlots';
import type { CompareMode } from '../types/canvas.types';
import {
  CANVAS_NODE_CARD_BACKGROUND,
  CANVAS_NODE_CARD_BORDER_COLOR,
  CANVAS_NODE_CARD_BORDER_WIDTH,
  CANVAS_NODE_CARD_RADIUS,
  CANVAS_NODE_CARD_SELECTED_BORDER_COLOR,
} from '../constants/canvasConstants';

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
  overlayOpacity: number;
  mode: CompareMode;
  previewSide: PreviewSide;
  width: number | string;
  height: number | string;
  emptyContent: React.ReactNode;
  singleContent: React.ReactNode;
  onSliderChange: (value: number) => void;
  onOverlayOpacityChange: (value: number) => void;
}

type PreviewSide = 'left' | 'right' | null;

function stopNodeControlEvent(event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function stopNodeControlPropagation(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function preventNodeContextMenu(event: React.MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

const DEFAULT_COMPARE_RATIO = 16 / 9;
const CLOSE_RATIO_THRESHOLD = 0.15;
const CARD_PADDING_X = 24;
const BASE_IMAGE_WIDTH = 400;
const BASE_IMAGE_HEIGHT = 260;
const IMAGE_WIDTH_ADJUSTMENT = 20;
const IMAGE_HEIGHT_ADJUSTMENT = 20;

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
  const safeAspectRatio = clamp(aspectRatio, 0.5, 2.5);
  const landscapeWeight = clamp((safeAspectRatio - 1) / 0.75, 0, 1);
  const portraitWeight = clamp((1 - safeAspectRatio) / 0.5, 0, 1);
  const imageAreaWidth = Math.round(
    BASE_IMAGE_WIDTH
      + IMAGE_WIDTH_ADJUSTMENT * landscapeWeight
      - IMAGE_WIDTH_ADJUSTMENT * portraitWeight,
  );
  const imageAreaHeight = Math.round(
    BASE_IMAGE_HEIGHT
      - IMAGE_HEIGHT_ADJUSTMENT / 2 * landscapeWeight
      + IMAGE_HEIGHT_ADJUSTMENT * portraitWeight,
  );
  const nodeWidth = imageAreaWidth + CARD_PADDING_X;

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
  overlayOpacity,
  mode,
  previewSide,
  width,
  height,
  emptyContent,
  singleContent,
  onSliderChange,
  onOverlayOpacityChange,
}: CompareImageAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
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
      className="relative isolate overflow-hidden"
      style={{
        width,
        height,
        boxSizing: 'border-box',
        cursor: 'default',
        background: CANVAS_NODE_CARD_BACKGROUND,
      }}
    >
      {!leftImage && !rightImage && emptyContent}

      {(leftImage || rightImage) && !(leftImage && rightImage) && singleContent}

      {hasBothImages && leftImage && rightImage && previewSide && (
        <img
          src={(previewSide === 'left' ? leftImage : rightImage).imageUrl}
          alt=""
          className="absolute inset-0 block h-full w-full"
          style={{ objectFit: 'contain', objectPosition: 'center center' }}
          draggable={false}
        />
      )}

      {hasBothImages && leftImage && rightImage && !previewSide && mode === 'sideBySide' && (
        <div className="absolute inset-0 grid grid-cols-2 gap-px">
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <img
              src={leftImage.imageUrl}
              alt=""
              className="absolute inset-0 block h-full w-full"
              style={{ objectFit: 'contain', objectPosition: 'center center' }}
              draggable={false}
            />
          </div>
          <div className="relative min-h-0 min-w-0 overflow-hidden">
            <img
              src={rightImage.imageUrl}
              alt=""
              className="absolute inset-0 block h-full w-full"
              style={{ objectFit: 'contain', objectPosition: 'center center' }}
              draggable={false}
            />
          </div>
        </div>
      )}

      {hasBothImages && leftImage && rightImage && !previewSide && mode === 'slider' && (
        <div
          className="nodrag nowheel absolute inset-0"
          onPointerDown={stopNodeControlPropagation}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            updateSlider(event.clientX);
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onSliderChange(50);
          }}
        >
          <img
            src={leftImage.imageUrl}
            alt=""
            className="absolute inset-0 block h-full w-full"
            style={{ objectFit: 'contain', objectPosition: 'center center' }}
            draggable={false}
          />
          <div
            className="absolute inset-0 h-full w-full"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={rightImage.imageUrl}
              alt=""
              className="absolute inset-0 block h-full w-full"
              style={{ objectFit: 'contain', objectPosition: 'center center' }}
              draggable={false}
            />
          </div>
          <div
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{
              left: `${sliderPosition}%`,
              background: isDragging || isSliderHovered
                ? 'rgba(255,255,255,0.96)'
                : 'rgba(255,255,255,0.72)',
            }}
          />
          <div
            className="nodrag nowheel absolute top-0 bottom-0 z-10 w-8 -translate-x-1/2"
            style={{
              left: `${sliderPosition}%`,
              cursor: 'ew-resize',
            }}
            onPointerEnter={() => setIsSliderHovered(true)}
            onPointerLeave={() => setIsSliderHovered(false)}
            onPointerDown={handleSliderPointerDown}
            onPointerMove={handleSliderPointerMove}
            onPointerUp={handleSliderPointerEnd}
            onPointerCancel={handleSliderPointerEnd}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSliderChange(50);
            }}
          />
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
        </div>
      )}

      {hasBothImages && leftImage && rightImage && !previewSide && mode === 'overlay' && (
        <>
          <img
            src={leftImage.imageUrl}
            alt=""
            className="absolute inset-0 block h-full w-full"
            style={{
              objectFit: 'contain',
              objectPosition: 'center center',
              opacity: overlayOpacity === 100 ? 0 : 1,
            }}
            draggable={false}
          />
          <img
            src={rightImage.imageUrl}
            alt=""
            className="absolute inset-0 block h-full w-full"
            style={{ objectFit: 'contain', objectPosition: 'center center', opacity: overlayOpacity / 100 }}
            draggable={false}
          />
          <div
            className="nodrag nopan nowheel absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(20,20,26,0.76)', border: '1px solid rgba(255,255,255,0.08)' }}
            onPointerDown={stopNodeControlPropagation}
            onPointerMove={stopNodeControlPropagation}
            onPointerUp={stopNodeControlPropagation}
            onMouseDown={stopNodeControlPropagation}
            onClick={stopNodeControlPropagation}
          >
            <input
              type="range"
              min={0}
              max={100}
              value={overlayOpacity}
              onChange={(event) => onOverlayOpacityChange(Number(event.target.value))}
              className="nodrag nopan nowheel h-1 w-20 cursor-ew-resize"
              style={{ accentColor: '#8F929C' }}
              onPointerDown={stopNodeControlPropagation}
              onPointerMove={stopNodeControlPropagation}
              onPointerUp={stopNodeControlPropagation}
              aria-label={`${overlayOpacity}%`}
            />
            <span className="w-8 text-right text-[11px] text-white/75">{overlayOpacity}%</span>
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
  const [overlayOpacity, setOverlayOpacity] = useState<number>((data.overlayOpacity as number) ?? 50);
  const [compareMode, setCompareMode] = useState<CompareMode>(
    data.compareMode === 'sideBySide' || data.compareMode === 'overlay' ? data.compareMode : 'slider',
  );
  const [previewSide, setPreviewSide] = useState<PreviewSide>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const inputEdgesBySlot = useMemo(() => getCompareEdgesBySlot(allEdges, id), [allEdges, id]);
  const connectedImages = useMemo(
    () => {
      const resolveEdgeImage = (edge: (typeof allEdges)[number] | undefined): ConnectedImage | null => {
        if (!edge) return null;
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
      };
      return {
        left: resolveEdgeImage(inputEdgesBySlot.left),
        right: resolveEdgeImage(inputEdgesBySlot.right),
      };
    },
    [allNodes, inputEdgesBySlot],
  );

  const leftImage = connectedImages.left;
  const rightImage = connectedImages.right;
  const singleImage = leftImage || rightImage;
  const hasBothImages = Boolean(leftImage && rightImage);
  const displayBalance = compareMode === 'overlay'
    ? overlayOpacity
    : compareMode === 'sideBySide'
      ? 50
      : sliderPosition;
  const isLeftPrimary = previewSide === 'left' || (!previewSide && displayBalance <= 35);
  const isRightPrimary = previewSide === 'right' || (!previewSide && displayBalance >= 65);
  const leftDotOpacity = isLeftPrimary ? 1 : isRightPrimary ? 0.3 : 0.65;
  const rightDotOpacity = isRightPrimary ? 1 : isLeftPrimary ? 0.3 : 0.65;
  const leftDotColor = isLeftPrimary ? '#4298e8' : isRightPrimary ? '#747b82' : '#6f94b8';
  const rightDotColor = isRightPrimary ? '#e38a45' : isLeftPrimary ? '#827870' : '#b88a68';
  const leftLabelColor = isLeftPrimary
    ? 'rgba(255,255,255,0.88)'
    : isRightPrimary
      ? 'rgba(255,255,255,0.38)'
      : 'rgba(255,255,255,0.58)';
  const rightLabelColor = isRightPrimary
    ? 'rgba(255,255,255,0.88)'
    : isLeftPrimary
      ? 'rgba(255,255,255,0.38)'
      : 'rgba(255,255,255,0.58)';
  const leftFileColor = isLeftPrimary
    ? 'rgba(255,255,255,0.52)'
    : isRightPrimary
      ? 'rgba(255,255,255,0.33)'
      : 'rgba(255,255,255,0.45)';
  const rightFileColor = isRightPrimary
    ? 'rgba(255,255,255,0.52)'
    : isLeftPrimary
      ? 'rgba(255,255,255,0.33)'
      : 'rgba(255,255,255,0.45)';
  const nodeTitle = (data.label as string) || t('canvas.nodeLabels.compare');
  const compareSize = useMemo(
    () => getCompareSize(getCompareAspectRatio(leftImage, rightImage)),
    [leftImage, rightImage],
  );
  const { imageAreaWidth, imageAreaHeight, nodeWidth } = compareSize;
  const removeReferenceEdge = data.onRemoveReferenceEdge as ((targetNodeId: string, sourceNodeId: string) => void) | undefined;

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, imageAreaHeight, nodeWidth, updateNodeInternals]);

  useEffect(() => {
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, sliderPosition, overlayOpacity, compareMode } } : node,
      ),
    );
  }, [compareMode, overlayOpacity, sliderPosition, id, setNodes]);

  const handleModeChange = useCallback((nextMode: CompareMode) => {
    if (nextMode === compareMode) return;
    setPreviewSide(null);
    if (nextMode === 'slider') setSliderPosition(50);
    if (nextMode === 'overlay') setOverlayOpacity(50);
    setCompareMode(nextMode);
  }, [compareMode]);

  const handleDeleteNode = useCallback(() => {
    const onDeleteNode = data.onDeleteNode as ((nodeId: string) => void) | undefined;
    onDeleteNode?.(id);
  }, [data, id]);

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

  const renderEmptyState = () => (
    <div className="absolute inset-0 grid grid-cols-2 gap-2 p-3">
      {[0, 1].map((slotIndex) => (
        <div
          key={slotIndex}
          className="flex flex-col items-center justify-center gap-2 rounded-[18px] border border-dashed"
          style={{
            background: 'rgba(255,255,255,0.025)',
            borderColor: 'rgba(255,255,255,0.14)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/55">
            <Columns2 className="h-4 w-4" />
          </span>
        </div>
      ))}
    </div>
  );

  const renderSingleState = () => (
    <div className="absolute inset-0">
      {singleImage && (
        <img
          src={singleImage.imageUrl}
          alt=""
          className="absolute inset-0 block h-full w-full"
          style={{ objectFit: 'contain', objectPosition: 'center center' }}
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

  return (
    <div
      className="relative group/compare"
      style={{ zIndex: selected ? 100 : 1, width: nodeWidth, cursor: 'default' }}
      onContextMenu={preventNodeContextMenu}
    >
      {selected && (
        <div
          className="absolute z-20 flex justify-center"
          style={{
            top: -80 / zoom,
            left: nodeWidth / 2,
            transform: `translateX(-50%) scale(${inverseScale})`,
            transformOrigin: 'top center',
          }}
        >
          <ImageToolbar
            actions={[
              { icon: Maximize2, label: t('imageNode.fullscreen'), action: () => setShowFullscreen(true), disabled: !hasBothImages },
              { icon: Trash2, label: t('common.delete'), action: handleDeleteNode, danger: true },
            ]}
          />
        </div>
      )}
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
          className="node-preview-card w-full overflow-hidden rounded-[24px] transition-all"
          style={{
            width: nodeWidth,
            background: CANVAS_NODE_CARD_BACKGROUND,
            border: `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid ${selected ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : CANVAS_NODE_CARD_BORDER_COLOR}`,
            borderRadius: CANVAS_NODE_CARD_RADIUS,
            boxShadow: 'none',
            boxSizing: 'border-box',
          }}
        >
          <div className="flex justify-center px-3 pt-2">
            <CompareModeSwitcher mode={compareMode} onModeChange={handleModeChange} />
          </div>

          <div className="px-3 pt-2">
            <div
              className="mx-auto"
              style={{ width: imageAreaWidth }}
            >
              <CompareImageArea
                leftImage={leftImage}
                rightImage={rightImage}
                sliderPosition={sliderPosition}
                overlayOpacity={overlayOpacity}
                mode={compareMode}
                previewSide={previewSide}
                width={imageAreaWidth}
                height={imageAreaHeight}
                emptyContent={renderEmptyState()}
                singleContent={renderSingleState()}
                onSliderChange={setSliderPosition}
                onOverlayOpacityChange={setOverlayOpacity}
              />
            </div>
          </div>

          <div className="px-4 pb-3 pt-2">
            {/* Compact source labels row */}
            <div className="flex items-center gap-2 text-[11px]">
              <div
                className="nodrag nowheel flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded transition-colors hover:bg-white/[0.035]"
                style={{ background: isLeftPrimary ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onPointerDown={stopNodeControlEvent}
                onClick={(event) => {
                  stopNodeControlEvent(event);
                  if (hasBothImages && leftImage) setPreviewSide((current) => current === 'left' ? null : 'left');
                }}
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all" style={{ background: leftDotColor, opacity: leftDotOpacity }} />
                <span className="flex-shrink-0 transition-colors" style={{ color: leftLabelColor }}>{t('compare.left')}:</span>
                <span className="min-w-0 truncate transition-colors" style={{ color: leftFileColor }}>{leftImage?.label || '-'}</span>
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
              <div
                className="nodrag nowheel flex min-w-0 flex-1 cursor-pointer items-center gap-1 rounded transition-colors hover:bg-white/[0.035]"
                style={{ background: isRightPrimary ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                onPointerDown={stopNodeControlEvent}
                onClick={(event) => {
                  stopNodeControlEvent(event);
                  if (hasBothImages && rightImage) setPreviewSide((current) => current === 'right' ? null : 'right');
                }}
              >
                <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full transition-all" style={{ background: rightDotColor, opacity: rightDotOpacity }} />
                <span className="flex-shrink-0 transition-colors" style={{ color: rightLabelColor }}>{t('compare.right')}:</span>
                <span className="min-w-0 truncate transition-colors" style={{ color: rightFileColor }}>{rightImage?.label || '-'}</span>
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
      {showFullscreen && leftImage && rightImage && (
        <CompareFullscreenViewer
          leftImage={leftImage}
          rightImage={rightImage}
          mode={compareMode}
          sliderPosition={sliderPosition}
          overlayOpacity={overlayOpacity}
          onModeChange={handleModeChange}
          onSliderChange={setSliderPosition}
          onOverlayOpacityChange={setOverlayOpacity}
          onClose={() => setShowFullscreen(false)}
        />
      )}
    </div>
  );
}
