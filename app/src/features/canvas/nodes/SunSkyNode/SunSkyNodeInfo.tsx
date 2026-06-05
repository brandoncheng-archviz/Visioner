import { useState } from 'react';
import { ChevronDown, Clock, Cloud, Compass, Droplets, Ruler, Sun, Thermometer } from 'lucide-react';
import type { SunSkyNodeDerived } from './sunSkyNode.types';

export interface SunSkyNodeInfoProps {
  elevation: number;
  azimuth: number;
  derived: SunSkyNodeDerived;
  compact?: boolean;
}

export function SunSkyNodeInfo({ elevation, azimuth, derived, compact = false }: SunSkyNodeInfoProps) {
  const [expanded, setExpanded] = useState(false);
  const summary = `${derived.timeLabel} · ${derived.directionLabel} · ${derived.skyLabel} · ${derived.shadowLengthLabel} · ${derived.shadowBlurLabel}`;

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025]">
      <div className={compact ? 'px-3 py-2' : 'px-3 py-2.5'}>
        <div className={compact ? 'mb-1 text-[13px] font-medium text-white/45' : 'mb-1.5 text-[14px] font-medium text-white/45'}>当前光影</div>
        <p className={compact ? 'truncate text-[14px] font-medium text-white/76' : 'truncate text-[15px] font-medium text-white/76'}>{summary}</p>
      </div>

      <button
        type="button"
        className={`nodrag nowheel flex w-full items-center justify-between border-t border-white/[0.06] px-3 text-[14px] text-white/48 transition hover:bg-white/[0.035] hover:text-white/72 ${compact ? 'py-1.5' : 'py-2'}`}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          setExpanded((value) => !value);
        }}
      >
        <span>详细信息</span>
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </button>

      {expanded && (
        <div className="grid gap-2 border-t border-white/[0.06] p-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="rounded-lg border border-white/[0.07] bg-[#111722]/70 px-2.5 py-1.5">
            <InfoRow icon={<Clock />} label="时间段" value={derived.timeLabel} />
            <InfoRow icon={<Cloud />} label="天空" value={derived.skyLabel} />
            <InfoRow icon={<Thermometer />} label="阳光色温" value={`${derived.colorTemp}K`} />
            <InfoRow icon={<Sun />} label="阳光强度" value={derived.sunIntensity.toFixed(2)} />
          </div>

          <div className="rounded-lg border border-white/[0.07] bg-[#111722]/70 px-2.5 py-1.5">
            <InfoRow icon={<Sun />} label="太阳高度" value={`${elevation}°`} />
            <InfoRow icon={<Compass />} label="太阳方位" value={`${azimuth}° · ${derived.directionLabel}`} />
            <InfoRow icon={<Ruler />} label="阴影长度" value={derived.shadowLengthLabel} />
            <InfoRow icon={<Droplets />} label="阴影虚化" value={derived.shadowBlurLabel} />
          </div>

          <p className="col-span-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[14px] leading-relaxed text-white/58">{derived.summary}</p>
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid items-center border-b border-white/[0.055] py-1.5 last:border-b-0" style={{ gridTemplateColumns: '20px 62px minmax(0, 1fr)' }}>
      <span className="text-white/42 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="text-[14px] text-white/48">{label}</span>
      <span className="truncate text-right text-[14px] font-medium text-white/76">{value}</span>
    </div>
  );
}
