import type { SunSkyDerived, SunSkyState } from '../types/sunSky.types';

export interface SunSkyDerivedInfoProps {
  derived: SunSkyDerived;
  state: SunSkyState;
}

const SKY_LABELS: Record<string, string> = {
  clear: '晴天',
  partly_cloudy: '薄云',
  cloudy: '多云',
  overcast: '阴天',
  foggy: '雾天',
  hazy: '暖霾',
};

const TURBIDITY_LABELS = [
  { value: 2.0, label: '清澈' },
  { value: 3.0, label: '标准' },
  { value: 5.0, label: '轻雾' },
  { value: 8.0, label: '重雾' },
];

export function SunSkyDerivedInfo({ derived, state }: SunSkyDerivedInfoProps) {
  const closestTurbidity = TURBIDITY_LABELS.reduce((prev, curr) =>
    Math.abs(curr.value - state.sky.turbidity) < Math.abs(prev.value - state.sky.turbidity) ? curr : prev,
  );

  return (
    <div className="space-y-2 text-xs">
      <InfoRow label="时间" value={derived.timeLabel} />
      <InfoRow label="太阳" value={`${derived.directionLabel} ${state.sun.azimuth}° / 高度 ${state.sun.elevation}°`} />
      <InfoRow label="天空" value={SKY_LABELS[state.sky.condition] || state.sky.condition} />
      <InfoRow label="曝光" value={state.sun.intensity.toFixed(1)} />
      <InfoRow label="空气质量" value={closestTurbidity.label} />
      <InfoRow label="备注" value={derived.summary} multiline />
    </div>
  );
}

function InfoRow({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className={multiline ? 'space-y-1' : 'grid grid-cols-[64px_minmax(0,1fr)] gap-2'}>
      <span className="text-white/42">{label}:</span>
      <span className={multiline ? 'block leading-relaxed text-white/66' : 'truncate text-white/72'}>{value}</span>
    </div>
  );
}
