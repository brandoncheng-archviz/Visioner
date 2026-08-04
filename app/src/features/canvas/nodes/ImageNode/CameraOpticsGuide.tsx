import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CAMERA_APERTURE_PRESETS, CAMERA_FOCAL_LENGTH_PRESETS } from './cameraControlDisplay';

const SURFACE_CLASS = 'border-white/[0.08] bg-[#111214] shadow-[0_12px_32px_rgba(0,0,0,0.45)]';

type OpticsGuideKind = 'focalLength' | 'aperture';

export function CameraFocalLengthGuide() {
  return <CameraOpticsGuide kind="focalLength" />;
}

export function CameraApertureGuide() {
  return <CameraOpticsGuide kind="aperture" />;
}

function CameraOpticsGuide({ kind }: { kind: OpticsGuideKind }) {
  const { t } = useTranslation();
  const presets = kind === 'focalLength' ? CAMERA_FOCAL_LENGTH_PRESETS : CAMERA_APERTURE_PRESETS;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t(`imageNode.camera.${kind}.guideLabel`)}
          className="nodrag nopan nowheel flex h-5 w-5 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/62"
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-image-camera-popover="true"
        side="top"
        sideOffset={8}
        align="center"
        className={`nodrag nopan nowheel z-[140] w-[440px] rounded-xl border p-4 text-left ${SURFACE_CLASS}`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="text-[13px] font-medium text-white/88">{t(`imageNode.camera.${kind}.guideTitle`)}</div>
        <div className="mt-2 divide-y divide-white/[0.055]">
          {presets.map((preset) => (
            <div key={preset.value} className="py-2.5 first:pt-1">
              <div className="flex items-center gap-2 text-[12px] font-medium text-white/78">
                <span className="tabular-nums text-white/90">{preset.displayValue}</span>
                <span className="text-white/34">|</span>
                <span>{t(preset.nameKey)}</span>
                {preset.recommended && (
                  <span className="rounded-md border border-[#2f6bff]/30 bg-[#2f6bff]/12 px-1.5 py-0.5 text-[10px] font-medium text-[#8eb0ff]">
                    {t('imageNode.camera.recommendedDefault')}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[11px] leading-[1.45] text-white/48">{t(preset.descriptionKey)}</div>
              <div className="mt-0.5 text-[11px] leading-[1.45] text-white/34">{t(preset.usageKey)}</div>
            </div>
          ))}
        </div>
        {kind === 'aperture' && (
          <div className="mt-2 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2.5 py-2 text-[10px] leading-[1.45] text-white/34">
            {t('imageNode.camera.aperture.semanticConstraint')}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
