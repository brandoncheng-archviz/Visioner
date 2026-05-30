import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { styleDefinitions, getStylePresetById } from '../constants/presets';

export function StylePickerModal({
  open,
  selectedStyleId,
  onApply,
  onClose,
}: {
  open: boolean;
  selectedStyleId: string | null;
  onApply: (styleId: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draftStyleId, setDraftStyleId] = useState<string | null>(() => getStylePresetById(selectedStyleId)?.id || null);
  const previewStyle = getStylePresetById(draftStyleId);
  const draftStyle = getStylePresetById(draftStyleId);

  useEffect(() => {
    if (!open) return;
    setDraftStyleId(getStylePresetById(selectedStyleId)?.id || null);
  }, [open, selectedStyleId]);

  const handleCancel = () => {
    onClose();
  };

  const handleConfirm = () => {
    onApply(draftStyleId);
    onClose();
  };

  const handleClear = () => {
    onApply(null);
    setDraftStyleId(null);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55"
      onPointerDown={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <div
        className="flex flex-col overflow-hidden rounded-xl"
        style={{
          width: 'min(880px, calc(100vw - 48px))',
          height: 'min(720px, calc(100vh - 48px))',
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 48px)',
          minHeight: 0,
          flex: '0 0 auto',
          boxSizing: 'border-box',
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 24px 70px rgba(0,0,0,0.62)',
        }}
      >
        <div className="flex shrink-0 items-start justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[16px] font-semibold text-white/92">{t('style.selectVisualPreference')}</div>
            <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.48)' }}>{t('style.styleSampleNotice')}</div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.58)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <div className="grid grid-cols-4 gap-3">
            {styleDefinitions.map((style) => {
              const previewing = draftStyleId === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => setDraftStyleId(style.id)}
                  className={`group relative overflow-hidden rounded-lg border text-left transition-all ${previewing ? 'border-white/[0.42]' : 'border-white/[0.12] hover:border-white/[0.24]'}`}
                  style={{
                    background: previewing ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.025)',
                    boxShadow: previewing ? '0 0 0 1px rgba(255,255,255,0.10), 0 10px 26px rgba(0,0,0,0.28)' : 'none',
                  }}
                >
                  <img src={style.coverImage} alt="" className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <div className="px-3 py-2">
                    <div className="truncate text-[13px] font-medium text-white/88">{style.title}</div>
                  </div>
                  {previewing && (
                    <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.88)', color: '#111' }}>
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.028)' }}>
            {previewStyle ? (
              <>
                <h3 className="text-[18px] font-semibold text-white/92">{previewStyle.title}</h3>
                <p className="mt-3 text-[13px] leading-7" style={{ color: 'rgba(255,255,255,0.64)' }}>
                  {previewStyle.detailedDescription}
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {previewStyle.tags.map((tag) => (
                    <span key={tag} className="rounded-md px-2 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.14)' }}>{tag}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-5">
                <h3 className="text-[18px] font-semibold text-white/92">{t('style.noStyle')}</h3>
                <p className="mt-2 text-[13px] leading-7" style={{ color: 'rgba(255,255,255,0.56)' }}>
                  清除视觉偏好后，生成结果将不再叠加整体画面语言，只根据提示词、预设、引用图和模型参数进行生成。
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[12px] text-white/40">{t('style.currentSelection')}</span>
            {draftStyle ? (
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.14)' }}>
                {draftStyle.title}
                <button type="button" onClick={handleClear} className="rounded-full hover:bg-white/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-[12px] text-white/32">{t('style.noStyle')}</span>
            )}
            <button type="button" onClick={handleClear} className="text-[12px] transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('style.clearStyle')}</button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCancel} className="rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/8" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('common.cancel')}</button>
            <button type="button" onClick={handleConfirm} className="rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: '#111' }}>{t('style.confirmSelection')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
