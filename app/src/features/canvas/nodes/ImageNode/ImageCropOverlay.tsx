import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IMAGE_CROP_CANCEL_EVENT } from '../../constants/canvasConstants';

export type CropRatio = 'free' | 'original' | '1:1' | '4:3' | '3:2' | '16:9' | '9:16';

export type NormalizedCropRect = { x: number; y: number; width: number; height: number };

type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

const RATIO_VALUES: Record<Exclude<CropRatio, 'free' | 'original'>, number> = {
  '1:1': 1,
  '4:3': 4 / 3,
  '3:2': 3 / 2,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
};

const HANDLES: HandlePosition[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getRatioValue(ratio: CropRatio, originalRatio: number) {
  if (ratio === 'free') return null;
  if (ratio === 'original') return originalRatio;
  return RATIO_VALUES[ratio];
}

function fitCenteredRect(normalizedRatio: number | null, centerX = 0.5, centerY = 0.5): NormalizedCropRect {
  if (!normalizedRatio) return { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
  let width = 0.84;
  let height = width / normalizedRatio;
  if (height > 0.84) {
    height = 0.84;
    width = height * normalizedRatio;
  }
  const x = clamp(centerX - width / 2, 0, 1 - width);
  const y = clamp(centerY - height / 2, 0, 1 - height);
  return { x, y, width, height };
}

export function ImageCropOverlay({
  originalRatio,
  zoom,
  onCancel,
  onConfirm,
}: {
  originalRatio: number;
  zoom: number;
  onCancel: () => void;
  onConfirm: (crop: NormalizedCropRect) => void;
}) {
  const { t } = useTranslation();
  const boundsRef = useRef<HTMLDivElement>(null);
  const [ratio, setRatio] = useState<CropRatio>('original');
  const [crop, setCrop] = useState(() => fitCenteredRect(1));
  const [menuOpen, setMenuOpen] = useState(false);
  const cropRef = useRef(crop);

  useEffect(() => {
    cropRef.current = crop;
  }, [crop]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onConfirm(cropRef.current);
    };
    const handleCanvasCancel = () => onCancel();
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener(IMAGE_CROP_CANCEL_EVENT, handleCanvasCancel);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener(IMAGE_CROP_CANCEL_EVENT, handleCanvasCancel);
    };
  }, [onCancel, onConfirm]);

  const changeRatio = useCallback((nextRatio: CropRatio) => {
    const current = cropRef.current;
    const value = getRatioValue(nextRatio, originalRatio);
    setRatio(nextRatio);
    setMenuOpen(false);
    if (!value) return;
    setCrop(fitCenteredRect(value / originalRatio, current.x + current.width / 2, current.y + current.height / 2));
  }, [originalRatio]);

  const beginDrag = useCallback((event: ReactPointerEvent, handle?: HandlePosition) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bounds = boundsRef.current?.getBoundingClientRect();
    if (!bounds?.width || !bounds.height) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const start = cropRef.current;
    const lockedRatio = getRatioValue(ratio, originalRatio);
    const minWidth = Math.min(0.25, 28 / bounds.width);
    const minHeight = Math.min(0.25, 28 / bounds.height);

    const onMove = (moveEvent: PointerEvent) => {
      const dx = (moveEvent.clientX - startX) / bounds.width;
      const dy = (moveEvent.clientY - startY) / bounds.height;
      if (!handle) {
        setCrop({
          ...start,
          x: clamp(start.x + dx, 0, 1 - start.width),
          y: clamp(start.y + dy, 0, 1 - start.height),
        });
        return;
      }

      let left = start.x;
      let top = start.y;
      let right = start.x + start.width;
      let bottom = start.y + start.height;
      if (handle.includes('w')) left = clamp(start.x + dx, 0, right - minWidth);
      if (handle.includes('e')) right = clamp(start.x + start.width + dx, left + minWidth, 1);
      if (handle.includes('n')) top = clamp(start.y + dy, 0, bottom - minHeight);
      if (handle.includes('s')) bottom = clamp(start.y + start.height + dy, top + minHeight, 1);

      if (lockedRatio) {
        const normalizedRatio = lockedRatio * bounds.height / bounds.width;
        const horizontal = handle === 'e' || handle === 'w';
        const vertical = handle === 'n' || handle === 's';
        let width = right - left;
        let height = bottom - top;
        if (vertical) width = height * normalizedRatio;
        else height = width / normalizedRatio;
        if (!horizontal && !vertical && Math.abs(dx) < Math.abs(dy)) width = height * normalizedRatio;
        else if (!horizontal && !vertical) height = width / normalizedRatio;

        const anchorX = handle.includes('w') ? right : handle.includes('e') ? left : start.x + start.width / 2;
        const anchorY = handle.includes('n') ? bottom : handle.includes('s') ? top : start.y + start.height / 2;
        const maxWidth = handle.includes('w') ? anchorX : handle.includes('e') ? 1 - anchorX : 2 * Math.min(anchorX, 1 - anchorX);
        const maxHeight = handle.includes('n') ? anchorY : handle.includes('s') ? 1 - anchorY : 2 * Math.min(anchorY, 1 - anchorY);
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        width = Math.max(minWidth, width * scale);
        height = Math.max(minHeight, height * scale);
        if (handle.includes('w')) left = anchorX - width;
        else if (handle.includes('e')) right = anchorX + width;
        else { left = anchorX - width / 2; right = anchorX + width / 2; }
        if (handle.includes('n')) top = anchorY - height;
        else if (handle.includes('s')) bottom = anchorY + height;
        else { top = anchorY - height / 2; bottom = anchorY + height / 2; }
      }

      setCrop({ x: left, y: top, width: right - left, height: bottom - top });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [originalRatio, ratio]);

  const ratioOptions: Array<{ value: CropRatio; label: string }> = [
    { value: 'free', label: t('imageNode.cropFree') },
    { value: 'original', label: t('imageNode.cropOriginalRatio') },
    ...Object.keys(RATIO_VALUES).map((value) => ({ value: value as CropRatio, label: value })),
  ];
  const currentLabel = ratioOptions.find((option) => option.value === ratio)?.label;

  return (
    <div
      ref={boundsRef}
      data-image-crop-active="true"
      className="absolute inset-0 z-[60] overflow-visible nodrag nowheel select-none touch-none"
      onPointerDown={(event) => { event.stopPropagation(); setMenuOpen(false); }}
      onContextMenu={(event) => { event.preventDefault(); event.stopPropagation(); }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute z-10 cursor-move"
          onPointerDown={(event) => beginDrag(event)}
          style={{
            left: `${crop.x * 100}%`, top: `${crop.y * 100}%`,
            width: `${crop.width * 100}%`, height: `${crop.height * 100}%`,
            border: '1.5px solid rgba(255,255,255,0.95)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.48)',
          }}
        >
        <div className="pointer-events-none absolute left-1/3 top-0 h-full border-l border-white/35" />
        <div className="pointer-events-none absolute left-2/3 top-0 h-full border-l border-white/35" />
        <div className="pointer-events-none absolute left-0 top-1/3 w-full border-t border-white/35" />
        <div className="pointer-events-none absolute left-0 top-2/3 w-full border-t border-white/35" />
        {HANDLES.map((handle) => (
          <button
            key={handle}
            type="button"
            aria-label={`crop-${handle}`}
            className="absolute z-20 h-3 w-3 rounded-[2px] border border-black/40 bg-white"
            onPointerDown={(event) => beginDrag(event, handle)}
            style={{
              left: handle.includes('w') ? 0 : handle.includes('e') ? '100%' : '50%',
              top: handle.includes('n') ? 0 : handle.includes('s') ? '100%' : '50%',
              transform: 'translate(-50%, -50%)',
              cursor: handle === 'n' || handle === 's' ? 'ns-resize' : handle === 'e' || handle === 'w' ? 'ew-resize' : handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize',
            }}
          />
        ))}
        </div>
      </div>

      <div
        className="absolute left-1/2 z-30 flex w-max flex-nowrap items-center gap-1 whitespace-nowrap rounded-2xl border border-white/10 bg-[#252526] p-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.45)]"
        style={{ bottom: `calc(100% + ${14 / zoom}px)`, transform: `translateX(-50%) scale(${1 / zoom})`, transformOrigin: 'bottom center' }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" onClick={onCancel} className="flex h-8 min-w-[76px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs text-white/80 hover:bg-white/10">
          <X className="h-3.5 w-3.5" />{t('common.cancel')}
        </button>
        <div className="relative shrink-0 whitespace-nowrap">
          <button type="button" onClick={() => setMenuOpen((open) => !open)} className="flex h-8 min-w-[118px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-xs text-white/85 hover:bg-white/10">
            {currentLabel}<ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute left-1/2 top-10 z-40 w-36 -translate-x-1/2 rounded-xl border border-white/10 bg-[#252526] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.5)]">
              {ratioOptions.map((option) => (
                <button key={option.value} type="button" onClick={() => changeRatio(option.value)} className="flex w-full whitespace-nowrap items-center justify-between rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/[0.07]">
                  {option.label}{ratio === option.value && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => onConfirm(crop)} className="flex h-8 min-w-[76px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-white px-3 text-xs font-medium text-[#17171b] hover:bg-white/90">
          <Check className="h-3.5 w-3.5" />{t('common.confirm')}
        </button>
      </div>
    </div>
  );
}
