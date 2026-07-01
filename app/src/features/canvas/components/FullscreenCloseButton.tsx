import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function FullscreenCloseButton({ onClose, transparent = false }: { onClose: () => void; transparent?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClose}
      className={`fixed right-6 top-6 z-[500] flex items-center justify-center rounded-xl border border-white/10 text-white/60 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white ${transparent ? 'h-9 w-9 bg-black/30' : 'h-10 w-10 bg-[#252526]/90 shadow-[0_8px_24px_rgba(0,0,0,0.4)]'}`}
      aria-label={t('common.close')}
      title={t('common.close')}
    >
      <X className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
