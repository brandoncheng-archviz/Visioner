import { Clock, Cloud, Compass, Droplets, Ruler, Sun, Thermometer } from 'lucide-react';
import type { SunSkyNodeDerived } from './sunSkyNode.types';

export interface SunSkyNodeInfoProps {
  elevation: number;
  azimuth: number;
  derived: SunSkyNodeDerived;
}

export function SunSkyNodeInfo({ elevation, azimuth, derived }: SunSkyNodeInfoProps) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
      <div className="mb-3 text-[15px] font-semibold text-white/82">自动计算信息</div>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.45fr' }}>
        <div className="rounded-lg border border-white/[0.07] bg-[#111722]/70 p-3">
          <InfoRow icon={<Clock />} label="时间段" value={derived.timeLabel} />
          <InfoRow icon={<Cloud />} label="天空" value={derived.skyLabel} />
          <InfoRow icon={<Thermometer />} label="阳光色温" value={`${derived.colorTemp}K`} />
          <InfoRow icon={<Sun />} label="阳光强度" value={derived.sunIntensity.toFixed(2)} />
        </div>

        <div className="rounded-lg border border-white/[0.07] bg-[#111722]/70 p-3">
          <InfoRow icon={<Compass />} label="太阳方位" value={`${azimuth}° ${derived.directionLabel}`} />
          <InfoRow icon={<Sun />} label="太阳高度" value={`${elevation}°`} />
          <InfoRow icon={<Ruler />} label="阴影长度" value={derived.shadowLengthLabel} />
          <InfoRow icon={<Droplets />} label="阴影虚化" value={derived.shadowBlurLabel} />
          <div className="mt-2 grid border-t border-white/[0.06] pt-2" style={{ gridTemplateColumns: '22px 70px minmax(0, 1fr)' }}>
            <span className="text-white/40">
              <Ruler className="h-4 w-4" />
            </span>
            <span className="text-[13px] text-white/48">摘要</span>
            <p className="text-[13px] leading-relaxed text-white/62">{derived.summary}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="grid items-center border-b border-white/[0.055] py-2 last:border-b-0" style={{ gridTemplateColumns: '24px 86px minmax(0, 1fr)' }}>
      <span className="text-white/42 [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      <span className="text-[13px] text-white/48">{label}</span>
      <span className="truncate text-right text-[13px] font-medium text-white/76">{value}</span>
    </div>
  );
}
