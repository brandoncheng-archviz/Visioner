import { Cloud, CloudFog, Sparkles, Sunrise, SunMedium, SunDim, Sunset, Eclipse, Sun } from 'lucide-react';
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

const PRESET_ICONS = {
  'early-morning-low-light': Sunrise,
  'morning-soft-light': SunDim,
  'afternoon-side-light': SunMedium,
  'golden-hour': Sunset,
  'soft-backlight': Eclipse,
  'clear-noon': Sun,
} as const;

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
    <div className="h-full overflow-y-auto border-l border-white/[0.07] px-4 py-4">
      <OptionGroup
        icon={<Cloud className="h-4 w-4" />}
        label="云量"
        options={CLOUD_OPTIONS}
        value={settings.cloudAmount}
        onChange={(cloudAmount) => onSettingsChange({ ...settings, cloudAmount, lightingPresetId: undefined })}
      />
      <OptionGroup
        icon={<CloudFog className="h-4 w-4" />}
        label="雾气"
        options={FOG_OPTIONS}
        value={settings.fogLevel}
        onChange={(fogLevel) => onSettingsChange({ ...settings, fogLevel, lightingPresetId: undefined })}
      />
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-[14px] font-medium text-white/72">
          <Sparkles className="h-4 w-4 text-white/52" />
          光影预设
        </div>
        <div className="grid grid-cols-3 gap-2">
          {RELIGHT_PRESETS.map((preset) => {
            const selected = settings.lightingPresetId === preset.id;
            const PresetIcon = PRESET_ICONS[preset.id as keyof typeof PRESET_ICONS] || Sun;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onPresetSelect(preset)}
                title={`${preset.name}：${preset.description}`}
                aria-pressed={selected}
                className="flex h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-[9px] px-2 text-center transition duration-150 hover:brightness-125"
                style={{
                  color: selected ? '#ffffff' : 'rgba(255,255,255,0.78)',
                  background: selected ? 'rgba(47,107,255,0.12)' : 'rgba(255,255,255,0.025)',
                  border: selected ? '1px solid rgba(47,107,255,0.42)' : '1px solid rgba(255,255,255,0.065)',
                }}
              >
                <PresetIcon className="h-[18px] w-[18px] text-current opacity-65" strokeWidth={1.7} />
                <span className="w-full truncate text-[13px] font-medium leading-4">{preset.name}</span>
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
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2 text-[14px] font-medium text-white/72">
        {icon}
        {label}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className="h-8 rounded-[9px] px-3 text-[13px] font-medium transition duration-150 hover:brightness-125"
              style={{
                color: selected ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.58)',
                background: selected ? 'rgba(47,107,255,0.12)' : 'rgba(255,255,255,0.028)',
                border: selected ? '1px solid rgba(47,107,255,0.42)' : '1px solid rgba(255,255,255,0.065)',
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
