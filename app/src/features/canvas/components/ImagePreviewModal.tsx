import { useCallback } from 'react';
import { stopCanvasWheelPropagation } from '../utils/canvasEvents';
import { FullscreenCloseButton } from './FullscreenCloseButton';
import { useFullscreenEscape } from '../hooks/useFullscreenEscape';

export function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  useFullscreenEscape(true, onClose);

  return (
    <div
      data-canvas-escape-layer="true"
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={handleOverlayClick}
      onWheelCapture={stopCanvasWheelPropagation}
    >
      <FullscreenCloseButton onClose={onClose} />

      {/* Image */}
      <img
        src={imageUrl}
        alt=""
        className="block object-contain"
        style={{
          maxWidth: 'calc(100vw - 96px)',
          maxHeight: 'calc(100vh - 96px)',
          borderRadius: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
