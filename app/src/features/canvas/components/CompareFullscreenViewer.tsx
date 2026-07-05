import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FullscreenCloseButton } from './FullscreenCloseButton';
import { CompareModeSwitcher } from './CompareModeSwitcher';
import { useFullscreenEscape } from '../hooks/useFullscreenEscape';
import { stopFullscreenInteraction } from '../utils/canvasEvents';
import type { CompareMode } from '../types/canvas.types';

type FullscreenCompareImage = {
  imageUrl: string;
  label: string;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type ViewState = {
  zoom: number;
  panX: number;
  panY: number;
};

const DEFAULT_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };

function ViewerImage({ image, transformStyle }: { image: FullscreenCompareImage; transformStyle: CSSProperties }) {
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden bg-black/25">
      {failed ? (
        <div className="flex flex-col items-center gap-2 text-sm text-white/45">
          <X className="h-5 w-5" />
          <span>{t('compare.imageLoadFailed')}</span>
        </div>
      ) : (
        <img
          src={image.imageUrl}
          alt={image.label}
          className="block h-full w-full object-contain"
          style={transformStyle}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export function CompareFullscreenViewer({
  leftImage,
  rightImage,
  mode,
  sliderPosition,
  overlayOpacity,
  onModeChange,
  onSliderChange,
  onOverlayOpacityChange,
  onClose,
}: {
  leftImage: FullscreenCompareImage;
  rightImage: FullscreenCompareImage;
  mode: CompareMode;
  sliderPosition: number;
  overlayOpacity: number;
  onModeChange: (mode: CompareMode) => void;
  onSliderChange: (value: number) => void;
  onOverlayOpacityChange: (value: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sliderAreaRef = useRef<HTMLDivElement>(null);
  const viewerAreaRef = useRef<HTMLDivElement>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const ignoreNextSliderClickRef = useRef(false);
  const [leftFailed, setLeftFailed] = useState(false);
  const [rightFailed, setRightFailed] = useState(false);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [view, setView] = useState<ViewState>(DEFAULT_VIEW);

  useFullscreenEscape(true, onClose);

  const updateSlider = useCallback((clientX: number) => {
    const rect = sliderAreaRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    onSliderChange(Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100));
  }, [onSliderChange]);

  const handleSliderPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    updateSlider(event.clientX);
    setIsSliderDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [updateSlider]);

  const handleSliderPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSliderDragging) return;
    event.preventDefault();
    event.stopPropagation();
    updateSlider(event.clientX);
  }, [isSliderDragging, updateSlider]);

  const handleSliderPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSliderDragging) return;
    event.preventDefault();
    event.stopPropagation();
    setIsSliderDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, [isSliderDragging]);

  const resetView = useCallback(() => {
    panDragRef.current = null;
    setIsPanning(false);
    setView(DEFAULT_VIEW);
  }, []);

  const handleFullscreenWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const rect = viewerAreaRef.current?.getBoundingClientRect();
    if (!rect) return;

    const normalizedDeltaY = event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * 800
        : event.deltaY;
    const isMouseWheel = Math.abs(normalizedDeltaY) >= 50;
    const zoomSpeed = isMouseWheel ? 0.1 : 0.01;
    const rawFactor = Math.exp(-normalizedDeltaY * zoomSpeed);
    const factor = Math.min(1.08, Math.max(0.92, rawFactor));

    setView((current) => {
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.zoom * factor));
      if (Math.abs(nextZoom - MIN_ZOOM) < 0.001) return DEFAULT_VIEW;
      if (Math.abs(nextZoom - current.zoom) < 0.001) return current;

      const mouseX = event.clientX - (rect.left + rect.width / 2);
      const mouseY = event.clientY - (rect.top + rect.height / 2);
      const zoomRatio = nextZoom / current.zoom;
      return {
        zoom: nextZoom,
        panX: mouseX - (mouseX - current.panX) * zoomRatio,
        panY: mouseY - (mouseY - current.panY) * zoomRatio,
      };
    });
  }, []);

  const handlePanPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (view.zoom <= MIN_ZOOM || event.button !== 0) return;
    event.preventDefault();
    panDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: view.panX,
      originY: view.panY,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  }, [view]);

  const handlePanPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true;
    setView((current) => ({
      ...current,
      panX: drag.originX + deltaX,
      panY: drag.originY + deltaY,
    }));
  }, []);

  const handlePanPointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    ignoreNextSliderClickRef.current = drag.moved;
    if (drag.moved) {
      window.setTimeout(() => {
        ignoreNextSliderClickRef.current = false;
      }, 0);
    }
    panDragRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const imageTransformStyle: CSSProperties = {
    transform: `translate3d(${view.panX}px, ${view.panY}px, 0) scale(${view.zoom})`,
    transformOrigin: 'center center',
    willChange: view.zoom > MIN_ZOOM ? 'transform' : undefined,
  };

  return createPortal(
    <div
      data-canvas-escape-layer="true"
      className="fixed inset-0 z-[400] bg-black/85 p-5 backdrop-blur-sm"
      onPointerDown={(event) => {
        stopFullscreenInteraction(event);
        if (event.target === event.currentTarget) onClose();
      }}
      onPointerMove={stopFullscreenInteraction}
      onPointerUp={stopFullscreenInteraction}
      onMouseDown={stopFullscreenInteraction}
      onTouchStart={stopFullscreenInteraction}
      onTouchMove={stopFullscreenInteraction}
      onTouchEnd={stopFullscreenInteraction}
      onWheelCapture={handleFullscreenWheel}
    >
      <FullscreenCloseButton onClose={onClose} transparent />
      <div className="absolute left-1/2 top-5 z-[490] flex -translate-x-1/2 items-center gap-2">
        <CompareModeSwitcher mode={mode} onModeChange={onModeChange} variant="fullscreen" />
        <button
          type="button"
          className="nodrag nopan flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30 text-white/55 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white disabled:cursor-default disabled:opacity-30"
          disabled={view.zoom === MIN_ZOOM && view.panX === 0 && view.panY === 0}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            resetView();
          }}
          aria-label="重置视图"
          title="重置视图"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={viewerAreaRef}
        className="relative mx-auto h-full w-full max-w-[1500px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0e]"
        style={{ cursor: view.zoom > MIN_ZOOM ? (isPanning ? 'grabbing' : 'grab') : 'default' }}
        onPointerDown={handlePanPointerDown}
        onPointerMove={handlePanPointerMove}
        onPointerUp={handlePanPointerEnd}
        onPointerCancel={handlePanPointerEnd}
      >
        {mode === 'sideBySide' && (
          <div className="flex h-full w-full min-h-0 gap-px">
            <ViewerImage image={leftImage} transformStyle={imageTransformStyle} />
            <ViewerImage image={rightImage} transformStyle={imageTransformStyle} />
          </div>
        )}

        {mode === 'slider' && (
          <div
            ref={sliderAreaRef}
            className="relative h-full w-full overflow-hidden"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (ignoreNextSliderClickRef.current) {
                ignoreNextSliderClickRef.current = false;
                return;
              }
              updateSlider(event.clientX);
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSliderChange(50);
            }}
          >
            {leftFailed ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
            ) : (
              <img src={leftImage.imageUrl} alt={leftImage.label} className="absolute inset-0 block h-full w-full object-contain" style={imageTransformStyle} draggable={false} onError={() => setLeftFailed(true)} />
            )}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
              {rightFailed ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
              ) : (
                <img src={rightImage.imageUrl} alt={rightImage.label} className="absolute inset-0 block h-full w-full object-contain" style={imageTransformStyle} draggable={false} onError={() => setRightFailed(true)} />
              )}
            </div>
            {sliderPosition > 1 && sliderPosition < 99 && (
              <div
                className="pointer-events-none absolute inset-y-0 w-px"
                style={{
                  left: `${sliderPosition}%`,
                  background: isSliderHovered || isSliderDragging
                    ? 'rgba(255,255,255,0.96)'
                    : 'rgba(255,255,255,0.72)',
                }}
              />
            )}
            <div
              className="absolute inset-y-0 z-10 w-6 -translate-x-1/2"
              style={{ left: `${sliderPosition}%`, cursor: 'ew-resize' }}
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
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-black/50 px-2.5 py-1 text-xs text-white/75">{sliderPosition}%</div>
          </div>
        )}

        {mode === 'overlay' && (
          <div className="relative h-full w-full overflow-hidden">
            <img
              src={leftImage.imageUrl}
              alt={leftImage.label}
              className="absolute inset-0 block h-full w-full object-contain"
              style={{ ...imageTransformStyle, opacity: overlayOpacity === 100 ? 0 : 1 }}
              draggable={false}
            />
            <img
              src={rightImage.imageUrl}
              alt={rightImage.label}
              className="absolute inset-0 block h-full w-full object-contain"
              style={{ ...imageTransformStyle, opacity: overlayOpacity / 100 }}
              draggable={false}
            />
            <div
              className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-white/10 bg-black/50 px-3 py-2 backdrop-blur-sm"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <input
                type="range"
                min={0}
                max={100}
                value={overlayOpacity}
                onChange={(event) => onOverlayOpacityChange(Number(event.target.value))}
                className="h-1 w-32 cursor-ew-resize"
                style={{ accentColor: '#8F929C' }}
                aria-label={`${overlayOpacity}%`}
              />
              <span className="w-8 text-right text-xs text-white/75">{overlayOpacity}%</span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
