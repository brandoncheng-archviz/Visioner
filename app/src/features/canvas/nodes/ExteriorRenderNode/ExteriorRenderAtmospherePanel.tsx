import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  EXTERIOR_RENDER_LIGHTING_OPTIONS,
  EXTERIOR_RENDER_STYLE_OPTIONS,
  EXTERIOR_RENDER_TIME_OPTIONS,
  EXTERIOR_RENDER_TOGGLE_OPTIONS,
  EXTERIOR_RENDER_WEATHER_OPTIONS,
  normalizeExteriorRenderAtmosphereStyle,
  type ExteriorRenderAtmosphereDisplayOption,
} from './exteriorRenderAtmosphereOptions';
import type {
  ExteriorRenderAtmosphereOption,
  ExteriorRenderAtmosphereValue,
  ExteriorRenderNodeData,
} from './exteriorRender.types';

type ExteriorRenderAtmospherePanelProps = {
  data: ExteriorRenderNodeData;
  disabled?: boolean;
  hasAtmosphereReference: boolean;
  onChange: (patch: Partial<ExteriorRenderNodeData>) => void;
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
  { key: 'time', labelKey: 'atmosphere.fields.time', options: EXTERIOR_RENDER_TIME_OPTIONS },
  { key: 'light', labelKey: 'atmosphere.fields.lighting', options: EXTERIOR_RENDER_LIGHTING_OPTIONS },
  { key: 'weather', labelKey: 'atmosphere.fields.weather', options: EXTERIOR_RENDER_WEATHER_OPTIONS },
  { key: 'style', labelKey: 'atmosphere.fields.style', options: EXTERIOR_RENDER_STYLE_OPTIONS },
] as const;

const INNER_ATMOSPHERE_SWITCH_TRACK = 'relative ml-2 h-4 w-7 shrink-0 rounded-full border transition-colors';
const INNER_ATMOSPHERE_SWITCH_THUMB = 'absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all';
const SELECT_MENU_ESTIMATED_HEIGHT = 260;
const VIEWPORT_PADDING = 12;

type DisplayOption = ExteriorRenderAtmosphereDisplayOption<ExteriorRenderAtmosphereValue>;

function getOptionLabel(
  value: string | undefined,
  options: readonly DisplayOption[],
  translate: (key: string) => string,
  unsetLabel: string,
) {
  if (!value) return unsetLabel;
  const normalizedValue = options === EXTERIOR_RENDER_STYLE_OPTIONS
    ? normalizeExteriorRenderAtmosphereStyle(value)
    : value;
  const option = options.find((candidate) => candidate.id === normalizedValue);
  return option ? translate(option.labelKey) : unsetLabel;
}

function getDisplayValue(
  option: ExteriorRenderAtmosphereOption | undefined,
  options: readonly DisplayOption[],
  hasAtmosphereReference: boolean,
  translate: (key: string) => string,
  unsetLabel: string,
  followLabel: string,
) {
  if (option?.source === 'manual') return getOptionLabel(option.value, options, translate, unsetLabel);
  if (option?.source === 'followReference' || hasAtmosphereReference) return followLabel;
  return unsetLabel;
}

function SelectionRow({
  label,
  value,
  options,
  hasAtmosphereReference,
  translate,
  unsetLabel,
  followLabel,
  onToggle,
  onClear,
  buttonRef,
}: {
  label: string;
  value: ExteriorRenderAtmosphereOption | undefined;
  options: readonly DisplayOption[];
  hasAtmosphereReference: boolean;
  translate: (key: string) => string;
  unsetLabel: string;
  followLabel: string;
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
            {getDisplayValue(value, options, hasAtmosphereReference, translate, unsetLabel, followLabel)}
          </span>
        </button>
        {hasManualValue && (
          <button
            type="button"
            aria-label={`${translate('common.actions.clear')} ${label}`}
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
        <button type="button" onClick={onToggle} className="nodrag mr-1 flex h-7 w-6 shrink-0 items-center justify-center" aria-label={`${translate('common.actions.expand')} ${label}`}>
          <ChevronDown className="h-3.5 w-3.5 text-[rgba(255,255,255,0.24)] transition-all group-hover/selection:text-white/42" />
        </button>
      </div>
    </div>
  );
}

export function ExteriorRenderAtmospherePanel({ data, disabled = false, hasAtmosphereReference, onChange }: ExteriorRenderAtmospherePanelProps) {
  const { t } = useTranslation();
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
    if (disabled) return;
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

  const setField = (key: SelectKey, value: ExteriorRenderAtmosphereValue) => {
    if (disabled) return;
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: { source: 'manual', value },
      },
    });
    setSelectMenu(null);
  };
  const clearField = (key: SelectKey) => {
    if (disabled) return;
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: hasAtmosphereReference ? { source: 'followReference' } : { source: 'unset' },
      },
    });
    setSelectMenu(null);
  };
  const setToggle = (key: 'addEntourage' | 'addPeople' | 'interiorLights' | 'motionBlur', value: boolean) => {
    if (disabled) return;
    onChange({ atmosphere: { ...atmosphere, [key]: value } });
  };
  const activeSelectRow = selectMenu ? SELECT_ROWS.find((row) => row.key === selectMenu.key) : null;
  const activeSelectValue = selectMenu ? atmosphere[selectMenu.key] : undefined;

  return (
    <section className={disabled ? 'pointer-events-none space-y-2 border-t border-white/[0.07] pt-3 opacity-60' : 'space-y-2 border-t border-white/[0.07] pt-3'} aria-disabled={disabled}>
      {!disabled && selectMenu && activeSelectRow && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="nodrag nopan nowheel fixed z-[2000] overflow-hidden rounded-[10px] border border-white/[0.10] bg-[#222224] p-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.52)]"
          style={{ left: selectMenu.left, top: selectMenu.top, width: selectMenu.width }}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {activeSelectRow.options.map((option) => {
            const activeValue = activeSelectRow.key === 'style'
              ? normalizeExteriorRenderAtmosphereStyle(activeSelectValue?.value)
              : activeSelectValue?.value;
            const selected = activeSelectValue?.source === 'manual' && activeValue === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setField(activeSelectRow.key, option.id)}
                className={`flex h-8 w-full items-center justify-between rounded-md px-2 text-left text-[13px] font-medium transition ${selected ? 'bg-[#3b82f6]/[0.09] text-[rgba(235,235,240,0.88)]' : 'text-[rgba(225,225,232,0.72)] hover:bg-white/[0.055] hover:text-[rgba(235,235,240,0.9)]'}`}
              >
                <span className="truncate">{t(option.labelKey)}</span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-[#60a5fa]" />}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
      <div className="text-[13px] font-medium text-white/82">{t('exteriorRender.sections.atmosphere.title')}</div>
      <div className="space-y-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          {EXTERIOR_RENDER_TOGGLE_OPTIONS.map(({ key, labelKey }) => {
            const active = atmosphere[key] === true;
            return (
              <button
                key={key}
                type="button"
                title={t(labelKey)}
                onClick={() => setToggle(key, !active)}
                className={`nodrag flex h-8 items-center justify-between rounded-md border border-white/[0.10] bg-white/[0.025] px-2.5 text-left text-[13px] font-medium transition hover:border-white/[0.16] hover:bg-white/[0.035] ${active ? 'text-[rgba(235,235,240,0.88)]' : 'text-[rgba(210,210,220,0.42)] hover:text-[rgba(225,225,232,0.58)]'}`}
              >
                <span>{t(labelKey)}</span>
                <span className={`${INNER_ATMOSPHERE_SWITCH_TRACK} ${active ? 'border-[#8b5cf6]/80 bg-[#8b5cf6] hover:brightness-110' : 'border-white/[0.18] bg-white/[0.10] hover:bg-white/[0.14]'}`}>
                  <span className={`exterior-render-inner-switch-thumb ${INNER_ATMOSPHERE_SWITCH_THUMB} ${active ? 'left-[14px]' : 'left-0.5'}`} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SELECT_ROWS.map((row) => (
            <SelectionRow
              key={row.key}
              label={t(row.labelKey)}
              value={atmosphere[row.key]}
              options={row.options}
              hasAtmosphereReference={hasAtmosphereReference}
              translate={t}
              unsetLabel={t('common.status.unset')}
              followLabel={t('atmosphere.status.followReference')}
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
