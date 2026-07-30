import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ExteriorRenderWorkflowSource } from '../../types/imageNodeData.types';

type ImageNodeWorkflowSourceBadgeProps = {
  source: ExteriorRenderWorkflowSource;
  onFocusSource?: (sourceNodeId: string) => void;
};

const ATMOSPHERE_KEYS = [
  ['time', 'time'],
  ['weather', 'weather'],
  ['lighting', 'lighting'],
  ['style', 'style'],
] as const;

const TOGGLE_KEYS = ['addEntourage', 'addPeople', 'interiorLights', 'motionBlur'] as const;

export function ImageNodeWorkflowSourceBadge({
  source,
  onFocusSource,
}: ImageNodeWorkflowSourceBadgeProps) {
  const { t } = useTranslation();
  const snapshot = source.snapshot;
  const enabledToggles = snapshot
    ? TOGGLE_KEYS.filter((key) => snapshot.atmosphere[key])
    : [];
  const sourceTitle = snapshot?.sourceNodeTitle || t('exteriorRender.title');

  const translateAtmosphereValue = (
    category: 'time' | 'weather' | 'lighting' | 'style',
    value: string | null | undefined,
  ) => value ? t(`atmosphere.${category}.${value}`) : t('common.status.unset');

  return (
    <div className="group/workflow-source relative flex-shrink-0">
      <button
        type="button"
        className="nodrag nopan flex flex-col items-center justify-center gap-0.5 rounded-lg border border-[rgba(148,163,184,0.28)] bg-transparent text-[rgba(203,213,225,0.68)] transition-colors hover:border-[rgba(148,163,184,0.55)] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#CBD5E1]"
        style={{ width: 54, height: 50, padding: 4 }}
        aria-label={t('imageNode.workflowSource.tooltip')}
        onClick={() => onFocusSource?.(source.sourceNodeId)}
      >
        <Image className="h-4 w-4" strokeWidth={1.8} />
        <span style={{ fontSize: 14 }}>{t('imageNode.workflowSource.buttonLabel')}</span>
      </button>

      <div
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-[268px] rounded-lg border border-white/[0.08] bg-[#111214] p-3.5 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)] group-hover/workflow-source:block"
        style={{ opacity: 1, filter: 'none', backdropFilter: 'none' }}
      >
        <div className="text-[14px] font-semibold leading-5 text-[rgba(255,255,255,0.92)]">
          {t('imageNode.workflowSource.tooltip')}
        </div>
        <div className="mt-2.5 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-[12px] leading-[18px]">
          <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.sourceNode')}</span>
          <span className="truncate font-medium text-[rgba(255,255,255,0.88)]">{sourceTitle}</span>
          {snapshot && (
            <>
              <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.model')}</span>
              <span className="truncate font-medium text-[rgba(255,255,255,0.88)]">{snapshot.model}</span>
              <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.output')}</span>
              <span className="font-medium text-[rgba(255,255,255,0.88)]">{snapshot.aspectRatio} · {snapshot.resolution}</span>
              {ATMOSPHERE_KEYS.map(([field, category]) => (
                <div key={field} className="contents">
                  <span className="text-[rgba(255,255,255,0.58)]">{t(`atmosphere.fields.${field}`)}</span>
                  <span className="font-medium text-[rgba(255,255,255,0.88)]">
                    {translateAtmosphereValue(category, snapshot.atmosphere[field])}
                  </span>
                </div>
              ))}
              <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.toggles')}</span>
              <span className="font-medium text-[rgba(255,255,255,0.88)]">
                {enabledToggles.length > 0
                  ? enabledToggles.map((key) => t(`atmosphere.toggles.${key}.label`)).join(' / ')
                  : t('imageNode.workflowSource.noneEnabled')}
              </span>
              <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.channels')}</span>
              <span className="font-medium text-[rgba(255,255,255,0.88)]">
                {snapshot.renderChannels.length > 0
                  ? snapshot.renderChannels.map((channel) => t(`renderChannel.names.${channel}`)).join(' / ')
                  : t('imageNode.workflowSource.noChannels')}
              </span>
              <span className="text-[rgba(255,255,255,0.58)]">{t('imageNode.workflowSource.prompt')}</span>
              <span className="font-medium text-[rgba(255,255,255,0.88)]">
                {t(snapshot.hasPrompt
                  ? 'imageNode.workflowSource.promptEntered'
                  : 'imageNode.workflowSource.promptEmpty')}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
