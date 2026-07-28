import { Image } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { QuickRenderWorkflowSource } from '../../types/imageNodeData.types';

type ImageNodeWorkflowSourceBadgeProps = {
  source: QuickRenderWorkflowSource;
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
  const sourceTitle = snapshot?.sourceNodeTitle || t('quickRenderExterior.title');

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
        className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-[248px] rounded-lg border border-white/[0.10] p-3 text-left shadow-[0_14px_34px_rgba(0,0,0,0.58)] group-hover/workflow-source:block"
        style={{ background: '#202024', opacity: 1, filter: 'none' }}
      >
        <div className="text-[12px] font-semibold text-white/86">{t('imageNode.workflowSource.tooltip')}</div>
        <div className="mt-2 grid grid-cols-[64px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[11px] leading-4">
          <span className="text-white/38">{t('imageNode.workflowSource.sourceNode')}</span>
          <span className="truncate text-white/72">{sourceTitle}</span>
          {snapshot && (
            <>
              <span className="text-white/38">{t('imageNode.workflowSource.model')}</span>
              <span className="truncate text-white/72">{snapshot.model}</span>
              <span className="text-white/38">{t('imageNode.workflowSource.output')}</span>
              <span className="text-white/72">{snapshot.aspectRatio} · {snapshot.resolution}</span>
              {ATMOSPHERE_KEYS.map(([field, category]) => (
                <div key={field} className="contents">
                  <span className="text-white/38">{t(`atmosphere.fields.${field}`)}</span>
                  <span className="text-white/72">
                    {translateAtmosphereValue(category, snapshot.atmosphere[field])}
                  </span>
                </div>
              ))}
              <span className="text-white/38">{t('imageNode.workflowSource.toggles')}</span>
              <span className="text-white/72">
                {enabledToggles.length > 0
                  ? enabledToggles.map((key) => t(`atmosphere.toggles.${key}.label`)).join(' / ')
                  : t('imageNode.workflowSource.noneEnabled')}
              </span>
              <span className="text-white/38">{t('imageNode.workflowSource.channels')}</span>
              <span className="text-white/72">
                {snapshot.renderChannels.length > 0
                  ? snapshot.renderChannels.map((channel) => t(`renderChannel.names.${channel}`)).join(' / ')
                  : t('imageNode.workflowSource.noChannels')}
              </span>
              <span className="text-white/38">{t('imageNode.workflowSource.prompt')}</span>
              <span className="text-white/72">
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
