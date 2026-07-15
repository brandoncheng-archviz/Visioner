import { useTranslation } from 'react-i18next';
import type { ImageNodeControllers } from './imageControllers.types';

interface CameraControlPlaceholderProps {
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  onChange: (controllers: ImageNodeControllers) => void;
}

export function CameraControlPlaceholder({ controllers, disabled = false, onChange }: CameraControlPlaceholderProps) {
  const { t } = useTranslation();
  const enabled = controllers?.camera?.enabled === true;

  const handleToggle = () => {
    if (disabled) return;
    // Temporary placeholder interaction. Replace when the controller detail implementation is added.
    onChange({
      ...controllers,
      camera: {
        ...controllers?.camera,
        enabled: !enabled,
      },
    });
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="text-[15px] font-medium text-white/88">{t('imageNode.controllers.camera.title')}</div>
      <div className="mt-2 text-[13px] leading-5 text-white/46">{t('imageNode.controllers.camera.description')}</div>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className="mt-4 h-9 rounded-md border px-3 text-[13px] font-medium transition-colors hover:bg-white/[0.08]"
        style={{
          borderColor: 'rgba(255,255,255,0.12)',
          background: enabled ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
          color: disabled ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.76)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {enabled ? t('imageNode.controllers.actions.disable') : t('imageNode.controllers.actions.enable')}
      </button>
    </div>
  );
}
