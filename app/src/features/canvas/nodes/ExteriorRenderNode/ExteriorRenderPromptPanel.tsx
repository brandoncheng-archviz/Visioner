type ExteriorRenderPromptPanelProps = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

export function ExteriorRenderPromptPanel({ value, disabled = false, onChange }: ExteriorRenderPromptPanelProps) {
  const { t } = useTranslation();
  const safeValue = value.slice(0, 1000);
  return (
    <section className={disabled ? 'space-y-2 opacity-60' : 'space-y-2'} aria-disabled={disabled}>
      <div className="text-[13px] font-medium text-white/80">{t('exteriorRender.sections.prompt.title')}</div>
      <div className="rounded-[12px] border border-white/[0.08] bg-black/15 p-3">
        <textarea
          value={safeValue}
          maxLength={1000}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('exteriorRender.prompt.placeholder')}
          className="nodrag h-[64px] w-full resize-none bg-transparent text-[13px] leading-5 text-white/78 outline-none placeholder:text-white/28"
          onPointerDown={(event) => event.stopPropagation()}
        />
        <div className="text-right text-[11px] text-white/32">{safeValue.length} / 1000</div>
      </div>
    </section>
  );
}
import { useTranslation } from 'react-i18next';
