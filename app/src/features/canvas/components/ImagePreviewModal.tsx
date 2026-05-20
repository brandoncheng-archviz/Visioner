import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function ImagePreviewModal({
  imageUrl,
  nodeName,
  imgSize,
  onClose,
}: {
  imageUrl: string;
  nodeName: string;
  imgSize: { width: number; height: number } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: '#0a0a0f' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.6)' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center" style={{ padding: 40 }}>
        <img
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        />
      </div>

      {/* Info panel */}
      <div className="flex flex-col" style={{ width: 320, background: '#14141a', borderLeft: '1px solid #2a2a35' }}>
        <div className="flex-1 overflow-y-auto p-5">
          {/* Prompt section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">{t('imageNode.noPrompt')}</h3>
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: '#1e1e28', color: '#a0a0b0', minHeight: 80 }}
            >
              {t('imageNode.noPrompt')}
            </div>
          </div>

          {/* Info section */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">{t('imageNode.info')}</h3>
            <div className="rounded-lg p-4 space-y-2.5" style={{ background: '#1e1e28' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>{t('imageNode.size')}</span>
                <span style={{ color: '#a0a0b0' }}>{imgSize ? `${imgSize.width}×${imgSize.height}` : t('common.unknown')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>{t('imageNode.quality')}</span>
                <span style={{ color: '#a0a0b0' }}>2k</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>{t('imageNode.fileSize')}</span>
                <span style={{ color: '#a0a0b0' }}>31 KB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>{t('imageNode.date')}</span>
                <span style={{ color: '#a0a0b0' }}>2026/05/08</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>{t('imageNode.creator')}</span>
                <span style={{ color: '#a0a0b0' }}>brandonchan0307</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download button */}
        <div className="p-5" style={{ borderTop: '1px solid #2a2a35' }}>
          <button
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:bg-[#3a3a4a]"
            style={{ background: '#252530' }}
            onClick={() => {
              const a = document.createElement('a');
              a.href = imageUrl;
              a.download = nodeName || 'image';
              a.click();
            }}
          >
            {t('common.download')}
          </button>
        </div>
      </div>
    </div>
  );
}
