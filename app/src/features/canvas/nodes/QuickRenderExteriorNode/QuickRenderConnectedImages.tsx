import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { QuickRenderConnectedImage } from './quickRenderExterior.types';

const DEFAULT_USAGE_COLOR = '#9CA3AF';
const THUMBNAIL_SIZE = 54;

type QuickRenderConnectedImagesProps = {
  images: QuickRenderConnectedImage[];
  disabled?: boolean;
  onRemove: (image: QuickRenderConnectedImage) => void;
  onUpload: (files: FileList | null) => void;
  onSelectFromCanvas: () => void;
};

export function QuickRenderConnectedImages({
  images,
  disabled = false,
  onRemove,
  onUpload,
  onSelectFromCanvas,
}: QuickRenderConnectedImagesProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const visibleImages = images.slice(0, 4);
  const hiddenCount = Math.max(0, images.length - visibleImages.length);

  const removedImageIdsRef = useRef(new Set<string>());

  const stopThumbnailEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
  };

  const removeThumbnail = (event: React.SyntheticEvent, image: QuickRenderConnectedImage) => {
    stopThumbnailEvent(event);
    if (disabled) return;
    if (removedImageIdsRef.current.has(image.id)) return;
    removedImageIdsRef.current.add(image.id);
    onRemove(image);
    window.setTimeout(() => {
      removedImageIdsRef.current.delete(image.id);
    }, 300);
  };

  const openAddMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopThumbnailEvent(event);
    if (disabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const width = 148;
    setMenuPosition({
      left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12),
      top: rect.bottom + 6,
      width,
    });
  };

  useEffect(() => {
    if (!menuPosition) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target) || addButtonRef.current?.contains(target)) return;
      setMenuPosition(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setMenuPosition(null);
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menuPosition]);

  return (
    <section className={disabled ? 'pointer-events-none space-y-2 opacity-60' : 'space-y-2'} aria-disabled={disabled}>
      {!disabled && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="nodrag nopan nowheel fixed z-[2200] overflow-hidden rounded-[10px] border border-white/[0.10] bg-[#222224] p-1 shadow-[0_14px_34px_rgba(0,0,0,0.52)]"
          style={{ left: menuPosition.left, top: menuPosition.top, width: menuPosition.width }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
          }}
          onWheel={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
            onClick={(event) => {
              stopThumbnailEvent(event);
              setMenuPosition(null);
              onSelectFromCanvas();
            }}
          >
            {t('quickRenderExterior.imageInput.selectFromCanvas')}
          </button>
          <button
            type="button"
            className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
            onClick={(event) => {
              stopThumbnailEvent(event);
              setMenuPosition(null);
              fileInputRef.current?.click();
            }}
          >
            {t('quickRenderExterior.imageInput.uploadResource')}
          </button>
        </div>,
        document.body,
      )}
      <div className="text-[13px] font-medium text-white/82">{t('quickRenderExterior.sections.imageInput.title')}</div>

      {images.length > 0 ? (
        <div className="flex flex-wrap items-start gap-3">
          {visibleImages.map((image, index) => (
            <div
              key={image.id}
              className="group/input-ref w-[60px]"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="relative overflow-hidden rounded-[9px] border border-white/[0.10] bg-white/[0.04]" style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}>
                <img
                  src={image.imageUrl}
                  alt={image.label || image.fileName || `input-${index + 1}`}
                  className="h-full w-full object-cover"
                  draggable={false}
                  onDragStart={(event) => event.preventDefault()}
                />
                <span
                  className="pointer-events-none absolute right-0 top-0 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-medium text-white/72 transition-opacity group-hover/input-ref:opacity-0"
                  style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.16)' }}
                >
                  {index + 1}
                </span>
                <button
                  type="button"
                  draggable={false}
                  onPointerDownCapture={(event) => {
                    if (event.button !== 0) return;
                    removeThumbnail(event, image);
                  }}
                  onPointerUpCapture={(event) => {
                    if (event.button !== 0) return;
                    removeThumbnail(event, image);
                  }}
                  onClickCapture={(event) => {
                    removeThumbnail(event, image);
                  }}
                  onDragStart={(event) => {
                    stopThumbnailEvent(event);
                  }}
                  className="nodrag nopan nowheel absolute right-0 top-0 z-30 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white/78 opacity-0 transition hover:bg-black hover:text-white group-hover/input-ref:opacity-100"
                  style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                  title={t('quickRenderExterior.imageInput.removeImage')}
                  aria-label={t('quickRenderExterior.imageInput.removeImage')}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
              <div
                className="mt-1 flex max-w-[60px] items-center gap-1 px-0.5"
                style={{
                  borderColor: `${image.roleColor || DEFAULT_USAGE_COLOR}40`,
                  color: image.roleColor || DEFAULT_USAGE_COLOR,
                }}
                title={image.roleLabel || t('quickRenderExterior.imageInput.unassignedRole')}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: image.roleColor || DEFAULT_USAGE_COLOR }}
                />
                <span className="min-w-0 truncate text-[10px] font-medium">
                  {image.roleLabel || t('quickRenderExterior.imageInput.unassignedRole')}
                </span>
              </div>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="flex flex-col items-center justify-center rounded-[9px] border border-white/[0.08] bg-white/[0.035] text-white/50" style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}>
              <span className="text-[13px] font-medium">+{hiddenCount}</span>
              <span className="mt-1 text-[9px]">{t('quickRenderExterior.imageInput.viewMore')}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-end gap-3">
          <button
            ref={addButtonRef}
            type="button"
            className="nodrag nopan flex flex-col items-center justify-center rounded-[9px] border border-dashed border-white/[0.16] bg-white/[0.025] text-white/58 transition hover:border-white/[0.26] hover:bg-white/[0.045] hover:text-white/82"
            style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
            onClick={openAddMenu}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Plus className="mb-1 h-4 w-4" />
            <span className="text-[10px] font-medium">{t('quickRenderExterior.imageInput.addImage')}</span>
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={disabled}
        onChange={(event) => {
          onUpload(event.target.files);
          event.currentTarget.value = '';
        }}
      />
    </section>
  );
}
