import { forwardRef } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImageNodeControllers } from './imageControllers.types';
import { getEnabledControllerCount } from './imageControllersUtils';

interface ImageControllersTriggerProps {
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  open?: boolean;
  onClick: () => void;
}

export const ImageControllersTrigger = forwardRef<HTMLButtonElement, ImageControllersTriggerProps>(
  ({ controllers, disabled = false, open = false, onClick }, ref) => {
    const { t } = useTranslation();
    const enabledCount = getEnabledControllerCount(controllers);
    const label = enabledCount > 0
      ? t('imageNode.controllers.triggerWithCount', { count: enabledCount })
      : t('imageNode.controllers.trigger');

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          onClick();
        }}
        className={`flex items-center gap-1.5 transition-colors ${disabled ? '' : 'hover:text-white'}`}
        style={{
          fontSize: 15,
          color: open ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.9)',
          opacity: disabled ? 0.45 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        title={label}
      >
        <SlidersHorizontal className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.58)' }} />
        <span>{label}</span>
      </button>
    );
  },
);

ImageControllersTrigger.displayName = 'ImageControllersTrigger';
