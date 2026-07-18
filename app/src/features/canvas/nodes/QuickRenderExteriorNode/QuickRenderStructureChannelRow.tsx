import { Eye, EyeOff, Trash2 } from 'lucide-react';
import type { QuickRenderStructureChannel } from './quickRenderExterior.types';

type QuickRenderStructureChannelRowProps = {
  channel: QuickRenderStructureChannel;
  onToggle: () => void;
  onWeightChange: (weight: number) => void;
  onRemove: () => void;
};

export function QuickRenderStructureChannelRow({
  channel,
  onToggle,
  onWeightChange,
  onRemove,
}: QuickRenderStructureChannelRowProps) {
  const enabled = channel.enabled !== false;
  return (
    <div className={`grid grid-cols-[28px_42px_1fr_92px_34px_28px] items-center gap-2 rounded-[10px] border border-white/[0.07] bg-white/[0.035] px-2 py-2 transition-opacity ${enabled ? 'opacity-100' : 'opacity-45'}`}>
      <button
        type="button"
        className={`nodrag flex h-7 w-7 items-center justify-center rounded-[7px] transition hover:bg-white/[0.06] ${enabled ? 'text-[#60a5fa] hover:text-[#7aa7ff]' : 'text-white/38 hover:text-white/58'}`}
        onClick={onToggle}
      >
        {enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
      <img
        src={channel.imageUrl}
        alt={channel.name}
        className="h-[42px] w-[42px] rounded-[7px] object-cover"
        draggable={false}
        onDragStart={(event) => event.preventDefault()}
      />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium text-white/86">{channel.name}</div>
        <div className="truncate text-[11px] text-white/42">{channel.description}</div>
      </div>
      <input
        className="nodrag h-1.5 accent-[#22d3ee]"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={channel.weight}
        onChange={(event) => onWeightChange(Number(event.target.value))}
        onPointerDown={(event) => event.stopPropagation()}
      />
      <span className="text-right text-[12px] tabular-nums text-white/58">{channel.weight.toFixed(2)}</span>
      <button type="button" className="nodrag flex h-7 w-7 items-center justify-center rounded-[7px] text-white/48 hover:bg-white/[0.06] hover:text-white/78" onClick={onRemove}>
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
