import { Plus, X } from 'lucide-react';
import type { SunSkySnapshot } from '../types/sunSky.types';

export interface SunSkySnapshotStripProps {
  snapshots: SunSkySnapshot[];
  onAddSnapshot: () => void;
  onRemoveSnapshot: (id: string) => void;
}

export function SunSkySnapshotStrip({ snapshots, onAddSnapshot, onRemoveSnapshot }: SunSkySnapshotStripProps) {
  const visibleSnapshots = snapshots.slice(0, 3);

  return (
    <div className="h-full">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-sm font-semibold text-white">快照</h3>
        <span className="text-sm text-white/74">{snapshots.length}</span>
      </div>

      <div className="grid h-[138px] grid-cols-4 gap-3">
        {visibleSnapshots.map((snapshot, index) => (
          <SnapshotCard
            key={snapshot.id}
            snapshot={snapshot}
            index={index}
            current={index === visibleSnapshots.length - 1}
            onRemove={() => onRemoveSnapshot(snapshot.id)}
          />
        ))}

        {Array.from({ length: Math.max(0, 3 - visibleSnapshots.length) }).map((_, index) => (
          <EmptySnapshot key={`empty-${index}`} label={`快照 0${visibleSnapshots.length + index + 1}`} />
        ))}

        <button
          type="button"
          onClick={onAddSnapshot}
          className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/[0.12] bg-white/[0.018] text-white/54 transition hover:border-[#1f7dff]/60 hover:bg-[#1f7dff]/10 hover:text-white"
        >
          <Plus className="h-6 w-6" />
          <span className="text-xs">保存当前为新快照</span>
        </button>
      </div>
    </div>
  );
}

function SnapshotCard({
  snapshot,
  index,
  current,
  onRemove,
}: {
  snapshot: SunSkySnapshot;
  index: number;
  current: boolean;
  onRemove: () => void;
}) {
  const createdAt = new Date(snapshot.generation.createdAt);
  const dateLabel = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}-${String(createdAt.getDate()).padStart(2, '0')}`;
  const timeLabel = `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`;

  return (
    <div
      className="group relative h-full overflow-hidden rounded-lg border bg-[#151923]"
      style={{
        borderColor: current ? '#1f7dff' : 'rgba(255,255,255,0.08)',
        boxShadow: current ? '0 0 0 1px rgba(31,125,255,0.38)' : 'none',
      }}
    >
      <SnapshotPreview snapshot={snapshot} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/16 to-transparent" />
      {current && (
        <div className="absolute right-2 top-2 rounded bg-[#1f7dff] px-1.5 py-0.5 text-[10px] font-medium text-white">当前</div>
      )}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute right-2 top-2 hidden h-5 w-5 items-center justify-center rounded bg-black/50 text-white/80 transition hover:text-white group-hover:flex"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <div className="text-sm font-medium text-white">快照 {String(index + 1).padStart(2, '0')}</div>
        <div className="text-xs text-white/55">
          {dateLabel} {timeLabel}
        </div>
        <div className="mt-2 flex gap-2 text-[11px] text-white/62">
          <span className="rounded bg-white/[0.08] px-1.5 py-0.5">3630px</span>
          <span className="rounded bg-white/[0.08] px-1.5 py-0.5">可在 1K/2K/4K</span>
        </div>
      </div>
    </div>
  );
}

function EmptySnapshot({ label }: { label: string }) {
  return (
    <div className="h-full overflow-hidden rounded-lg border border-white/[0.08] bg-[#151923] opacity-55">
      <div className="h-[72px] bg-gradient-to-b from-[#2c3443] to-[#121620]" />
      <div className="p-3">
        <div className="text-sm text-white/62">{label}</div>
        <div className="mt-1 text-xs text-white/35">尚未保存</div>
      </div>
    </div>
  );
}

function SnapshotPreview({ snapshot }: { snapshot: SunSkySnapshot }) {
  const { sunSkyState } = snapshot;
  const sunX = 50 + (((sunSkyState.sun.azimuth <= 180 ? sunSkyState.sun.azimuth : sunSkyState.sun.azimuth - 360) / 180) * 36);
  const sunY = 55 - (sunSkyState.sun.elevation / 90) * 42;

  if (snapshot.previewImageUrl) {
    return <img src={snapshot.previewImageUrl} alt="" className="h-full w-full object-cover" />;
  }

  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(to bottom, ${sunSkyState.derived.skyTopColor}, ${sunSkyState.derived.skyHorizonColor} 58%, #151922 59%, #10131a)`,
      }}
    >
      <div
        className="absolute rounded-full"
        style={{
          left: `${sunX}%`,
          top: `${sunY}%`,
          width: 12,
          height: 12,
          background: sunSkyState.derived.sunColor,
          boxShadow: `0 0 22px ${sunSkyState.derived.sunColor}`,
        }}
      />
      <div className="absolute bottom-9 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full bg-[#2b3340]" />
    </div>
  );
}
