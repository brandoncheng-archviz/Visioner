import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { QuickRenderConnectedImage } from './quickRenderExterior.types';

type QuickRenderConnectedImagesProps = {
  images: QuickRenderConnectedImage[];
  onRemove: (image: QuickRenderConnectedImage) => void;
  onUpload: (files: FileList | null) => void;
};

export function QuickRenderConnectedImages({
  images,
  onRemove,
  onUpload,
}: QuickRenderConnectedImagesProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const visibleImages = images.slice(0, 4);
  const hiddenCount = Math.max(0, images.length - visibleImages.length);

  const openImagePicker = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium text-white/80">图像输入</div>
      </div>

      {images.length > 0 ? (
        <div className="flex items-center gap-2">
          {visibleImages.map((image, index) => (
            <div
              key={image.id}
              className="group/input-ref relative h-[58px] w-[58px] overflow-hidden rounded-[8px] border border-white/[0.10] bg-white/[0.04]"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <img
                src={image.imageUrl}
                alt={image.label || image.fileName || `input-${index + 1}`}
                className="h-full w-full object-cover"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
              />
              <span
                className="absolute right-0 top-0 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white/72 transition-opacity group-hover/input-ref:opacity-0"
                style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                {String(index + 1).padStart(2, '0')}
              </span>
              <button
                type="button"
                draggable={false}
                onPointerDownCapture={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClickCapture={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRemove(image);
                }}
                onDragStart={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                className="nodrag nowheel absolute right-0 top-0 z-30 flex h-[18px] w-[18px] items-center justify-center rounded-full text-white/78 opacity-0 transition hover:bg-black hover:text-white pointer-events-none group-hover/input-ref:pointer-events-auto group-hover/input-ref:opacity-100"
                style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                title="移除图像"
                aria-label="移除图像"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}
          {hiddenCount > 0 && (
            <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[8px] border border-white/[0.08] bg-white/[0.035] text-[13px] font-medium text-white/50">
              +{hiddenCount}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="nodrag flex aspect-square w-[76px] flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.12] bg-white/[0.025] text-white/58 transition hover:border-white/[0.20] hover:bg-white/[0.045] hover:text-white/78"
          onClick={openImagePicker}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Plus className="mb-1 h-4 w-4" />
          <span className="text-[12px] font-medium">添加图像</span>
        </button>
      )}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => {
          onUpload(event.target.files);
          event.currentTarget.value = '';
        }}
      />
    </section>
  );
}
