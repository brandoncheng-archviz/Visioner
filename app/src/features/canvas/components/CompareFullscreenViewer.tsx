import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeftRight, Columns2, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FullscreenCloseButton } from './FullscreenCloseButton';
import { useFullscreenEscape } from '../hooks/useFullscreenEscape';

type FullscreenCompareImage = {
  imageUrl: string;
  label: string;
};

type CompareMode = 'side-by-side' | 'slider';

function ViewerImage({ image, side }: { image: FullscreenCompareImage; side: string }) {
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
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white/75">
        {side} · {image.label}
      </div>
    </div>
  );
}

export function CompareFullscreenViewer({
  leftImage,
  rightImage,
  onClose,
}: {
  leftImage: FullscreenCompareImage;
  rightImage: FullscreenCompareImage;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const sliderAreaRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<CompareMode>('side-by-side');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [swapped, setSwapped] = useState(false);
  const [leftFailed, setLeftFailed] = useState(false);
  const [rightFailed, setRightFailed] = useState(false);
  const visibleLeft = swapped ? rightImage : leftImage;
  const visibleRight = swapped ? leftImage : rightImage;

  useFullscreenEscape(true, onClose);

  const updateSlider = useCallback((clientX: number) => {
    const rect = sliderAreaRef.current?.getBoundingClientRect();
    if (!rect?.width) return;
    setSliderPosition(Math.round(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 100));
  }, []);

  const beginSliderDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    updateSlider(event.clientX);
    const handleMove = (moveEvent: PointerEvent) => updateSlider(moveEvent.clientX);
    const handleEnd = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleEnd);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleEnd);
  }, [updateSlider]);

  const controlButton = (
    active: boolean,
    label: string,
    icon: React.ReactNode,
    action?: () => void,
  ) => (
    <button
      type="button"
      onClick={action}
      className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 text-xs transition-colors hover:bg-white/10"
      style={{ color: active ? '#fff' : 'rgba(255,255,255,0.68)', background: active ? 'rgba(255,255,255,0.1)' : 'transparent' }}
    >
      {icon}{label}
    </button>
  );

  return createPortal(
    <div
      data-canvas-escape-layer="true"
      className="fixed inset-0 z-[400] flex flex-col bg-black/85 p-5 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <FullscreenCloseButton onClose={onClose} />
      <div
        className="mx-auto flex max-w-full flex-nowrap items-center gap-1 rounded-2xl border border-white/10 bg-[#252526]/95 p-1.5 shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {controlButton(mode === 'side-by-side', t('compare.sideBySide'), <Columns2 className="h-4 w-4" />, () => setMode('side-by-side'))}
        {controlButton(mode === 'slider', t('compare.sliderCompare'), <SlidersHorizontal className="h-4 w-4" />, () => setMode('slider'))}
        {controlButton(false, t('compare.swap'), <ArrowLeftRight className="h-4 w-4" />, () => setSwapped((value) => !value))}
      </div>

      <div
        className="mx-auto mt-4 flex min-h-0 w-full max-w-[1500px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b0e] shadow-2xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {mode === 'side-by-side' ? (
          <div className="flex h-full w-full min-h-0 gap-3 p-3">
            <ViewerImage image={visibleLeft} side={t('compare.left')} />
            <ViewerImage image={visibleRight} side={t('compare.right')} />
          </div>
        ) : (
          <div ref={sliderAreaRef} className="relative h-full w-full overflow-hidden" onPointerDown={beginSliderDrag}>
            {rightFailed ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
            ) : (
              <img src={visibleRight.imageUrl} alt={visibleRight.label} className="absolute inset-0 block h-full w-full object-contain" draggable={false} onError={() => setRightFailed(true)} />
            )}
            <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}>
              {leftFailed ? (
                <div className="flex h-full w-full items-center justify-center text-sm text-white/45">{t('compare.imageLoadFailed')}</div>
              ) : (
                <img src={visibleLeft.imageUrl} alt={visibleLeft.label} className="block h-full w-full object-contain" draggable={false} onError={() => setLeftFailed(true)} />
              )}
            </div>
            <div className="pointer-events-none absolute inset-y-0 w-px bg-white shadow-[0_0_10px_rgba(0,0,0,0.65)]" style={{ left: `${sliderPosition}%` }} />
            <div className="pointer-events-none absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-xl" style={{ left: `${sliderPosition}%` }}>
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white/75">{t('compare.left')} · {visibleLeft.label}</div>
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/60 px-2.5 py-1 text-xs text-white/75">{t('compare.right')} · {visibleRight.label}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
