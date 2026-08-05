import type { MouseEvent, PointerEvent } from 'react';
import { useState, type ComponentType } from 'react';
import { Maximize2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface ToolbarMenuItem {
  label: string;
  action: () => void;
  disabled?: boolean;
}

export interface ToolbarAction {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tooltipLabel?: string;
  controlHover?: boolean;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  menuItems?: ToolbarMenuItem[];
}

export function ImageToolbar({
  onPreview,
  onDownload,
  hasImage,
  actions,
}: {
  onPreview?: () => void;
  onDownload?: () => void;
  hasImage?: boolean;
  actions?: ToolbarAction[];
}) {
  const { t } = useTranslation();
  const [openMenuLabel, setOpenMenuLabel] = useState<string | null>(null);

  const tools: ToolbarAction[] = actions || [
    { icon: Maximize2, label: t('toolbar.fullscreen'), action: onPreview, disabled: !hasImage },
    { icon: Download, label: t('common.actions.download'), action: onDownload, disabled: !hasImage },
  ];
  const usesControlHover = tools.length === 1 && tools[0]?.controlHover === true;

  const stopToolbarEvent = (event: MouseEvent<HTMLButtonElement> | PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleAction = (event: MouseEvent<HTMLButtonElement>, tool: ToolbarAction) => {
    stopToolbarEvent(event);
    if (tool.disabled) return;
    if (tool.menuItems?.length) {
      setOpenMenuLabel((current) => current === tool.label ? null : tool.label);
      return;
    }
    setOpenMenuLabel(null);
    tool.action?.();
  };

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={`group/upload-control flex items-center gap-1 rounded-2xl px-2 py-1.5 nodrag nowheel ${
          usesControlHover
            ? 'border border-[rgba(148,163,184,0.28)] bg-[#252526] transition-colors hover:border-[rgba(148,163,184,0.55)] hover:bg-[#303238]'
            : ''
        }`}
        style={{
          background: usesControlHover ? undefined : '#252526',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: usesControlHover ? undefined : '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {tools.map((tool) => (
          <Tooltip key={tool.label} delayDuration={120}>
            <TooltipTrigger asChild>
              <div className="relative">
                <button
                  type="button"
                  onPointerDown={stopToolbarEvent}
                  onClick={(event) => handleAction(event, tool)}
                  disabled={tool.disabled}
                  className={`flex items-center justify-center rounded-full transition-[color,background-color,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-30 ${
                    tool.controlHover
                      ? 'text-[rgba(203,213,225,0.68)] group-hover/upload-control:text-[#CBD5E1]'
                      : 'enabled:hover:text-white'
                  } ${
                    tool.controlHover
                      ? ''
                      : 'enabled:hover:bg-white/20 enabled:hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                  } ${
                    tool.controlHover
                      ? ''
                      : tool.danger
                        ? 'text-white/[0.74]'
                        : 'text-white/[0.85]'
                  }`}
                  style={{
                    width: 32,
                    height: 32,
                  }}
                  aria-label={tool.label}
                  title={tool.label}
                >
                  <tool.icon className="h-4 w-4 transition-colors duration-150" />
                </button>
                {openMenuLabel === tool.label && tool.menuItems?.length && (
                  <div
                    className="absolute left-1/2 top-[38px] z-[120] min-w-[132px] -translate-x-1/2 rounded-xl px-1.5 py-1.5"
                    style={{
                      background: '#252526',
                      border: '1px solid rgba(255,255,255,0.08)',
                      boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
                    }}
                  >
                    {tool.menuItems.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        disabled={item.disabled}
                        onPointerDown={stopToolbarEvent}
                        onClick={(event) => {
                          stopToolbarEvent(event);
                          if (item.disabled) return;
                          setOpenMenuLabel(null);
                          item.action();
                        }}
                        className="block w-full rounded-lg px-3 py-2 text-left text-[12px] transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-30"
                        style={{ color: 'rgba(255,255,255,0.78)' }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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
