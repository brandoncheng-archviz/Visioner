import type { MouseEvent, PointerEvent } from 'react';
import { Maximize2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ToolbarAction {
  icon: typeof Maximize2;
  label: string;
  tooltipLabel?: string;
  action: () => void;
  disabled?: boolean;
}

export function ImageToolbar({
  onPreview,
  onDownload,
  hasImage,
}: {
  onPreview: () => void;
  onDownload: () => void;
  hasImage: boolean;
}) {
  const { t } = useTranslation();

  const tools: ToolbarAction[] = [
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
    <TooltipProvider delayDuration={120}>
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
          <Tooltip key={tool.label} delayDuration={120}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onPointerDown={stopToolbarEvent}
                onClick={(event) => handleAction(event, tool)}
                disabled={tool.disabled}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
                aria-label={tool.label}
              >
                <tool.icon className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              sideOffset={8}
              showArrow={false}
              className="min-w-max whitespace-nowrap border border-white/10 bg-[#252526] text-center text-white shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            >
              {tool.tooltipLabel || tool.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
