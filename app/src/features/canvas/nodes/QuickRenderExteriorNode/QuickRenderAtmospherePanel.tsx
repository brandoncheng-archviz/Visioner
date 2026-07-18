import { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
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
  onChange: (patch: Partial<QuickRenderExteriorNodeData>) => void;
};

type SelectKey = 'time' | 'light' | 'weather' | 'style';

const SELECT_ROWS = [
  { key: 'time', label: '时间', options: TIME_OPTIONS },
  { key: 'light', label: '光线', options: LIGHT_DIRECTION_OPTIONS },
  { key: 'weather', label: '天气', options: WEATHER_OPTIONS },
  { key: 'style', label: '风格', options: STYLE_OPTIONS },
] as const;

const ATMOSPHERE_SWITCH_CLASS = "data-[state=checked]:bg-[#8b5cf6] data-[state=unchecked]:bg-white/[0.10] hover:data-[state=checked]:brightness-110 hover:data-[state=unchecked]:bg-white/[0.14]";
const INNER_ATMOSPHERE_SWITCH_TRACK = 'relative ml-2 h-4 w-7 shrink-0 rounded-full border transition-colors';
const INNER_ATMOSPHERE_SWITCH_THUMB = 'absolute top-0.5 h-2.5 w-2.5 rounded-full transition-all';

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
  expanded,
  hasAtmosphereReference,
  onToggle,
  onClear,
  onChange,
}: {
  label: string;
  value: QuickRenderAtmosphereOption | undefined;
  options: ControllerOption<string>[];
  expanded: boolean;
  hasAtmosphereReference: boolean;
  onToggle: () => void;
  onClear: () => void;
  onChange: (value: string) => void;
}) {
  const hasManualValue = value?.source === 'manual';
  return (
    <div className="border-b border-white/[0.055] last:border-b-0">
      <div className="group/selection flex h-9 w-full items-center rounded-md transition hover:bg-white/[0.035]">
        <button
          type="button"
          onClick={onToggle}
          className="nodrag flex h-full min-w-0 flex-1 items-center justify-between px-1.5 text-left"
        >
          <span className="text-[13px] font-normal text-[rgba(210,210,220,0.42)]">{label}</span>
          <span className={hasManualValue
            ? 'text-[13px] font-medium text-[rgba(235,235,240,0.86)]'
            : hasAtmosphereReference
              ? 'text-[13px] font-normal text-[rgba(220,220,228,0.58)]'
              : 'text-[13px] font-normal text-[rgba(210,210,220,0.32)]'}
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
          <ChevronDown className={`h-3.5 w-3.5 text-[rgba(255,255,255,0.24)] transition-all group-hover/selection:text-white/42 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {expanded && (
        <div className="space-y-0.5 px-1.5 pb-2.5">
          {options.map((option) => {
            const selected = value?.source === 'manual' && value.value === option.id;
            return (
              <button
                key={option.id}
                type="button"
                title={option.description}
                onClick={() => onChange(option.id)}
                className={`nodrag flex h-7 w-full items-center justify-between rounded-md px-2 text-left text-[13px] font-medium transition ${selected ? 'bg-[#3b82f6]/[0.09] text-[rgba(235,235,240,0.88)]' : 'text-[rgba(225,225,232,0.72)] hover:bg-white/[0.04] hover:text-[rgba(235,235,240,0.88)]'}`}
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

export function QuickRenderAtmospherePanel({ data, onChange }: QuickRenderAtmospherePanelProps) {
  const [expandedGroup, setExpandedGroup] = useState<SelectKey | null>(null);
  const atmosphere = data.atmosphere || {};
  const hasAtmosphereReference = data.atmosphereReferenceEnabled === true && Boolean(data.atmosphereReference?.imageUrl);
  const setField = (key: SelectKey, value: string) => {
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: { source: 'manual', value },
      },
    });
    setExpandedGroup(null);
  };
  const clearField = (key: SelectKey) => {
    onChange({
      atmosphere: {
        ...atmosphere,
        [key]: hasAtmosphereReference ? { source: 'followReference' } : { source: 'unset' },
      },
    });
    setExpandedGroup(null);
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

  return (
    <section className="rounded-[12px] border border-white/[0.08] bg-white/[0.025]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/82">氛围控制</span>
        <Switch
          checked={data.atmosphereEnabled === true}
          onCheckedChange={(checked) => onChange({ atmosphereEnabled: checked })}
          className={ATMOSPHERE_SWITCH_CLASS}
        />
      </div>
      {data.atmosphereEnabled && (
        <div className="border-t border-white/[0.06] px-3 py-3">
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
                    <span className={`${INNER_ATMOSPHERE_SWITCH_THUMB} ${active ? 'left-[14px] bg-white/90' : 'left-0.5 bg-white/58'}`} />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-white/[0.055] pt-2">
            {SELECT_ROWS.map((row) => (
              <SelectionRow
                key={row.key}
                label={row.label}
                value={atmosphere[row.key]}
                options={row.options}
                expanded={expandedGroup === row.key}
                hasAtmosphereReference={hasAtmosphereReference}
                onToggle={() => setExpandedGroup((current) => current === row.key ? null : row.key)}
                onClear={() => clearField(row.key)}
                onChange={(value) => setField(row.key, value)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
