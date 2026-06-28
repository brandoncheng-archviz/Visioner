import { useEffect } from 'react';

export function useFullscreenEscape(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'Esc' && event.code !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [active, onClose]);
}
