import type { MouseEvent, PointerEvent } from 'react';
import { Sun, ZoomIn, GitCompare, Maximize2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ToolbarAction {
  icon: typeof Sun;
  label: string;
  action: () => void;
  disabled?: boolean;
}

export function ImageToolbar({
  onSunSky,
  onUpscale,
  onCompare,
  onPreview,
  onDownload,
  hasImage,
}: {
  onSunSky: () => void;
  onUpscale: () => void;
  onCompare: () => void;
  onPreview: () => void;
  onDownload: () => void;
  hasImage: boolean;
}) {
  const { t } = useTranslation();

  const tools: ToolbarAction[] = [
    { icon: Sun, label: t('imageNode.sunSky'), action: onSunSky, disabled: !hasImage },
    { icon: ZoomIn, label: t('imageNode.upscale'), action: onUpscale, disabled: !hasImage },
    { icon: GitCompare, label: t('imageNode.compare'), action: onCompare, disabled: !hasImage },
    { icon: Maximize2, label: t('imageNode.preview'), action: onPreview, disabled: !hasImage },
    { icon: Download, label: t('common.download'), action: onDownload, disabled: !hasImage },
  ];

  const stopToolbarEvent = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAction = (event: MouseEvent<HTMLButtonElement>, tool: ToolbarAction) => {
    stopToolbarEvent(event);
    if (tool.disabled) return;
    tool.action();
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
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onPointerDown={stopToolbarEvent}
          onClick={(event) => handleAction(event, tool)}
          disabled={tool.disabled}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
          title={tool.label}
          aria-label={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  );
}
