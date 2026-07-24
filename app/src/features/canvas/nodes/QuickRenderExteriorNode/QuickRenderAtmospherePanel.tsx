import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  LIGHT_DIRECTION_OPTIONS,
  STYLE_OPTIONS,
  TIME_OPTIONS,
  TOGGLE_OPTIONS,
  WEATHER_OPTIONS,
  type ControllerOption,
} from '../../constants/imageController';
import type { QuickRenderAtmosphereOption, QuickRenderExteriorNodeData } from './quickRenderExterior.types';

type QuickRenderAtmospherePanelProps = {
  data: QuickRenderExteriorNodeData;
  hasAtmosphereReference: boolean;
  onChange: (patch: Partial<QuickRenderExteriorNodeData>) => void;
};

type SelectKey = 'time' | 'light' | 'weather' | 'style';
type SelectMenuState = {
  key: SelectKey;
  left: number;
  top: number;
  width: number;
  openBelow: boolean;
};

const SELECT_ROWS = [
  { key: 'time', label: '时间', options: TIME_OPTIONS },
  { key: 'light', label: '光线', options: LIGHT_DIRECTION_OPTIONS },
  { key: 'weather', label: '天气', options: WEATHER_OPTIONS },
  { key: 'style', label: '风格', options: STYLE_OPTIONS },
] as const;

const INNER_ATMOSPHERE_SWITCH_TRACK = 'relative ml-2 h-4 w-7 shrink-0 rounded-full border transition-colors';
const INNER_ATMOSPHERE_SWITCH_THUMB = 'absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all';
const SELECT_MENU_ESTIMATED_HEIGHT = 260;
const VIEWPORT_PADDING = 12;

function getOptionLabel(value: string | undefined, options: ControllerOption<string>[]) {
  if (!value) return '未设置';
  return options.find((option) => option.id === value)?.label || '未设置';
}

function getDisplayValue(
  option: QuickRenderAtmosphereOption | undefined,
  options: ControllerOption<string>[],
  hasAtmosphereReference: boolean,
) {
  if (option?.source === 'manual') return getOptionLabel(option.value, options);
  if (option?.source === 'followReference' || hasAtmosphereReference) return '跟随参考';
  return '未设置';
}

function SelectionRow({
  label,
  value,
  options,
  hasAtmosphereReference,
  onToggle,
  onClear,
  buttonRef,
}: {
  label: string;
  value: QuickRenderAtmosphereOption | undefined;
  options: ControllerOption<string>[];
  hasAtmosphereReference: boolean;
  onToggle: () => void;
  onClear: () => void;
  buttonRef: (element: HTMLButtonElement | null) => void;
}) {
  const hasManualValue = value?.source === 'manual';
  return (
    <div className="rounded-md border border-white/[0.08] bg-white/[0.02]">
      <div className="group/selection flex h-8 w-full items-center rounded-md transition hover:bg-white/[0.035]">
        <button
          ref={buttonRef}
          type="button"
          onClick={onToggle}
          className="nodrag flex h-full min-w-0 flex-1 items-center justify-between gap-2 px-2 text-left"
        >
          <span className="shrink-0 text-[13px] font-normal text-[rgba(210,210,220,0.42)]">{label}</span>
          <span className={hasManualValue
            ? 'min-w-0 truncate text-[13px] font-medium text-[rgba(235,235,240,0.86)]'
            : hasAtmosphereReference
              ? 'min-w-0 truncate text-[13px] font-normal text-[rgba(220,220,228,0.58)]'
              : 'min-w-0 truncate text-[13px] font-normal text-[rgba(210,210,220,0.32)]'}
          >
            {getDisplayValue(value, options, hasAtmosphereReference)}
          </span>
        </button>
        {hasManualValue && (
          <button
            type="button"
            aria-label={`清除${label}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClear();
            }}
            className="nodrag mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-[rgba(255,255,255,0.28)] transition hover:bg-white/[0.06] hover:text-white/58"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        <button type="button" onClick={onToggle} className="nodrag mr-1 flex h-7 w-6 shrink-0 items-center justify-center" aria-label={`展开${label}`}>
          <ChevronDown className="h-3.5 w-3.5 text-[rgba(255,255,255,0.24)] transition-all group-hover/selection:text-white/42" />
        </button>
      </div>
    </div>
  );
}

export function QuickRenderAtmospherePanel({ data, hasAtmosphereReference, onChange }: QuickRenderAtmospherePanelProps) {
  const [selectMenu, setSelectMenu] = useState<SelectMenuState | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const rowButtonRefs = useRef<Partial<Record<SelectKey, HTMLButtonElement>>>({});
  const atmosphere = data.atmosphere || {};

  const getMenuPosition = (element: HTMLElement): SelectMenuState => {
    const rect = element.getBoundingClientRect();
    const width = Math.max(190, rect.width);
    const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
    const left = Math.min(Math.max(rect.left, VIEWPORT_PADDING), maxLeft);
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const openBelow = spaceBelow >= Math.min(SELECT_MENU_ESTIMATED_HEIGHT, 180) || spaceBelow >= spaceAbove;
    const top = openBelow
      ? rect.bottom + 6
      : Math.max(VIEWPORT_PADDING, rect.top - SELECT_MENU_ESTIMATED_HEIGHT - 6);
    return { key: 'time', left, top, width, openBelow };
  };

  const openSelectMenu = (key: SelectKey) => {
    const element = rowButtonRefs.current[key];
    if (!element) return;
    const nextPosition = getMenuPosition(element);
    setSelectMenu((current) => current?.key === key ? null : { ...nextPosition, key });
  };

  useEffect(() => {
    if (!selectMenu) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const activeButton = rowButtonRefs.current[selectMenu.key];
      if (menuRef.current?.contains(target) || activeButton?.contains(target)) return;
      setSelectMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setSelectMenu(null);
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [selectMenu]);

  useEffect(() => {
    if (!selectMenu) return;
    const update = () => {
      const element = rowButtonRefs.current[selectMenu.key];
      if (!element) return;
      setSelectMenu({ ...getMenuPosition(element), key: selectMenu.key });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [selectMenu]);

  const setField = (key: SelectKey, value: string) => {
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: { source: 'manual', value },
      },
    });
    setSelectMenu(null);
  };
  const clearField = (key: SelectKey) => {
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: hasAtmosphereReference ? { source: 'followReference' } : { source: 'unset' },
      },
    });
    setSelectMenu(null);
  };
  const setToggle = (key: 'addEntourage' | 'addPeople' | 'interiorLights' | 'motionBlur', value: boolean) => {
    onChange({ atmosphere: { ...atmosphere, [key]: value } });
  };
  const toggles = [
    { sourceId: 'addEnvironment', key: 'addEntourage' },
    { sourceId: 'addPeople', key: 'addPeople' },
    { sourceId: 'indoorLighting', key: 'interiorLights' },
    { sourceId: 'motionBlur', key: 'motionBlur' },
  ] as const;
  const activeSelectRow = selectMenu ? SELECT_ROWS.find((row) => row.key === selectMenu.key) : null;
  const activeSelectValue = selectMenu ? atmosphere[selectMenu.key] : undefined;

  return (
    <section className="space-y-2 border-t border-white/[0.07] pt-3">
      {selectMenu && activeSelectRow && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="nodrag nopan nowheel fixed z-[2000] overflow-hidden rounded-[10px] border border-white/[0.10] bg-[#222224] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.52)]"
          style={{ left: selectMenu.left, top: selectMenu.top, width: selectMenu.width }}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {activeSelectRow.options.map((option) => {
            const selected = activeSelectValue?.source === 'manual' && activeSelectValue.value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.description}
                onClick={() => setField(activeSelectRow.key, option.id)}
                className={`flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[13px] font-medium transition ${selected ? 'bg-[#3b82f6]/[0.09] text-[rgba(235,235,240,0.88)]' : 'text-[rgba(225,225,232,0.72)] hover:bg-white/[0.055] hover:text-[rgba(235,235,240,0.9)]'}`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[#60a5fa]" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
      <div className="text-[13px] font-medium text-white/82">氛围控制</div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {toggles.map(({ sourceId, key }) => {
            const option = TOGGLE_OPTIONS.find((item) => item.id === sourceId);
            const active = atmosphere[key] === true;
            if (!option) return null;
            return (
              <button
                key={key}
                type="button"
                title={option.description}
                onClick={() => setToggle(key, !active)}
                className={`nodrag flex h-8 items-center justify-between rounded-md border border-white/[0.10] bg-white/[0.025] px-2.5 text-left text-[13px] font-medium transition hover:border-white/[0.16] hover:bg-white/[0.035] ${active ? 'text-[rgba(235,235,240,0.88)]' : 'text-[rgba(210,210,220,0.42)] hover:text-[rgba(225,225,232,0.58)]'}`}
              >
                <span>{option.label}</span>
                <span className={`${INNER_ATMOSPHERE_SWITCH_TRACK} ${active ? 'border-[#8b5cf6]/80 bg-[#8b5cf6] hover:brightness-110' : 'border-white/[0.18] bg-white/[0.10] hover:bg-white/[0.14]'}`}>
                  <span className={`quick-render-inner-switch-thumb ${INNER_ATMOSPHERE_SWITCH_THUMB} ${active ? 'left-[14px]' : 'left-0.5'}`} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SELECT_ROWS.map((row) => (
            <SelectionRow
              key={row.key}
              label={row.label}
              value={atmosphere[row.key]}
              options={row.options}
              hasAtmosphereReference={hasAtmosphereReference}
              onToggle={() => openSelectMenu(row.key)}
              onClear={() => clearField(row.key)}
              buttonRef={(element) => {
                rowButtonRefs.current[row.key] = element ?? undefined;
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
