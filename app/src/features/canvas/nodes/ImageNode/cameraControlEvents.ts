import type { SyntheticEvent } from 'react';

export function isCameraPopoverWheelEvent(event: Pick<SyntheticEvent, 'type' | 'target'>): boolean {
  return event.type === 'wheel'
    && event.target instanceof Element
    && event.target.closest('[data-image-camera-popover="true"]') !== null;
}
