import { Compass, Sun } from 'lucide-react';
import type { SyntheticEvent } from 'react';

export interface SunSkyNodeControlsProps {
  elevation: number;
  azimuth: number;
  directionLabel?: string;
  layout?: 'inline' | 'stacked';
  onElevationChange: (value: number) => void;
  onAzimuthChange: (value: number) => void;
}

export function SunSkyNodeControls({
  elevation,
  azimuth,
  directionLabel,
  layout = 'inline',
  onElevationChange,
  onAzimuthChange,
}: SunSkyNodeControlsProps) {
  const stacked = layout === 'stacked';

  return (
    <div className={stacked ? 'space-y-2' : 'space-y-3'}>
      <SunSlider
        icon={<Sun className="h-4 w-4" />}
        label="太阳高度"
        value={elevation}
        min={0}
        max={90}
        step={3}
        minLabel="0°"
        midLabel="45°"
        maxLabel="90°"
        stacked={stacked}
        onChange={onElevationChange}
      />
      <div className={stacked ? 'my-2 h-px bg-white/[0.045]' : 'h-px bg-white/[0.06]'} />
      <SunSlider
        icon={<Compass className="h-4 w-4" />}
        label="太阳方位"
        value={azimuth}
        min={0}
        max={360}
        step={5}
        minLabel="0°"
        midLabel="180°"
        maxLabel="360°"
        extraValue={stacked ? undefined : directionLabel}
        stacked={stacked}
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
  stacked = false,
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
  stacked?: boolean;
  onChange: (value: number) => void;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  const stopSliderEvent = (event: SyntheticEvent) => {
    event.stopPropagation();
  };

  const slider = (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onWheel={stopSliderEvent}
        onPointerDown={stopSliderEvent}
        onPointerMove={stopSliderEvent}
        onMouseDown={stopSliderEvent}
        onTouchStart={stopSliderEvent}
        onTouchMove={stopSliderEvent}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
        style={{
          background: `linear-gradient(to right, #208cff 0%, #208cff ${percent}%, rgba(255,255,255,0.12) ${percent}%, rgba(255,255,255,0.12) 100%)`,
        }}
      />
      <div className={`${stacked ? 'mt-2' : 'mt-1.5'} grid grid-cols-3 text-[13px] text-white/32`}>
        <span>{minLabel}</span>
        <span className="text-center">{midLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </>
  );

  const title = (
    <div className={`flex items-center ${stacked ? 'gap-2 text-[13px] font-medium' : 'gap-2 text-[15px] font-semibold'} text-white/78`}>
      <span className={`${stacked ? 'h-6 w-6' : 'h-7 w-7'} flex shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/45 ${stacked ? '[&_svg]:h-3.5 [&_svg]:w-3.5' : '[&_svg]:h-4 [&_svg]:w-4'}`}>
        {icon}
      </span>
      <span className="truncate leading-none">{label}</span>
    </div>
  );

  const valueDisplay = (
    <span
      className={`${stacked ? 'h-7 min-w-[52px] rounded-lg px-2 text-[14px]' : 'min-w-[62px] rounded-lg px-2 py-1.5 text-[15px]'} inline-flex items-center justify-center border font-medium transition-colors hover:bg-white/[0.06]`}
      style={{
        color: 'rgba(255,255,255,0.92)',
        background: 'rgba(255,255,255,0.04)',
        borderColor: 'rgba(255,255,255,0.10)',
      }}
    >
      {value}°
    </span>
  );

  return (
    <div
      className={`nodrag nopan nowheel ${stacked ? '' : 'grid items-center gap-3'}`}
      style={stacked ? undefined : { gridTemplateColumns: '96px minmax(0, 1fr) 70px' }}
      onWheel={stopSliderEvent}
      onPointerDown={stopSliderEvent}
      onPointerMove={stopSliderEvent}
      onMouseDown={stopSliderEvent}
      onTouchStart={stopSliderEvent}
      onTouchMove={stopSliderEvent}
    >
      {stacked ? (
        <>
          <div className="flex items-center justify-between gap-3">
            {title}
            {valueDisplay}
          </div>
          <div className="mt-2">
            {slider}
          </div>
        </>
      ) : (
        <>
          <div className="min-w-0">
            {title}
          </div>
          <div>
            {slider}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {valueDisplay}
            {extraValue && <span className="max-w-[70px] truncate rounded-md border border-white/[0.06] bg-white/[0.025] px-1.5 py-0.5 text-[13px] text-white/48">{extraValue}</span>}
          </div>
        </>
      )}
    </div>
  );
}
