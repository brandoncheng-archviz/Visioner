import { ArrowUp, Zap } from 'lucide-react';

type GenerationSubmitControlProps = {
  creditCost: number;
  isGenerating: boolean;
  disabled: boolean;
  creditTitle: string;
  buttonTitle: string;
  onGenerate: () => void;
};

export function GenerationSubmitControl({
  creditCost,
  isGenerating,
  disabled,
  creditTitle,
  buttonTitle,
  onGenerate,
}: GenerationSubmitControlProps) {
  return (
    <div className="relative flex shrink-0 items-center gap-2">
      <div
        className="flex h-[34px] min-w-[38px] items-center justify-center gap-1 text-[13px] font-medium text-white/52"
        title={creditTitle}
      >
        <Zap className="h-3 w-3 fill-current text-[#b8a36d]" />
        <span>{creditCost}</span>
      </div>
      <button
        type="button"
        onClick={onGenerate}
        disabled={disabled}
        className="nodrag nowheel flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors"
        style={{
          background: isGenerating ? 'rgba(255,255,255,0.14)' : '#ffffff',
          opacity: disabled ? 0.55 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        title={buttonTitle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isGenerating ? (
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
            <path d="M8 2A6 6 0 0 1 14 8" stroke="#000" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <ArrowUp className="h-4 w-4 text-black" />
        )}
      </button>
    </div>
  );
}
