import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export function GlobalDropForwarder() {
  const { t } = useTranslation();
  useEffect(() => {
    const browserWindow = typeof window !== 'undefined'
      ? window as typeof window & { __visionerFullscreenDropForwarder?: boolean }
      : null;

    if (!browserWindow || browserWindow.__visionerFullscreenDropForwarder) return;
    browserWindow.__visionerFullscreenDropForwarder = true;

    let hint = document.getElementById('visioner-fullscreen-drop-hint');

    const showFullscreenDropHint = () => {
      if (!hint) {
        hint = document.createElement('div');
        hint.id = 'visioner-fullscreen-drop-hint';
        hint.textContent = t('canvas.dragImageHere');
        Object.assign(hint.style, {
          position: 'fixed',
          inset: '0',
          zIndex: '9999',
          display: 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(3,3,7,0.62)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          color: '#ffffff',
          fontSize: '15px',
          fontWeight: '700',
          pointerEvents: 'none',
        });
        const text = document.createElement('div');
        text.textContent = t('canvas.dragImageHere');
        Object.assign(text.style, {
          padding: '18px 28px',
          borderRadius: '14px',
          background: '#252526',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        });
        hint.textContent = '';
        hint.appendChild(text);
        document.body.appendChild(hint);
      }
      hint.style.display = 'flex';
    };

    const hideFullscreenDropHint = () => {
      if (hint) hint.style.display = 'none';
    };

    const handleDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
      showFullscreenDropHint();
    };

    const handleDrop = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      if ((event as DragEvent & { __visionerForwardedDrop?: boolean }).__visionerForwardedDrop) {
        hideFullscreenDropHint();
        return;
      }

      hideFullscreenDropHint();
      const pane = document.querySelector('.react-flow__pane');
      if (!pane) return;

      event.preventDefault();
      event.stopPropagation();
      const forwardedDrop = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        dataTransfer: event.dataTransfer,
      });
      Object.defineProperty(forwardedDrop, '__visionerForwardedDrop', { value: true });
      pane.dispatchEvent(forwardedDrop);
    };

    const handleDragLeave = (event: DragEvent) => {
      if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= browserWindow.innerWidth || event.clientY >= browserWindow.innerHeight) {
        hideFullscreenDropHint();
      }
    };

    const handleDragEnd = () => {
      hideFullscreenDropHint();
    };

    browserWindow.addEventListener('dragover', handleDragOver, true);
    browserWindow.addEventListener('drop', handleDrop, true);
    browserWindow.addEventListener('dragleave', handleDragLeave, true);
    browserWindow.addEventListener('dragend', handleDragEnd, true);

    return () => {
      browserWindow.removeEventListener('dragover', handleDragOver, true);
      browserWindow.removeEventListener('drop', handleDrop, true);
      browserWindow.removeEventListener('dragleave', handleDragLeave, true);
      browserWindow.removeEventListener('dragend', handleDragEnd, true);
      browserWindow.__visionerFullscreenDropForwarder = false;
    };
  }, []);

  return null;
}
