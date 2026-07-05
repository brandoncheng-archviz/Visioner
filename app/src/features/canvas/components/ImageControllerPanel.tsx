import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
  hasAtmosphereReference: boolean;
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
  emptyLabel = '未设置',
  followingReference = false,
  onToggle,
  onClear,
  onChange,
}: {
  label: string;
  value: T | null;
  options: ControllerOption<T>[];
  expanded: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  followingReference?: boolean;
  onToggle: () => void;
  onClear: () => void;
  onChange: (value: T | null) => void;
}) {
  return (
    <div className="border-b border-white/[0.055] last:border-b-0">
      <div className="group/selection flex h-9 w-full items-center rounded-md transition hover:bg-white/[0.035]">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          className="flex h-full min-w-0 flex-1 items-center justify-between px-1.5 text-left disabled:cursor-not-allowed"
        >
          <span className="text-[13px] font-normal text-[rgba(210,210,220,0.42)]">{label}</span>
          <span className={value
            ? 'text-[13px] font-medium text-[rgba(235,235,240,0.86)]'
            : followingReference
              ? 'text-[13px] font-normal text-[rgba(220,220,228,0.58)]'
              : 'text-[13px] font-normal text-[rgba(210,210,220,0.32)]'}>
            {value ? getOptionLabel(value, options) : emptyLabel}
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
            className="mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[rgba(255,255,255,0.28)] transition hover:bg-white/[0.06] hover:text-white/58 disabled:cursor-not-allowed"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <button type="button" disabled={disabled} onClick={onToggle} className="mr-1 flex h-7 w-6 shrink-0 items-center justify-center disabled:cursor-not-allowed" aria-label={`展开${label}`}>
          <ChevronDown className={`h-3.5 w-3.5 text-[rgba(255,255,255,0.24)] transition-all group-hover/selection:text-white/42 ${expanded ? 'rotate-180' : ''}`} />
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
                className={`flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-[13px] font-medium transition ${selected ? 'bg-[#3b82f6]/[0.09] text-[rgba(235,235,240,0.88)]' : 'text-[rgba(225,225,232,0.72)] hover:bg-white/[0.04] hover:text-[rgba(235,235,240,0.88)]'}`}
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
  hasAtmosphereReference,
  disabled,
  onChange,
  onClose,
}: ImageControllerPanelProps) {
  const { t } = useTranslation();
  const lightDirectionOptions = LIGHT_DIRECTION_OPTIONS.map((option) => ({
    ...option,
    label: t(`imageNode.atmosphereLightOptions.${option.id}`),
  }));
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedGroup, setExpandedGroup] = useState<SelectKey | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

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

  useEffect(() => {
    if (!anchorElement) {
      const frame = requestAnimationFrame(() => setAnchorRect(null));
      return () => cancelAnimationFrame(frame);
    }

    let frame = 0;
    const updateAnchorRect = () => {
      const nextRect = anchorElement.getBoundingClientRect();
      setAnchorRect((currentRect) => {
        if (
          currentRect
          && Math.abs(currentRect.left - nextRect.left) < 0.25
          && Math.abs(currentRect.top - nextRect.top) < 0.25
          && Math.abs(currentRect.width - nextRect.width) < 0.25
          && Math.abs(currentRect.height - nextRect.height) < 0.25
        ) return currentRect;
        return nextRect;
      });
      frame = requestAnimationFrame(updateAnchorRect);
    };
    updateAnchorRect();
    return () => cancelAnimationFrame(frame);
  }, [anchorElement]);

  if (!anchorElement || !anchorRect) return null;
  const margin = 12;
  const width = Math.min(348, Math.max(0, window.innerWidth - margin * 2));
  const gap = 10;
  const estimatedHeight = 440;
  const availableBelow = window.innerHeight - anchorRect.bottom - margin - gap;
  const availableAbove = anchorRect.top - margin - gap;
  const openBelow = availableBelow >= Math.min(estimatedHeight, 280) || availableBelow >= availableAbove;
  const left = Math.min(Math.max(margin, anchorRect.left + anchorRect.width / 2 - width / 2), window.innerWidth - width - margin);
  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const arrowLeft = Math.min(Math.max(18, anchorCenter - left), width - 18);
  const top = openBelow ? anchorRect.bottom + gap : anchorRect.top - gap;
  const availableHeight = Math.max(0, openBelow ? availableBelow : availableAbove);

  const toggleGroup = (key: SelectKey) => setExpandedGroup((current) => current === key ? null : key);
  const selectValue = (_key: SelectKey, update: () => void) => {
    update();
    setExpandedGroup(null);
  };
  const clearValue = (_key: SelectKey, update: () => void) => {
    update();
    setExpandedGroup(null);
  };

  return createPortal(
    <div
      ref={panelRef}
      className="nodrag nopan nowheel fixed z-[2000] flex flex-col overflow-hidden rounded-xl border border-white/[0.10] bg-[#222224] shadow-[0_18px_50px_rgba(0,0,0,0.58)]"
      style={{ left, top, width, transform: openBelow ? undefined : 'translateY(-100%)', maxHeight: availableHeight, opacity: disabled ? 0.64 : 1 }}
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <span
        className={`absolute h-2.5 w-2.5 rotate-45 border-white/[0.10] bg-[#222224] ${openBelow ? '-top-[6px] border-l border-t' : '-bottom-[6px] border-b border-r'}`}
        style={{ left: arrowLeft - 5 }}
      />

      <div className="relative flex items-center justify-between border-b border-white/[0.065] px-3.5 py-2.5">
        <div>
          <div className="text-[15px] font-semibold text-[rgba(255,255,255,0.78)]">氛围控制</div>
        </div>
        <button type="button" onClick={onClose} className="flex h-6 w-6 items-center justify-center rounded-md text-white/35 transition hover:bg-white/[0.05] hover:text-white/70" aria-label="关闭氛围控制">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3" onWheelCapture={(event) => event.stopPropagation()}>
        <section>
          <div className="grid grid-cols-2 gap-1.5">
            {TOGGLE_OPTIONS.map((option) => {
              const active = controller.toggles[option.id];
              const toggleOption = () => {
                if (disabled) return;
                setExpandedGroup(null);
                onChange({ ...controller, toggles: { ...controller.toggles, [option.id]: !active } });
              };
              return (
                <div
                  key={option.id}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-disabled={disabled}
                  title={option.description}
                  onClick={toggleOption}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    toggleOption();
                  }}
                  className={`flex h-8 items-center justify-between rounded-md border px-2.5 text-left text-[13px] font-medium transition ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${active ? 'border-[rgba(170,120,255,0.95)] bg-[rgba(150,100,255,0.16)] text-[rgba(235,235,240,0.88)] hover:bg-[rgba(150,100,255,0.19)]' : 'border-white/[0.10] bg-white/[0.025] text-[rgba(210,210,220,0.42)] hover:border-white/[0.16] hover:bg-white/[0.035] hover:text-[rgba(225,225,232,0.58)]'}`}
                >
                  <span>{option.label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={active}
                    aria-label={`${option.label}${active ? '已开启' : '已关闭'}`}
                    disabled={disabled}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleOption();
                    }}
                    className={`relative ml-2 h-4 w-7 shrink-0 rounded-full border transition-colors ${active ? 'border-[rgba(170,120,255,0.95)] bg-[rgba(150,100,255,0.72)]' : 'border-white/[0.12] bg-white/[0.08]'}`}
                  >
                    <span className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all ${active ? 'left-[14px] bg-white/90' : 'left-0.5 bg-white/38'}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-3 border-t border-white/[0.055] pt-2">
          <SelectionRow label="时间" value={controller.time} options={TIME_OPTIONS} emptyLabel={hasAtmosphereReference ? t('imageNode.followAtmosphereReference') : undefined} followingReference={hasAtmosphereReference} expanded={expandedGroup === 'time'} disabled={disabled} onToggle={() => toggleGroup('time')} onClear={() => clearValue('time', () => onChange({ ...controller, time: null }))} onChange={(time) => selectValue('time', () => onChange({ ...controller, time }))} />
          <SelectionRow label={t('imageNode.atmosphereLight')} value={controller.lightDirection} options={lightDirectionOptions} emptyLabel={hasAtmosphereReference ? t('imageNode.followAtmosphereReference') : undefined} followingReference={hasAtmosphereReference} expanded={expandedGroup === 'lightDirection'} disabled={disabled} onToggle={() => toggleGroup('lightDirection')} onClear={() => clearValue('lightDirection', () => onChange({ ...controller, lightDirection: null }))} onChange={(lightDirection) => selectValue('lightDirection', () => onChange({ ...controller, lightDirection }))} />
          <SelectionRow label="天气" value={controller.weather} options={WEATHER_OPTIONS} emptyLabel={hasAtmosphereReference ? t('imageNode.followAtmosphereReference') : undefined} followingReference={hasAtmosphereReference} expanded={expandedGroup === 'weather'} disabled={disabled} onToggle={() => toggleGroup('weather')} onClear={() => clearValue('weather', () => onChange({ ...controller, weather: null }))} onChange={(weather) => selectValue('weather', () => onChange({ ...controller, weather }))} />
          <SelectionRow label="风格" value={controller.style} options={STYLE_OPTIONS} expanded={expandedGroup === 'style'} disabled={disabled} onToggle={() => toggleGroup('style')} onClear={() => clearValue('style', () => onChange({ ...controller, style: null }))} onChange={(style) => selectValue('style', () => onChange({ ...controller, style }))} />
        </section>
      </div>
    </div>,
    document.body,
  );
}
