import { Compass, Sun } from 'lucide-react';

export interface SunSkyNodeControlsProps {
  elevation: number;
  azimuth: number;
  directionLabel: string;
  onElevationChange: (value: number) => void;
  onAzimuthChange: (value: number) => void;
}

export function SunSkyNodeControls({
  elevation,
  azimuth,
  directionLabel,
  onElevationChange,
  onAzimuthChange,
}: SunSkyNodeControlsProps) {
  return (
    <div className="space-y-3">
      <SunSlider
        icon={<Sun className="h-3.5 w-3.5" />}
        label="太阳高度"
        value={elevation}
        min={3}
        max={90}
        step={3}
        minLabel="3°"
        midLabel="45°"
        maxLabel="90°"
        onChange={onElevationChange}
      />
      <div className="h-px bg-white/[0.06]" />
      <SunSlider
        icon={<Compass className="h-3.5 w-3.5" />}
        label="太阳方位"
        value={azimuth}
        min={0}
        max={360}
        step={5}
        minLabel="0°"
        midLabel="180°"
        maxLabel="360°"
        extraValue={directionLabel}
        onChange={onAzimuthChange}
      />
    </div>
  );
}

function SunSlider({
  icon,
  label,
  value,
  min,
  max,
  step,
  minLabel,
  midLabel,
  maxLabel,
  extraValue,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  extraValue?: string;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="nodrag nowheel grid items-center gap-3" style={{ gridTemplateColumns: '96px minmax(0, 1fr) 70px' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-white/78">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/45 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          <span className="truncate leading-none">{label}</span>
        </div>
      </div>
      <div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, #208cff 0%, #208cff ${percent}%, rgba(255,255,255,0.12) ${percent}%, rgba(255,255,255,0.12) 100%)`,
          }}
        />
        <div className="mt-1.5 grid grid-cols-3 text-[11px] text-white/32">
          <span>{minLabel}</span>
          <span className="text-center">{midLabel}</span>
          <span className="text-right">{maxLabel}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="min-w-[62px] rounded-lg border border-white/[0.08] bg-[#111722] px-2 py-1.5 text-center text-[13px] font-medium text-white/82">
          {value}°
        </span>
        {extraValue && <span className="max-w-[70px] truncate rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[11px] text-white/48">{extraValue}</span>}
      </div>
    </div>
  );
}
