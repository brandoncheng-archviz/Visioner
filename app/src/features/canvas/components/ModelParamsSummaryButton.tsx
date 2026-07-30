import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatModelParamsSummary } from '../utils/modelParams';

type ModelParamsSummaryButtonProps = {
  aspectRatio: string | undefined;
  resolutionTier: string;
  disabled?: boolean;
  onClick: () => void;
};

export const ModelParamsSummaryButton = forwardRef<HTMLButtonElement, ModelParamsSummaryButtonProps>(
  function ModelParamsSummaryButton({
    aspectRatio,
    resolutionTier,
    disabled = false,
    onClick,
  }, ref) {
    const { t } = useTranslation();
    const summary = formatModelParamsSummary(aspectRatio, resolutionTier, {
      adaptive: t('modelParams.aspectRatio.adaptive'),
      custom: t('modelParams.aspectRatio.customShort'),
    });

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="nodrag flex items-center gap-1 text-[14px] text-white/90 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:text-white/90"
      >
        <span>{summary}</span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 text-white/55" />
      </button>
    );
  },
);
