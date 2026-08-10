import type { ReactNode } from 'react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CANVAS_NODE_CARD_SELECTED_BORDER_COLOR } from '../../constants/canvasConstants';

export function ImageNodeControlFooter({
  label,
  labelAction,
  children,
  controls,
  summaryOpacity = 1,
  className,
}: {
  label: string;
  labelAction?: ReactNode;
  children: ReactNode;
  controls: ReactNode;
  summaryOpacity?: number;
  className?: string;
}) {
  return (
    <footer className={cn('flex min-h-[62px] items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.018] px-3.5 py-2.5', className)}>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="text-[12px] font-medium text-white/48">{label}</span>
        {labelAction}
      </div>
      <div
        className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 transition-opacity duration-200"
        style={{ opacity: summaryOpacity }}
      >
        {children}
      </div>
      <div className="flex shrink-0 items-center gap-5 border-l border-white/[0.06] pl-4">
        {controls}
      </div>
    </footer>
  );
}

export function ControlFooterSwitch({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className={`flex items-center gap-2.5 text-[12px] ${disabled ? 'text-white/30' : 'text-white/62'}`}>
      <span className="whitespace-nowrap">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        style={{ background: checked ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : 'rgba(255,255,255,0.12)' }}
      />
    </label>
  );
}

export function ControlSummaryChip({
  children,
  muted = false,
  className,
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(
      'whitespace-nowrap rounded-md border px-2 py-1 text-[12px]',
      muted
        ? 'border-white/[0.06] bg-transparent text-white/44'
        : 'border-white/[0.08] bg-white/[0.035] text-white/72',
      className,
    )}>
      {children}
    </span>
  );
}
