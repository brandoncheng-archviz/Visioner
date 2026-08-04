// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@/i18n';
import type { CameraControlData } from '../../types/imageNodeData.types';
import { CameraControlPreview } from './CameraControlPreview';

const CAMERA: CameraControlData = {
  enabled: true,
  height: 'slightlyHigh',
  focalLength: 35,
  aperture: 'f/8',
  twoPointPerspective: true,
};

afterEach(cleanup);

describe('CameraControlPreview', () => {
  it('shows enabled state and the current localized parameters', () => {
    render(<CameraControlPreview value={CAMERA} />);
    const preview = document.querySelector<HTMLElement>('[data-camera-control-preview="true"]');

    expect(preview?.dataset.cameraControlState).toBe('enabled');
    expect(preview?.textContent).toContain('相机控制');
    expect(preview?.textContent).toContain('已开启');
    expect(preview?.textContent).toContain('高位 · 35mm · f/8 · 两点透视');
  });

  it('retains parameters and uses the muted treatment while disabled', () => {
    render(<CameraControlPreview value={{ ...CAMERA, enabled: false }} />);
    const preview = document.querySelector<HTMLElement>('[data-camera-control-preview="true"]');

    expect(preview?.dataset.cameraControlState).toBe('disabled');
    expect(preview?.classList.contains('opacity-55')).toBe(true);
    expect(preview?.textContent).toContain('已关闭');
    expect(preview?.textContent).toContain('高位 · 35mm · f/8 · 两点透视');
  });
});
