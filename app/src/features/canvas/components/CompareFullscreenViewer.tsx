import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FullscreenCloseButton } from './FullscreenCloseButton';
import { CompareModeSwitcher } from './CompareModeSwitcher';
import { useFullscreenEscape } from '../hooks/useFullscreenEscape';
import { blockFullscreenWheel, stopFullscreenInteraction } from '../utils/canvasEvents';
import type { CompareMode } from '../types/canvas.types';

type FullscreenCompareImage = {
  imageUrl: string;
  label: string;
};

function ViewerImage({ image }: { image: FullscreenCompareImage }) {
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
  const [leftFailed, setLeftFailed] = useState(false);
  const [rightFailed, setRightFailed] = useState(false);
  const [isSliderHovered, setIsSliderHovered] = useState(false);
  const [isSliderDragging, setIsSliderDragging] = useState(false);

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
      onWheel={blockFullscreenWheel}
      onWheelCapture={blockFullscreenWheel}
    >
      <FullscreenCloseButton onClose={onClose} transparent />
      <div className="absolute left-1/2 top-5 z-[490] -translate-x-1/2">
        <CompareModeSwitcher mode={mode} onModeChange={onModeChange} variant="fullscreen" />
      </div>

      <div
        className="relative mx-auto h-full w-full max-w-[1500px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0b0b0e]"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {mode === 'sideBySide' && (
          <div className="flex h-full w-full min-h-0 gap-px">
            <ViewerImage image={leftImage} />
            <ViewerImage image={rightImage} />
          </div>
        )}

        {mode === 'slider' && (
          <div
            ref={sliderAreaRef}
            className="relative h-full w-full overflow-hidden"
            onPointerDown={(event) => event.stopPropagation()}
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
            {leftFailed ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
            ) : (
              <img src={leftImage.imageUrl} alt={leftImage.label} className="absolute inset-0 block h-full w-full object-contain" draggable={false} onError={() => setLeftFailed(true)} />
            )}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
              {rightFailed ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
              ) : (
                <img src={rightImage.imageUrl} alt={rightImage.label} className="absolute inset-0 block h-full w-full object-contain" draggable={false} onError={() => setRightFailed(true)} />
              )}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 w-px"
              style={{
                left: `${sliderPosition}%`,
                background: isSliderHovered || isSliderDragging
                  ? 'rgba(255,255,255,0.96)'
                  : 'rgba(255,255,255,0.72)',
              }}
            />
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
              style={{ opacity: overlayOpacity === 100 ? 0 : 1 }}
              draggable={false}
            />
            <img
              src={rightImage.imageUrl}
              alt={rightImage.label}
              className="absolute inset-0 block h-full w-full object-contain"
              style={{ opacity: overlayOpacity / 100 }}
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
