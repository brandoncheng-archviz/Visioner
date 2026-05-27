import { Clock, Cloud, Compass, Droplets, Ruler, Sun, Thermometer } from 'lucide-react';
import type { SunSkyNodeDerived } from './sunSkyNode.types';

export interface SunSkyNodeInfoProps {
  elevation: number;
  azimuth: number;
  derived: SunSkyNodeDerived;
}

export function SunSkyNodeInfo({ elevation, azimuth, derived }: SunSkyNodeInfoProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-semibold text-white/88">当前光照信息</h3>
      <div className="grid grid-cols-2 gap-2">
        <InfoItem icon={<Clock className="h-3.5 w-3.5" />} label="时间段" value={derived.timeLabel} />
        <InfoItem icon={<Sun className="h-3.5 w-3.5" />} label="太阳高度" value={`${elevation}°`} />
        <InfoItem icon={<Cloud className="h-3.5 w-3.5" />} label="天空" value={derived.skyLabel} />
        <InfoItem icon={<Compass className="h-3.5 w-3.5" />} label="太阳方位" value={`${azimuth}° ${derived.directionLabel}`} />
        <InfoItem icon={<Thermometer className="h-3.5 w-3.5" />} label="阳光色温" value={`${derived.colorTemp}K`} />
        <InfoItem icon={<Ruler className="h-3.5 w-3.5" />} label="阴影长度" value={derived.shadowLengthLabel} />
        <InfoItem icon={<Sun className="h-3.5 w-3.5" />} label="阳光强度" value={derived.sunIntensity.toFixed(2)} />
        <InfoItem icon={<Droplets className="h-3.5 w-3.5" />} label="阴影虚化" value={derived.shadowBlurLabel} />
      </div>
      <div>
        <h4 className="mb-1 text-xs font-semibold text-white/86">摘要</h4>
        <p className="text-xs leading-relaxed text-white/62">{derived.summary}</p>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid items-center rounded border border-white/[0.07] bg-white/[0.02] px-2 py-1.5" style={{ gridTemplateColumns: '18px 72px minmax(0, 1fr)' }}>
      <span className="text-white/42">{icon}</span>
      <span className="text-xs text-white/48">{label}</span>
      <span className="truncate text-right text-xs font-medium text-white/76">{value}</span>
    </div>
  );
}
