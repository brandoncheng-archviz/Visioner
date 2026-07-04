import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  LIGHT_DIRECTION_OPTIONS,
  STYLE_OPTIONS,
  TIME_OPTIONS,
  TOGGLE_OPTIONS,
  WEATHER_OPTIONS,
  type ControllerOption,
} from '../constants/imageController';
import type { ImageControllerState } from '../types/imageController.types';

type SelectKey = 'time' | 'lightDirection' | 'weather' | 'style';

interface ImageControllerPanelProps {
  anchorElement: HTMLElement | null;
  controller: ImageControllerState;
  disabled?: boolean;
  onChange: (controller: ImageControllerState) => void;
  onClose: () => void;
}

function getOptionLabel<T extends string>(value: T | null, options: ControllerOption<T>[]) {
  if (!value) return '未设置';
  return options.find((option) => option.id === value)?.label || '未设置';
}

function SelectionRow<T extends string>({
  label,
  value,
  options,
  expanded,
  disabled,
  onToggle,
  onClear,
  onChange,
}: {
  label: string;
  value: T | null;
  options: ControllerOption<T>[];
  expanded: boolean;
  disabled?: boolean;
  onToggle: () => void;
  onClear: () => void;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="border-b border-white/[0.055] last:border-b-0">
      <div className="flex h-9 w-full items-center rounded-md transition hover:bg-white/[0.035]">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="flex h-full min-w-0 flex-1 items-center justify-between px-1.5 text-left disabled:cursor-not-allowed"
        >
          <span className="text-[13px] font-normal text-white/45">{label}</span>
          <span className={value ? 'text-[13px] font-medium text-white/88' : 'text-[13px] font-normal text-white/38'}>
            {getOptionLabel(value, options)}
          </span>
        </button>
        {value && (
          <button
            type="button"
            disabled={disabled}
            aria-label={`清除${label}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-white/28 transition hover:bg-white/[0.06] hover:text-white/65 disabled:cursor-not-allowed"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <button type="button" disabled={disabled} onClick={onToggle} className="mr-1 flex h-7 w-6 shrink-0 items-center justify-center disabled:cursor-not-allowed" aria-label={`展开${label}`}>
          <ChevronDown className={`h-3.5 w-3.5 text-white/30 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="space-y-0.5 px-1.5 pb-2.5">
          {options.map((option) => {
            const selected = value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                title={option.description}
                onClick={() => onChange(option.id)}
                className={`flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-[13px] font-medium transition ${selected ? 'bg-[#3b82f6]/[0.09] text-[#bfdbfe]' : 'text-white/68 hover:bg-white/[0.04] hover:text-white/88'}`}
              >
                <span>{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 text-[#60a5fa]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ImageControllerPanel({
  anchorElement,
  controller,
  disabled,
  onChange,
  onClose,
}: ImageControllerPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedGroup, setExpandedGroup] = useState<SelectKey | null>(null);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target) || anchorElement?.contains(target)) return;
      if (expandedGroup) {
        setExpandedGroup(null);
        return;
      }
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (expandedGroup) {
        setExpandedGroup(null);
        return;
      }
      onClose();
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [anchorElement, expandedGroup, onClose]);

  if (!anchorElement) return null;
  const anchorRect = anchorElement.getBoundingClientRect();
  const width = 348;
  const margin = 12;
  const gap = 10;
  const estimatedHeight = 440;
  const availableBelow = window.innerHeight - anchorRect.bottom - margin - gap;
  const availableAbove = anchorRect.top - margin - gap;
  const openBelow = availableBelow >= Math.min(estimatedHeight, 280) || availableBelow >= availableAbove;
  const left = Math.min(Math.max(margin, anchorRect.left + anchorRect.width / 2 - width / 2), window.innerWidth - width - margin);
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const arrowLeft = Math.min(Math.max(18, anchorCenter - left), width - 18);
  const top = openBelow ? anchorRect.bottom + gap : anchorRect.top - gap;
  const availableHeight = Math.max(140, openBelow ? availableBelow : availableAbove);

  const toggleGroup = (key: SelectKey) => setExpandedGroup((current) => current === key ? null : key);
  const selectValue = (update: () => void) => {
    update();
    setExpandedGroup(null);
  };
  const clearValue = (update: () => void) => {
    update();
    setExpandedGroup(null);
  };

  return createPortal(
    <div
      ref={panelRef}
      className="nodrag nopan nowheel fixed z-[2000] flex w-[348px] flex-col overflow-hidden rounded-xl border border-white/[0.10] bg-[#222224] shadow-[0_18px_50px_rgba(0,0,0,0.58)]"
      style={{ left, top, transform: openBelow ? undefined : 'translateY(-100%)', maxHeight: availableHeight, opacity: disabled ? 0.64 : 1 }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <span
        className={`absolute h-2.5 w-2.5 rotate-45 border-white/[0.10] bg-[#222224] ${openBelow ? '-top-[6px] border-l border-t' : '-bottom-[6px] border-b border-r'}`}
        style={{ left: arrowLeft - 5 }}
      />

      <div className="relative flex items-center justify-between border-b border-white/[0.065] px-3.5 py-2.5">
        <div>
          <div className="text-[16px] font-semibold text-white/90">氛围控制</div>
          <div className="mt-0.5 text-[12px] font-normal text-white/40">快速设定生成画面的时间与气质</div>
        </div>
        <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-white/35 transition hover:bg-white/[0.05] hover:text-white/70" aria-label="关闭氛围控制">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3" onWheelCapture={(event) => event.stopPropagation()}>
        <section>
          <div className="mb-1.5 text-[13px] font-semibold text-white/42">开关</div>
          <div className="grid grid-cols-2 gap-1.5">
            {TOGGLE_OPTIONS.map((option) => {
              const active = controller.toggles[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={disabled}
                  title={option.description}
                  onClick={() => {
                    setExpandedGroup(null);
                    onChange({ ...controller, toggles: { ...controller.toggles, [option.id]: !active } });
                  }}
                  className={`flex h-8 items-center rounded-md border px-2.5 text-left text-[13px] font-medium transition ${active ? 'border-[#3b82f6]/60 bg-[#3b82f6]/[0.07] text-[#bfdbfe]' : 'border-white/[0.08] bg-white/[0.018] text-white/68 hover:border-white/[0.16] hover:text-white/86'}`}
                >
                  <span className={`mr-2 h-1.5 w-1.5 rounded-full ${active ? 'bg-[#60a5fa]' : 'bg-white/18'}`} />
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-3 border-t border-white/[0.055] pt-3">
          <div className="mb-1 text-[13px] font-semibold text-white/42">选择</div>
          <SelectionRow label="时间" value={controller.time} options={TIME_OPTIONS} expanded={expandedGroup === 'time'} disabled={disabled} onToggle={() => toggleGroup('time')} onClear={() => clearValue(() => onChange({ ...controller, time: null }))} onChange={(time) => selectValue(() => onChange({ ...controller, time }))} />
          <SelectionRow label="光照方向" value={controller.lightDirection} options={LIGHT_DIRECTION_OPTIONS} expanded={expandedGroup === 'lightDirection'} disabled={disabled} onToggle={() => toggleGroup('lightDirection')} onClear={() => clearValue(() => onChange({ ...controller, lightDirection: null }))} onChange={(lightDirection) => selectValue(() => onChange({ ...controller, lightDirection }))} />
          <SelectionRow label="天气" value={controller.weather} options={WEATHER_OPTIONS} expanded={expandedGroup === 'weather'} disabled={disabled} onToggle={() => toggleGroup('weather')} onClear={() => clearValue(() => onChange({ ...controller, weather: null }))} onChange={(weather) => selectValue(() => onChange({ ...controller, weather }))} />
          <SelectionRow label="风格" value={controller.style} options={STYLE_OPTIONS} expanded={expandedGroup === 'style'} disabled={disabled} onToggle={() => toggleGroup('style')} onClear={() => clearValue(() => onChange({ ...controller, style: null }))} onChange={(style) => selectValue(() => onChange({ ...controller, style }))} />
        </section>
      </div>
    </div>,
    document.body,
  );
}
