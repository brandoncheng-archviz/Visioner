// @vitest-environment jsdom

import { act, cleanup, render } from '@testing-library/react';
import type { WheelEvent as ReactWheelEvent } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { CameraControlData } from '../../types/imageNodeData.types';
import { CameraControlPanel } from './CameraControlPanel';
import { CameraControlPopover } from './CameraControlPopover';
import { isCameraPopoverWheelEvent } from './cameraControlEvents';

const ENABLED_CAMERA: CameraControlData = {
  enabled: true,
  height: 'slightlyHigh',
  focalLength: 35,
  aperture: 'f/8',
  twoPointPerspective: true,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CameraControlPanel wheel selectors', () => {
  it('changes the camera height when WheelEvent reaches the height selector', () => {
    const onChange = vi.fn();
    const outerWheel = vi.fn();
    render(
      <div onWheel={outerWheel}>
        <CameraControlPanel value={ENABLED_CAMERA} onChange={onChange} onClose={vi.fn()} />
      </div>,
    );
    const selector = document.querySelector<HTMLElement>('[data-camera-wheel-column="position"]');
    expect(selector).not.toBeNull();
    const event = new WheelEvent('wheel', { deltaY: 120, deltaMode: 0, bubbles: true, cancelable: true });

    act(() => {
      selector?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(outerWheel).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...ENABLED_CAMERA, height: 'semiBirdsEye' });
  });

  it('routes small trackpad WheelEvents through the focal-length column', () => {
    const onChange = vi.fn();
    render(<CameraControlPanel value={ENABLED_CAMERA} onChange={onChange} onClose={vi.fn()} />);
    const selector = document.querySelector<HTMLElement>('[data-camera-wheel-column="focalLength"]');
    expect(selector).not.toBeNull();

    act(() => {
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 8, bubbles: true, cancelable: true }));
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 8, bubbles: true, cancelable: true }));
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 8, bubbles: true, cancelable: true }));
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 8, bubbles: true, cancelable: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ ...ENABLED_CAMERA, focalLength: 50 });
  });

  it('caps rapid wheel input to one parameter step per 240ms', () => {
    let currentTime = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => currentTime);
    const onChange = vi.fn();
    render(<CameraControlPanel value={ENABLED_CAMERA} onChange={onChange} onClose={vi.fn()} />);
    const selector = document.querySelector<HTMLElement>('[data-camera-wheel-column="focalLength"]');

    act(() => {
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
      currentTime = 1100;
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
      currentTime = 1239;
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
      currentTime = 1240;
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    });

    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenNthCalledWith(1, { ...ENABLED_CAMERA, focalLength: 50 });
    expect(onChange).toHaveBeenNthCalledWith(2, { ...ENABLED_CAMERA, focalLength: 70 });
  });

  it('does not change aperture while camera control is disabled', () => {
    const onChange = vi.fn();
    render(<CameraControlPanel value={{ ...ENABLED_CAMERA, enabled: false }} onChange={onChange} onClose={vi.fn()} />);
    const selector = document.querySelector<HTMLElement>('[data-camera-wheel-column="aperture"]');
    expect(selector).not.toBeNull();
    const event = new WheelEvent('wheel', { deltaY: -120, bubbles: true, cancelable: true });

    act(() => {
      selector?.dispatchEvent(event);
    });

    expect(event.defaultPrevented).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps a portal wheel event alive through the ImageNode control-panel capture boundary', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const onChange = vi.fn();
    const ancestorCapture = vi.fn((event: ReactWheelEvent) => {
      if (isCameraPopoverWheelEvent(event)) return;
      event.stopPropagation();
    });

    render(
      <div onWheelCapture={ancestorCapture}>
        <CameraControlPopover
          open
          anchorElement={anchor}
          value={ENABLED_CAMERA}
          onChange={onChange}
          onOpenChange={vi.fn()}
        />
      </div>,
    );
    const selector = document.querySelector<HTMLElement>('[data-camera-wheel-column="aperture"]');

    act(() => {
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, bubbles: true, cancelable: true }));
    });

    expect(ancestorCapture).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...ENABLED_CAMERA, aperture: 'f/11' });
    anchor.remove();
  });
});
