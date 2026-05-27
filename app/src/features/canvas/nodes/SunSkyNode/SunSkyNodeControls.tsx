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
    <div className="space-y-4">
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
    <div className="nodrag nowheel grid items-center gap-5" style={{ gridTemplateColumns: '132px minmax(0, 1fr) 86px' }}>
      <div className="min-w-0">
        <div className="flex items-center gap-3 text-[15px] font-semibold text-white/82">
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/45 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
          <span className="truncate">{label}</span>
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
          className="h-2 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(to right, #208cff 0%, #208cff ${percent}%, rgba(255,255,255,0.12) ${percent}%, rgba(255,255,255,0.12) 100%)`,
          }}
        />
        <div className="mt-2 grid grid-cols-3 text-[13px] text-white/38">
          <span>{minLabel}</span>
          <span className="text-center">{midLabel}</span>
          <span className="text-right">{maxLabel}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="min-w-[78px] rounded-lg border border-white/[0.08] bg-[#111722] px-3 py-2 text-center text-[15px] font-medium text-white/82">
          {value}°
        </span>
        {extraValue && <span className="max-w-[86px] truncate rounded-md border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 text-[12px] text-white/48">{extraValue}</span>}
      </div>
    </div>
  );
}
