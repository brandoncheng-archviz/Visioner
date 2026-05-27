import { useCallback } from 'react';
import { Cloud, CloudFog, CloudRain, CloudSun, Sun, Waves } from 'lucide-react';
import type { SkyCondition, SunSkyState } from '../types/sunSky.types';

export interface SunSkyControlsProps {
  state: SunSkyState;
  onChange: (updates: Partial<SunSkyState> | ((prev: SunSkyState) => SunSkyState)) => void;
}

const SKY_CONDITION_OPTIONS: { value: SkyCondition; label: string; icon: React.ReactNode }[] = [
  { value: 'clear', label: '晴天', icon: <Sun /> },
  { value: 'partly_cloudy', label: '薄云', icon: <CloudSun /> },
  { value: 'cloudy', label: '多云', icon: <Cloud /> },
  { value: 'overcast', label: '阴天', icon: <Cloud /> },
  { value: 'foggy', label: '雾天', icon: <CloudFog /> },
  { value: 'hazy', label: '雨天', icon: <CloudRain /> },
];

const AIR_QUALITY_OPTIONS = [
  { value: 2.0, label: '清澈' },
  { value: 3.0, label: '标准' },
  { value: 5.0, label: '轻度雾霾' },
  { value: 8.0, label: '重度雾霾' },
];

export function SunSkyControls({ state, onChange }: SunSkyControlsProps) {
  const { sun, sky, atmosphere } = state;

  const handleSunChange = useCallback(
    (key: keyof typeof sun, value: number) => {
      onChange((prev) => ({
        ...prev,
        sun: { ...prev.sun, [key]: value },
        source: { ...prev.source, editedFromPreset: true },
      }));
    },
    [onChange],
  );

  const handleSkyChange = useCallback(
    (updates: Partial<typeof sky>) => {
      onChange((prev) => ({
        ...prev,
        sky: { ...prev.sky, ...updates },
        source: { ...prev.source, editedFromPreset: true },
      }));
    },
    [onChange],
  );

  const handleAtmosphereChange = useCallback(
    (updates: Partial<typeof atmosphere>) => {
      onChange((prev) => ({
        ...prev,
        atmosphere: { ...prev.atmosphere, ...updates },
        source: { ...prev.source, editedFromPreset: true },
      }));
    },
    [onChange],
  );

  return (
    <div className="space-y-5">
      <ControlGroup title="太阳设置">
        <SliderControl
          label="太阳高度"
          value={sun.elevation}
          min={-90}
          max={90}
          step={3}
          suffix="°"
          minLabel="-90°"
          maxLabel="90°"
          onChange={(value) => handleSunChange('elevation', value)}
        />
        <SliderControl
          label="太阳方位"
          value={sun.azimuth}
          min={0}
          max={360}
          step={5}
          suffix="°"
          minLabel="0°"
          maxLabel="360°"
          onChange={(value) => handleSunChange('azimuth', value >= 360 ? 355 : value)}
        />
      </ControlGroup>

      <ControlGroup title="环境设置">
        <SliderControl
          label="天空亮度"
          value={sun.intensity}
          min={0.5}
          max={4}
          step={0.1}
          onChange={(value) => handleSunChange('intensity', value)}
        />
        <SliderControl
          label="地平线亮度"
          value={1 - sky.horizonBlur}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => handleSkyChange({ horizonBlur: 1 - value })}
        />
        <SliderControl
          label="整体曝光"
          value={atmosphere.volumeEffect}
          min={0}
          max={1}
          step={0.05}
          onChange={(value) => handleAtmosphereChange({ volumeEffect: value })}
        />
      </ControlGroup>

      <ControlGroup title="天气状况">
        <div className="grid grid-cols-6 gap-2">
          {SKY_CONDITION_OPTIONS.map((option) => {
            const active = sky.condition === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSkyChange({ condition: option.value })}
                className="flex flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 text-[11px] transition"
                style={{
                  background: active ? 'rgba(0, 116, 255, 0.16)' : 'rgba(255,255,255,0.025)',
                  borderColor: active ? '#1f7dff' : 'rgba(255,255,255,0.08)',
                  color: active ? '#2d8cff' : 'rgba(255,255,255,0.68)',
                }}
              >
                <span className="[&_svg]:h-5 [&_svg]:w-5">{option.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      </ControlGroup>

      <ControlGroup title="空气质量" icon={<Waves className="h-4 w-4" />}>
        <SegmentControl
          options={AIR_QUALITY_OPTIONS}
          value={sky.turbidity}
          onChange={(value) => handleSkyChange({ turbidity: value })}
        />
        <SliderControl
          label="透明度"
          value={sky.turbidity}
          min={1}
          max={10}
          step={0.5}
          onChange={(value) => handleSkyChange({ turbidity: value })}
        />
      </ControlGroup>
    </div>
  );
}

function ControlGroup({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3 border-b border-white/[0.06] pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-center gap-2 text-sm font-medium text-white/88">
        {icon && <span className="text-white/45">{icon}</span>}
        {title}
      </div>
      {children}
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  suffix = '',
  minLabel,
  maxLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  minLabel?: string;
  maxLabel?: string;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const displayValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-medium text-white/76">{label}</label>
        <span
          className="min-w-[52px] rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-right text-xs text-white/84"
        >
          {displayValue}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #1f7dff 0%, #1f7dff ${percent}%, rgba(255,255,255,0.1) ${percent}%, rgba(255,255,255,0.1) 100%)`,
        }}
      />
      {(minLabel || maxLabel) && (
        <div className="flex items-center justify-between text-[11px] text-white/42">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  );
}

function SegmentControl({
  options,
  value,
  onChange,
}: {
  options: { value: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}) {
  const closest = options.reduce((prev, curr) =>
    Math.abs(curr.value - value) < Math.abs(prev.value - value) ? curr : prev,
  );

  return (
    <div className="grid grid-cols-4 gap-2">
      {options.map((option) => {
        const active = closest.value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className="rounded-md border px-2 py-2 text-xs transition"
            style={{
              background: active ? 'rgba(0, 116, 255, 0.16)' : 'rgba(255,255,255,0.025)',
              borderColor: active ? '#1f7dff' : 'rgba(255,255,255,0.08)',
              color: active ? '#2d8cff' : 'rgba(255,255,255,0.62)',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
