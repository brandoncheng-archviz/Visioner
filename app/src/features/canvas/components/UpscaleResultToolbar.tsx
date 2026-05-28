import type { MouseEvent } from 'react';
import { Maximize2, Download, Trash2, ZoomIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function UpscaleResultToolbar({
  onPreview,
  onDownload,
  onDelete,
  onUpscaleAgain,
}: {
  onPreview: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onUpscaleAgain: () => void;
}) {
  const { t } = useTranslation();
  const handleAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    action();
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 rounded-full nodrag nowheel"
      style={{
        background: '#252526',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <button
        type="button"
        onClick={(event) => handleAction(event, onPreview)}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
        title={t('common.expand')}
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(event) => handleAction(event, onDownload)}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
        title={t('common.download')}
      >
        <Download className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(event) => handleAction(event, onUpscaleAgain)}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
        title={t('imageNode.upscale')}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={(event) => handleAction(event, onDelete)}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
        title={t('common.delete')}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
