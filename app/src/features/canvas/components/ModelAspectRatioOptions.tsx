import {
  ASPECT_RATIO_PRESETS,
  type AspectRatioPreset,
} from '../utils/modelParams';

export function ModelAspectRatioOptions({
  selectedValue,
  adaptiveLabel,
  disabled = false,
  onSelect,
}: {
  selectedValue: AspectRatioPreset | null;
  adaptiveLabel: string;
  disabled?: boolean;
  onSelect: (value: AspectRatioPreset) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ASPECT_RATIO_PRESETS.map((value) => {
        const isSelected = selectedValue === value;
        return (
          <button
            key={value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(value)}
            className="flex h-9 items-center justify-center rounded-md px-1.5 text-center text-[14px] font-medium transition-colors hover:bg-white/[0.065] disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.62)',
              background: isSelected ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
              border: isSelected ? '1px solid rgba(255,255,255,0.62)' : '1px solid rgba(255,255,255,0.075)',
            }}
          >
            {value === 'adaptive' ? adaptiveLabel : value}
          </button>
        );
      })}
    </div>
  );
}
