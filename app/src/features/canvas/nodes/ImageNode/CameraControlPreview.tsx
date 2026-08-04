import { useTranslation } from 'react-i18next';
import type { CameraControlData } from '../../types/imageNodeData.types';
import { getCameraHeightPreset, resolveCameraControl } from './cameraControlDisplay';

export function CameraControlPreview({ value }: { value?: CameraControlData }) {
  const { t } = useTranslation();
  const camera = resolveCameraControl(value);
  const parameters = [
    t(getCameraHeightPreset(camera.height).labelKey),
    `${camera.focalLength}mm`,
    camera.aperture,
    camera.twoPointPerspective ? t('imageNode.camera.twoPointPerspective') : null,
  ].filter((item): item is string => item !== null);

  return (
    <div
      data-camera-control-preview="true"
      data-camera-control-state={camera.enabled ? 'enabled' : 'disabled'}
      className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max min-w-[220px] -translate-x-1/2 rounded-lg border border-white/[0.08] bg-[#111214] px-3.5 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.45)] group-hover/camera:block ${camera.enabled ? '' : 'opacity-55'}`}
    >
      <div className="flex items-center justify-between gap-5 text-[12px] font-medium">
        <span className={camera.enabled ? 'text-white/88' : 'text-white/58'}>{t('imageNode.camera.cameraControl')}</span>
        <span className={camera.enabled ? 'text-[#8eb0ff]' : 'text-white/34'}>
          {t(camera.enabled ? 'imageNode.camera.status.enabled' : 'imageNode.camera.status.disabled')}
        </span>
      </div>
      <div className={`mt-1.5 whitespace-nowrap text-[12px] tabular-nums ${camera.enabled ? 'text-white/58' : 'text-white/28'}`}>
        {parameters.join(' · ')}
      </div>
    </div>
  );
}
