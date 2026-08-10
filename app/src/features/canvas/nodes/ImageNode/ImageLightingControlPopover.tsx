import { useEffect, useMemo, useRef, useState, type ReactNode, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, CloudFog, RotateCcw, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../../constants/canvasConstants';
import type { LightPreviewData } from '../../types/lightPreview.types';
import { SunSkyNodeControls } from '../SunSkyNode/SunSkyNodeControls';
import { ControlFooterSwitch, ControlSummaryChip, ImageNodeControlFooter } from './ImageNodeControlFooter';
import {
  IMAGE_LIGHTING_PRESETS,
  createImageLightingDraft,
  createImageLightingPreview,
  getCloudAmount,
  getFogLevel,
  getImageLightingDirection,
  type ImageLightingDraft,
} from './lightingControl';

const WIDTH = 736;
const VIEWPORT_MARGIN = 16;
const ANCHOR_GAP = 8;

export function ImageLightingControlPopover({
  anchorElement,
  value,
  disabled = false,
  onChange,
  onOpenChange,
}: {
  anchorElement: HTMLElement | null;
  value?: LightPreviewData | null;
  disabled?: boolean;
  onChange: (value: LightPreviewData | null) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const draft = useMemo(() => createImageLightingDraft(value), [value]);
  const [position, setPosition] = useState({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN });
  const configured = Boolean(value);
  const enabled = Boolean(value?.enabled);
  const parameterDisabled = disabled || !enabled;
  const preview = useMemo(() => createImageLightingPreview(draft, enabled), [draft, enabled]);
  const direction = getImageLightingDirection(draft.azimuth);
  const activePreset = IMAGE_LIGHTING_PRESETS.find((preset) => preset.id === draft.presetId);
  const cloudSemantic = getCloudAmount(draft.cloudAmount);
  const fogSemantic = getFogLevel(draft.fogAmount);

  useEffect(() => {
    if (!anchorElement) return;
    let frameId = 0;
    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const width = Math.min(WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const maxHeight = window.innerHeight - VIEWPORT_MARGIN * 2;
      const height = Math.min(panelRef.current?.getBoundingClientRect().height ?? maxHeight, maxHeight);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, rect.left + rect.width / 2 - width / 2),
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      const availableAbove = rect.top - ANCHOR_GAP - VIEWPORT_MARGIN;
      const availableBelow = window.innerHeight - VIEWPORT_MARGIN - rect.bottom - ANCHOR_GAP;
      const placeAbove = availableAbove >= height
        || (availableBelow < height && availableAbove >= availableBelow);
      const preferredTop = placeAbove
        ? rect.top - ANCHOR_GAP - height
        : rect.bottom + ANCHOR_GAP;
      const top = Math.min(preferredTop, window.innerHeight - height - VIEWPORT_MARGIN);
      setPosition({ left, top: Math.max(VIEWPORT_MARGIN, top) });
      frameId = window.requestAnimationFrame(updatePosition);
    };
    updatePosition();
    return () => window.cancelAnimationFrame(frameId);
  }, [anchorElement]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorElement?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [anchorElement, onOpenChange]);

  if (!anchorElement) return null;

  const updateDraft = (patch: Partial<ImageLightingDraft>) => {
    if (parameterDisabled) return;
    const nextDraft = { ...draft, ...patch, presetId: undefined };
    onChange(createImageLightingPreview(nextDraft, true));
  };

  const stopPanelEvent = (event: SyntheticEvent) => event.stopPropagation();

  return createPortal(
    <div
      ref={panelRef}
      data-image-lighting-popover="true"
      className="nodrag nopan nowheel fixed z-[120] flex flex-col overflow-hidden rounded-xl"
      style={{
        left: position.left,
        top: position.top,
        width: `min(${WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
        maxHeight: 'calc(100vh - 32px)',
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 18px 42px rgba(0,0,0,0.46)',
      }}
      onPointerDown={stopPanelEvent}
      onMouseDown={stopPanelEvent}
      onWheel={stopPanelEvent}
    >
      <header className="flex h-11 flex-none items-center justify-between border-b border-white/[0.06] bg-[#252526]/95 px-3.5 backdrop-blur-md">
        <div className="text-[14px] font-semibold text-white/90">{t('imageNode.lighting.header')}</div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-white/48 transition-colors hover:bg-white/[0.06] hover:text-white/82"
          aria-label={t('common.actions.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3.5">
        <div
          className="grid transition-opacity duration-200"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            opacity: enabled ? 1 : 0.34,
          }}
        >
          <div className="min-w-0 pr-3.5">
            <section>
              <SectionTitle>{t('imageNode.lighting.preview.title')}</SectionTitle>
              <div className="relative mt-1.5 aspect-video w-full overflow-hidden rounded-lg border border-white/[0.07] bg-[#14141a]">
                <img
                  src={preview.derived.previewImagePath}
                  alt={t('imageNode.lighting.preview.alt')}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/30 to-transparent px-2.5 pb-2 pt-7">
                  <span className="text-[12px] font-medium text-white/88">
                    {!configured
                      ? t('imageNode.lighting.followOriginal')
                      : activePreset
                        ? t(activePreset.labelKey)
                        : `${t('imageNode.lighting.custom')} · ${t(`imageNode.lighting.direction.${direction}`)}`}
                  </span>
                  <span className="rounded-md border border-white/10 bg-black/35 px-2 py-1 text-[11px] tabular-nums text-white/68">
                    {draft.azimuth}° / {draft.elevation}°
                  </span>
                </div>
              </div>
            </section>

            <section className="mt-3">
              <SectionTitle>{t('imageNode.lighting.presetsTitle')}</SectionTitle>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {IMAGE_LIGHTING_PRESETS.map((preset) => {
                  const selected = draft.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={parameterDisabled}
                      title={t(preset.descriptionKey)}
                      onClick={() => onChange(createImageLightingPreview({ ...preset, presetId: preset.id }, true))}
                      className={`h-7 min-w-0 rounded-md border px-2 text-[11px] font-medium transition-colors disabled:opacity-45 ${selected
                        ? 'border-[#2f6bff]/55 bg-[#2f6bff]/15 text-[#b8caff]'
                        : 'border-white/[0.07] bg-white/[0.025] text-white/58 hover:border-white/[0.13] hover:bg-white/[0.055] hover:text-white/82'}`}
                    >
                      <span className="block truncate">{t(preset.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="min-w-0 border-l border-white/[0.06] pl-3.5">
            <section>
              <SectionTitle>{t('imageNode.lighting.sun.title')}</SectionTitle>
              <div className="mt-1.5 [&>div>div:nth-child(odd)]:min-h-[48px]">
                <SunSkyNodeControls
                  elevation={draft.elevation}
                  azimuth={draft.azimuth}
                  layout="inline"
                  elevationLabel={t('imageNode.lighting.sun.elevation')}
                  azimuthLabel={t('imageNode.lighting.sun.direction')}
                  showRangeLabels={false}
                  disabled={parameterDisabled}
                  onElevationChange={(elevation) => updateDraft({ elevation })}
                  onAzimuthChange={(azimuth) => updateDraft({ azimuth })}
                />
              </div>
            </section>

            <section className="mt-3 border-t border-white/[0.06] pt-3">
              <SectionTitle>{t('imageNode.lighting.sky.title')}</SectionTitle>
              <div className="mt-1.5">
                <PercentageSlider
                  icon={<Cloud className="h-3.5 w-3.5" />}
                  label={t('imageNode.lighting.sky.cloudAmount')}
                  value={draft.cloudAmount}
                  semantic={t(`imageNode.lighting.cloud.${cloudSemantic}`)}
                  disabled={parameterDisabled}
                  onChange={(cloudAmount) => updateDraft({ cloudAmount })}
                />
                <div className="h-px bg-white/[0.045]" />
                <PercentageSlider
                  icon={<CloudFog className="h-3.5 w-3.5" />}
                  label={t('imageNode.lighting.sky.fogAmount')}
                  value={draft.fogAmount}
                  semantic={t(`imageNode.lighting.fog.${fogSemantic}`)}
                  disabled={parameterDisabled}
                  onChange={(fogAmount) => updateDraft({ fogAmount })}
                />
              </div>
            </section>
          </div>
        </div>
      </div>

      <div className="flex-none border-t border-white/[0.06] bg-[#252526]/95 p-3.5 backdrop-blur-md">
        <ImageNodeControlFooter
          label={t('imageNode.lighting.currentSettings')}
          summaryOpacity={configured ? (enabled ? 1 : 0.25) : 1}
          labelAction={configured ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange(null)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-white/28 transition-colors hover:bg-white/[0.05] hover:text-white/62 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={t('common.actions.reset')}
              title={t('common.actions.reset')}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : undefined}
          controls={(
            <ControlFooterSwitch
              label={t('imageNode.lighting.title')}
              checked={enabled}
              disabled={disabled}
              onCheckedChange={(checked) => onChange(createImageLightingPreview(draft, checked))}
            />
          )}
        >
          {configured ? (
            <>
              <ControlSummaryChip>{activePreset ? t(activePreset.labelKey) : t('imageNode.lighting.custom')}</ControlSummaryChip>
              <ControlSummaryChip>{draft.elevation}°</ControlSummaryChip>
              <ControlSummaryChip>{draft.azimuth}°</ControlSummaryChip>
              <ControlSummaryChip>{t(`imageNode.lighting.cloud.${cloudSemantic}`)}</ControlSummaryChip>
              <ControlSummaryChip className="hidden min-[760px]:inline-flex">{t(`imageNode.lighting.fog.${fogSemantic}`)}</ControlSummaryChip>
            </>
          ) : (
            <ControlSummaryChip muted>{t('imageNode.lighting.followOriginal')}</ControlSummaryChip>
          )}
        </ImageNodeControlFooter>
      </div>
    </div>,
    document.body,
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] font-medium text-white/62">
      {children}
    </div>
  );
}

function PercentageSlider({
  icon,
  label,
  value,
  semantic,
  disabled,
  onChange,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  semantic: string;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  const stopEvent = (event: SyntheticEvent) => event.stopPropagation();
  return (
    <div className="grid min-h-[48px] items-center gap-3" style={{ gridTemplateColumns: '96px minmax(0, 1fr) 100px' }}>
      <div className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-white/72">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/45">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={stopEvent}
        onPointerMove={stopEvent}
        onWheel={stopEvent}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-not-allowed"
        style={{ background: `linear-gradient(to right, #2f6bff 0%, #2f6bff ${value}%, rgba(255,255,255,0.12) ${value}%, rgba(255,255,255,0.12) 100%)` }}
      />
      <div className="whitespace-nowrap text-right text-[12px] tabular-nums text-white/72">{value}% · {semantic}</div>
    </div>
  );
}
