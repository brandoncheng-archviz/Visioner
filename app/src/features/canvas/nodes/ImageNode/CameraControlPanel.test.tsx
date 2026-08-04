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
  it('keeps two-point perspective off by default', () => {
    render(<CameraControlPanel onChange={vi.fn()} onClose={vi.fn()} />);
    const switches = document.querySelectorAll<HTMLElement>('[role="switch"]');

    expect(switches).toHaveLength(2);
    expect(switches[0]?.getAttribute('aria-checked')).toBe('false');
  });

  it.each([
    ['low', '近地', '0.5m'],
    ['eyeLevel', '人视', '1.5m'],
    ['slightlyHigh', '高位', '3.0m'],
    ['semiBirdsEye', '半鸟', '8.0m'],
    ['birdsEye', '鸟瞰', '30m'],
    ['aerial', '航拍', '100m'],
  ] as const)('shows the %s camera-height label and suggested fixed value', (height, label, fixedValue) => {
    render(<CameraControlPanel value={{ ...ENABLED_CAMERA, height }} onChange={vi.fn()} onClose={vi.fn()} />);

    expect(document.body.textContent).toContain(label);
    expect(document.body.textContent).toContain(fixedValue);
  });

  it.each([16, 24, 35, 50, 85, 100] as const)('shows the %smm focal-length preset', (focalLength) => {
    render(<CameraControlPanel value={{ ...ENABLED_CAMERA, focalLength }} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain(`${focalLength}mm`);
  });

  it.each(['f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/16'] as const)('shows the %s aperture preset', (aperture) => {
    render(<CameraControlPanel value={{ ...ENABLED_CAMERA, aperture }} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(document.body.textContent).toContain(aperture);
  });

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
    expect(onChange).toHaveBeenNthCalledWith(2, { ...ENABLED_CAMERA, focalLength: 85 });
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

  it.each([
    ['position', { ...ENABLED_CAMERA, height: 'low' }, -120],
    ['position', { ...ENABLED_CAMERA, height: 'aerial' }, 120],
    ['focalLength', { ...ENABLED_CAMERA, focalLength: 16 }, -120],
    ['focalLength', { ...ENABLED_CAMERA, focalLength: 100 }, 120],
    ['aperture', { ...ENABLED_CAMERA, aperture: 'f/2.8' }, -120],
    ['aperture', { ...ENABLED_CAMERA, aperture: 'f/16' }, 120],
  ] as const)('does not wrap the %s selector at either boundary', (column, camera, deltaY) => {
    const onChange = vi.fn();
    render(<CameraControlPanel value={camera} onChange={onChange} onClose={vi.fn()} />);
    const selector = document.querySelector<HTMLElement>(`[data-camera-wheel-column="${column}"]`);

    act(() => {
      selector?.dispatchEvent(new WheelEvent('wheel', { deltaY, bubbles: true, cancelable: true }));
    });

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
    expect(onChange).toHaveBeenCalledWith({ ...ENABLED_CAMERA, aperture: 'f/16' });
    anchor.remove();
  });
});
