import type { WheelEvent } from 'react';

export function stopCanvasWheelPropagation(event: WheelEvent<HTMLElement>) {
  event.stopPropagation();
}
