import { Cloud, CloudFog, Sparkles } from 'lucide-react';
import { RELIGHT_PRESETS } from '../constants/relightPresets';
import type {
  RelightCloudAmount,
  RelightFogLevel,
  RelightPreset,
  RelightSettings,
} from '../types/relight.types';

const CLOUD_OPTIONS: Array<{ value: RelightCloudAmount; label: string }> = [
  { value: 'clear', label: '晴朗' },
  { value: 'fewClouds', label: '少云' },
  { value: 'cloudy', label: '多云' },
  { value: 'overcast', label: '阴天' },
];

const FOG_OPTIONS: Array<{ value: RelightFogLevel; label: string }> = [
  { value: 'none', label: '无' },
  { value: 'light', label: '轻雾' },
  { value: 'medium', label: '中雾' },
  { value: 'heavy', label: '浓雾' },
];

export function RelightAdvancedSettings({
  settings,
  onSettingsChange,
  onPresetSelect,
}: {
  settings: RelightSettings;
  onSettingsChange: (settings: RelightSettings) => void;
  onPresetSelect: (preset: RelightPreset) => void;
}) {
  return (
    <div className="h-full border-l border-white/[0.06] px-4 py-4">
      <OptionGroup
        icon={<Cloud className="h-3.5 w-3.5" />}
        label="云量"
        options={CLOUD_OPTIONS}
        value={settings.cloudAmount}
        onChange={(cloudAmount) => onSettingsChange({ ...settings, cloudAmount, lightingPresetId: undefined })}
      />
      <OptionGroup
        icon={<CloudFog className="h-3.5 w-3.5" />}
        label="雾气"
        options={FOG_OPTIONS}
        value={settings.fogLevel}
        onChange={(fogLevel) => onSettingsChange({ ...settings, fogLevel, lightingPresetId: undefined })}
      />
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-white/58">
          <Sparkles className="h-3.5 w-3.5" />
          光影预设
        </div>
        <div className="grid grid-cols-2 gap-2">
          {RELIGHT_PRESETS.map((preset) => {
            const selected = settings.lightingPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetSelect(preset)}
                className="min-h-[54px] rounded-lg px-2.5 py-2 text-left transition"
                style={{
                  color: selected ? '#dff8ff' : 'rgba(255,255,255,0.7)',
                  background: selected ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.025)',
                  border: selected ? '1px solid rgba(0,212,255,0.3)' : '1px solid rgba(255,255,255,0.055)',
                }}
              >
                <div className="text-[12px] font-medium">{preset.name}</div>
                <div className="mt-0.5 text-[10px] leading-4 text-white/34">{preset.description}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OptionGroup<T extends string>({
  icon,
  label,
  options,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="mb-3">
      <div className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-white/58">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-4 gap-1">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className="h-7 rounded-md text-[11px] transition"
              style={{
                color: selected ? '#fff' : 'rgba(255,255,255,0.46)',
                background: selected ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.025)',
                border: selected ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(255,255,255,0.045)',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
