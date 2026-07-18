import { ArrowUp, Loader2, Zap } from 'lucide-react';
import type { QuickRenderExteriorModelParams } from './quickRenderExterior.types';

type QuickRenderFooterProps = {
  params: QuickRenderExteriorModelParams;
  isGenerating: boolean;
  creditCost: number;
  onChange: (params: QuickRenderExteriorModelParams) => void;
  onGenerate: () => void;
};

export function QuickRenderFooter({
  params,
  isGenerating,
  creditCost,
  onChange,
  onGenerate,
}: QuickRenderFooterProps) {
  return (
    <footer className="flex h-[62px] shrink-0 items-center gap-3 border-t border-white/[0.07] px-4">
      <select
        value={params.model}
        onChange={(event) => onChange({ ...params, model: event.target.value })}
        className="nodrag h-9 max-w-[164px] rounded-[9px] border border-transparent bg-transparent px-2 text-[14px] text-white/82 outline-none hover:bg-white/[0.05]"
      >
        <option>Nano Banana 2</option>
        <option>Nano Banana Pro</option>
        <option>GPT Image 2</option>
      </select>
      <select
        value={`${params.aspectRatio} · ${params.resolution}`}
        onChange={(event) => {
          const [aspectRatio, resolution] = event.target.value.split(' · ');
          onChange({ ...params, aspectRatio, resolution });
        }}
        className="nodrag h-9 rounded-[9px] border border-transparent bg-transparent px-2 text-[14px] text-white/82 outline-none hover:bg-white/[0.05]"
      >
        <option>1:1 · 2K</option>
        <option>16:9 · 2K</option>
        <option>4:3 · 2K</option>
        <option>1:1 · 4K</option>
      </select>
      <div className="ml-auto flex items-center gap-2 text-[13px] text-white/54">
        <Zap className="h-4 w-4 text-[#d6b65f]" />
        {creditCost}
      </div>
      <button
        type="button"
        disabled={isGenerating}
        className="nodrag flex h-10 w-10 items-center justify-center rounded-[10px] bg-white/88 text-black transition-opacity hover:bg-white disabled:opacity-55"
        onClick={onGenerate}
      >
        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
      </button>
    </footer>
  );
}
