type QuickRenderPromptPanelProps = {
  value: string;
  onChange: (value: string) => void;
};

export function QuickRenderPromptPanel({ value, onChange }: QuickRenderPromptPanelProps) {
  const safeValue = value.slice(0, 1000);
  return (
    <section className="space-y-2 pb-4">
      <div className="text-[13px] font-medium text-white/80">提示词</div>
      <div className="rounded-[12px] border border-white/[0.08] bg-black/15 p-3">
        <textarea
          value={safeValue}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          placeholder="输入补充描述，支持指定材质、细节、氛围等..."
          className="nodrag h-[64px] w-full resize-none bg-transparent text-[13px] leading-5 text-white/78 outline-none placeholder:text-white/28"
          onPointerDown={(event) => event.stopPropagation()}
        />
        <div className="text-right text-[11px] text-white/32">{safeValue.length} / 1000</div>
      </div>
    </section>
  );
}
