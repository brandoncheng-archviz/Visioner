import { createPortal } from 'react-dom';
import { X, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function CanvasSelectionModeBanner({
  icon: Icon,
  title,
  description,
  onBackToNode,
  onClose,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onBackToNode: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      data-canvas-selection-banner="true"
      className="fixed left-1/2 top-5 z-[4100] flex min-h-14 -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-2xl border border-white/[0.12] bg-[#2868f5] p-2.5 text-white shadow-[0_14px_34px_rgba(20,74,220,0.34)]"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.11] text-white/95">
        <Icon className="h-[19px] w-[19px]" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 pr-1">
        <div className="text-[13px] font-semibold leading-4 text-white">{title}</div>
        {description && <div className="mt-0.5 text-[11px] leading-4 text-white/72">{description}</div>}
      </div>
      <button
        type="button"
        className="flex h-9 shrink-0 cursor-pointer items-center rounded-xl bg-white/[0.14] px-3 text-[12px] font-medium text-white/88 transition-colors hover:bg-white/[0.22] hover:text-white"
        onClick={onBackToNode}
      >
        {t('canvasSelection.backToNode')}
      </button>
      <button
        type="button"
        aria-label={t('canvasSelection.close')}
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-white/82 transition-colors hover:bg-white/[0.14] hover:text-white"
        onClick={onClose}
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </button>
    </div>,
    document.body,
  );
}
