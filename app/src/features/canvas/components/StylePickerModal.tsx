import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { STYLE_PRESETS, getStylePresetById } from '../constants/presets';

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
  const [query, setQuery] = useState('');
  const [draftStyleId, setDraftStyleId] = useState<string | null>(selectedStyleId);
  const entryStyleIdRef = useRef<string | null>(selectedStyleId);
  const previewStyle = getStylePresetById(draftStyleId) || STYLE_PRESETS[0];
  const selectedStyle = getStylePresetById(selectedStyleId);

  useEffect(() => {
    if (!open) return;
    entryStyleIdRef.current = selectedStyleId;
    setQuery('');
    setDraftStyleId(selectedStyleId || STYLE_PRESETS[0]?.id || null);
  }, [open, selectedStyleId]);

  const handleCancel = () => {
    onApply(entryStyleIdRef.current);
    onClose();
  };

  const filteredStyles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return STYLE_PRESETS;
    return STYLE_PRESETS.filter(
      (style) =>
        t(`style.${style.id}.title`).toLowerCase().includes(normalizedQuery) ||
        t(`style.${style.id}.description`).toLowerCase().includes(normalizedQuery) ||
        style.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
    );
  }, [query]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <div
        className="flex max-h-[680px] w-[960px] max-w-[calc(100vw-48px)] flex-col overflow-hidden rounded-xl"
        style={{
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 24px 70px rgba(0,0,0,0.62)',
        }}
      >
        <div className="flex items-start justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[16px] font-semibold text-white/92">{t('style.selectStyle')}</div>
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

        <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr]">
          <div className="flex min-h-0 flex-col border-r p-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="mb-3 flex items-center gap-2 rounded-lg px-2.5 py-2" style={{ background: 'rgba(255,255,255,0.055)', border: FLOATING_PANEL_BORDER }}>
              <Search className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t('style.searchStyle')}
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-white/30"
                style={{ color: 'rgba(255,255,255,0.86)' }}
              />
            </div>
            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {filteredStyles.map((style) => {
                const previewing = previewStyle.id === style.id;
                const applied = selectedStyleId === style.id;
                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setDraftStyleId(style.id)}
                    className="flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors"
                    style={{
                      background: previewing ? 'rgba(167,139,250,0.16)' : 'rgba(255,255,255,0.025)',
                      borderColor: previewing ? 'rgba(167,139,250,0.42)' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <img src={style.thumbnail} alt="" className="h-11 w-11 flex-shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-white/88">{t(`style.${style.id}.title`)}</span>
                      <span className="mt-0.5 block truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.44)' }}>{style.tags.slice(0, 3).join(' / ')}</span>
                    </span>
                    {applied && <Check className="h-4 w-4 flex-shrink-0" style={{ color: '#a78bfa' }} />}
                  </button>
                );
              })}
              {filteredStyles.length === 0 && (
                <div className="py-8 text-center text-[13px] text-white/35">{t('style.noMatchingStyle')}</div>
              )}
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[18px] font-semibold text-white/92">{t(`style.${previewStyle.id}.title`)}</h3>
                  {selectedStyleId === previewStyle.id && (
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: 'rgba(167,139,250,0.18)', color: '#c4b5fd' }}>{t('style.currentStyle')}</span>
                  )}
                </div>
                <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.58)' }}>{t(`style.${previewStyle.id}.description`)}</p>
              </div>
              <button
                type="button"
                onClick={() => onApply(previewStyle.id)}
                className="rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:brightness-110"
                style={{ background: '#a78bfa', color: '#111' }}
              >
                {t('style.applyStyle')}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {previewStyle.tags.map((tag) => (
                <span key={tag} className="rounded-md px-2 py-1 text-[11px]" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.62)', border: FLOATING_PANEL_BORDER }}>{tag}</span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onApply(previewStyle.id)}
              className="mt-4 block w-full overflow-hidden rounded-xl border text-left transition-all hover:border-[#a78bfa]"
              style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.025)' }}
            >
              <img src={previewStyle.heroImage || previewStyle.thumbnail} alt="" className="h-[260px] w-full object-cover" />
            </button>

            <div className="mt-3 grid grid-cols-6 gap-2">
              {previewStyle.sampleImages.slice(0, 6).map((image, index) => (
                <button
                  key={`${previewStyle.id}-${image}-${index}`}
                  type="button"
                  onClick={() => onApply(previewStyle.id)}
                  className="overflow-hidden rounded-lg border transition-all hover:border-[#a78bfa]"
                  style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                  title={t('style.applyThisStyle')}
                >
                  <img src={image} alt="" className="h-16 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[12px] text-white/40">{t('style.currentSelection')}</span>
            {selectedStyle ? (
              <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px]" style={{ background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.24)' }}>
                {t(`style.${selectedStyle.id}.title`)}
                <button type="button" onClick={() => onApply(null)} className="rounded-full hover:bg-white/10">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ) : (
              <span className="text-[12px] text-white/32">{t('style.noStyle')}</span>
            )}
            <button type="button" onClick={() => onApply(null)} className="text-[12px] transition-colors hover:text-white/70" style={{ color: 'rgba(255,255,255,0.42)' }}>{t('style.clearStyle')}</button>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleCancel} className="rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/8" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('common.cancel')}</button>
            <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-[13px] font-medium" style={{ background: 'rgba(255,255,255,0.9)', color: '#111' }}>{t('style.confirmSelection')}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
