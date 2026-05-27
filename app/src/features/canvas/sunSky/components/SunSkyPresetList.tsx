import { useMemo } from 'react';
import type { SunSkyPreset, SunSkyPresetCategory } from '../types/sunSky.types';
import { SUN_SKY_PRESETS } from '../data/sunSkyPresets';

export interface SunSkyPresetListProps {
  selectedPresetId?: string;
  onSelect: (preset: SunSkyPreset) => void;
}

const CATEGORY_META: Record<SunSkyPresetCategory, { index: string; label: string }> = {
  common_daylight: { index: 'A.', label: '常用日光' },
  golden_hour: { index: 'B.', label: '黄金时刻' },
  dramatic_backlight: { index: 'C.', label: '戏剧光' },
  soft_atmosphere: { index: 'D.', label: '柔光氛围' },
};

const CATEGORY_ORDER: SunSkyPresetCategory[] = ['common_daylight', 'golden_hour', 'dramatic_backlight', 'soft_atmosphere'];

export function SunSkyPresetList({ selectedPresetId, onSelect }: SunSkyPresetListProps) {
  const grouped = useMemo(() => {
    const groups = new Map<SunSkyPresetCategory, SunSkyPreset[]>();
    for (const preset of SUN_SKY_PRESETS) {
      const current = groups.get(preset.category) || [];
      current.push(preset);
      groups.set(preset.category, current);
    }
    return groups;
  }, []);

  return (
    <div className="space-y-5">
      {CATEGORY_ORDER.map((category) => {
        const presets = grouped.get(category) || [];
        const meta = CATEGORY_META[category];
        return (
          <section key={category} className="space-y-2">
            <div className="flex items-center justify-between text-sm font-medium text-white/86">
              <span>
                {meta.index} {meta.label}
              </span>
              <span>{presets.length}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset, index) => (
                <PresetCard
                  key={preset.id}
                  preset={preset}
                  index={index}
                  selected={selectedPresetId === preset.id}
                  onSelect={() => onSelect(preset)}
                />
              ))}
            </div>
          </section>
        );
      })}

      <button
        type="button"
        className="mt-4 flex h-11 w-full items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025] text-sm text-white/72 transition hover:bg-white/[0.05] hover:text-white"
      >
        ☆ 我的预设
      </button>
    </div>
  );
}

function PresetCard({
  preset,
  index,
  selected,
  onSelect,
}: {
  preset: SunSkyPreset;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative h-[74px] overflow-hidden rounded-md border text-left transition"
      style={{
        borderColor: selected ? '#1f7dff' : 'rgba(255,255,255,0.08)',
        boxShadow: selected ? '0 0 0 1px rgba(31,125,255,0.45), 0 10px 24px rgba(31,125,255,0.18)' : 'none',
      }}
    >
      <PresetThumbnail preset={preset} seed={index} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/16 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-2 py-1.5">
        <div className="truncate text-xs font-medium text-white drop-shadow">{preset.name}</div>
      </div>
    </button>
  );
}

function PresetThumbnail({ preset, seed }: { preset: SunSkyPreset; seed: number }) {
  const isGolden = preset.category === 'golden_hour';
  const isSoft = preset.category === 'soft_atmosphere';
  const isDrama = preset.category === 'dramatic_backlight';
  const isFog = preset.sky.condition === 'foggy' || preset.sky.condition === 'hazy';
  const sunX = 18 + ((preset.sun.azimuth + seed * 37) % 64);
  const sunY = Math.max(18, 64 - preset.sun.elevation * 0.7);
  const skyTop = isGolden ? '#445b83' : isSoft ? '#7b8da2' : isDrama ? '#5b5d61' : '#4f80b7';
  const horizon = isGolden ? '#d78344' : isSoft ? '#c9d1d8' : isDrama ? '#c9a06e' : '#c4d8e8';

  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(to bottom, ${skyTop} 0%, ${horizon} 58%, #151922 59%, #0f1218 100%)`,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          left: `${sunX}%`,
          top: `${sunY}%`,
          width: 12,
          height: 12,
          background: isGolden || isDrama ? '#ffbc68' : '#fff3d5',
          boxShadow: `0 0 20px ${isGolden || isDrama ? '#ff9b44' : '#ffffff'}`,
        }}
      />
      <div className="absolute bottom-[24px] left-4 h-9 w-7 bg-[#202838]/80" />
      <div className="absolute bottom-[24px] left-12 h-12 w-10 bg-[#263041]/82" />
      <div className="absolute bottom-[24px] left-24 h-7 w-14 bg-[#1d2533]/84" />
      {isFog && <div className="absolute inset-0 bg-white/18 backdrop-blur-[1px]" />}
      {preset.sky.condition === 'cloudy' || preset.sky.condition === 'partly_cloudy' ? (
        <div className="absolute left-6 top-4 h-4 w-20 rounded-full bg-white/22 blur-sm" />
      ) : null}
    </div>
  );
}
