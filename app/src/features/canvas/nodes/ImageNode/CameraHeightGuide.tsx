import { useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CAMERA_HEIGHT_PRESETS } from './cameraControlDisplay';

const SURFACE_CLASS = 'border-white/[0.08] bg-[#111214] shadow-[0_12px_32px_rgba(0,0,0,0.45)]';

export function CameraHeightGuide() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) globalThis.clearTimeout(closeTimerRef.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimerRef.current = globalThis.setTimeout(() => setOpen(false), 120);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('imageNode.camera.height.guideLabel')}
          className="nodrag nopan nowheel flex h-5 w-5 items-center justify-center rounded-md text-white/30 transition-colors hover:bg-white/[0.05] hover:text-white/62"
          onPointerEnter={() => { cancelClose(); setOpen(true); }}
          onPointerLeave={scheduleClose}
        >
          <Info className="h-3.5 w-3.5" strokeWidth={1.6} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        data-image-camera-popover="true"
        side="top"
        sideOffset={8}
        align="start"
        className={`nodrag nopan nowheel z-[140] w-[328px] rounded-xl border p-3.5 text-left ${SURFACE_CLASS}`}
        onPointerEnter={cancelClose}
        onPointerLeave={scheduleClose}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="text-[13px] font-medium text-white/88">{t('imageNode.camera.height.guideTitle')}</div>
        <div className="mt-2 divide-y divide-white/[0.055]">
          {CAMERA_HEIGHT_PRESETS.map((preset) => (
            <div key={preset.value} className="grid grid-cols-[72px_48px_1fr] items-start gap-2 py-2 first:pt-1">
              <span className="text-[12px] font-medium text-white/72">{t(preset.labelKey)}</span>
              <span className="text-[11px] tabular-nums text-white/46">{preset.fixedValue}</span>
              <span className="text-[11px] leading-[1.45] text-white/38">{t(preset.descriptionKey)}</span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
