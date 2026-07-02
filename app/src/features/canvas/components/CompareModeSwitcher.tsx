import { Columns2, Layers, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { CompareMode } from '../types/canvas.types';

const MODE_ITEMS = [
  { mode: 'sideBySide' as const, labelKey: 'compare.sideBySide' as const, Icon: Columns2 },
  { mode: 'slider' as const, labelKey: 'compare.sliderCompare' as const, Icon: SlidersHorizontal },
  { mode: 'overlay' as const, labelKey: 'compare.overlay' as const, Icon: Layers },
];

export function CompareModeSwitcher({
  mode,
  onModeChange,
  variant = 'node',
}: {
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
  variant?: 'node' | 'fullscreen';
}) {
  const { t } = useTranslation();
  const isFullscreen = variant === 'fullscreen';

  return (
    <TooltipProvider delayDuration={120}>
      <div
        className={`nodrag nopan flex items-center gap-1 ${isFullscreen ? 'rounded-xl border border-white/[0.08] p-1 backdrop-blur-md' : ''}`}
        style={isFullscreen ? { background: 'rgba(20,20,24,0.36)' } : undefined}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {MODE_ITEMS.map(({ mode: itemMode, labelKey, Icon }) => {
          const label = t(labelKey);
          const active = mode === itemMode;
          return (
            <Tooltip key={itemMode}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center justify-center rounded-md transition-colors hover:bg-white/[0.08] hover:text-white ${isFullscreen ? 'h-8 w-8' : 'h-7 w-7'}`}
                  style={{
                    color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.48)',
                    background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onModeChange(itemMode);
                  }}
                  aria-label={label}
                >
                  <Icon className={isFullscreen ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={7} showArrow={false}>
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
