import type { SyntheticEvent, WheelEvent } from 'react';

export function stopCanvasWheelPropagation(event: WheelEvent<HTMLElement>) {
  event.stopPropagation();
}

export function blockFullscreenWheel(event: WheelEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
}

export function stopFullscreenInteraction(event: SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}
