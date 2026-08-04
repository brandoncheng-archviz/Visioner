import { describe, expect, it } from 'vitest';
import type { CameraControlData } from '../../types/imageNodeData.types';
import { DEFAULT_CAMERA_CONTROL, resolveCameraControl } from './cameraControlDisplay';

describe('resolveCameraControl', () => {
  it('keeps the 35mm and f/8 defaults', () => {
    expect(resolveCameraControl()).toEqual(DEFAULT_CAMERA_CONTROL);
  });

  it('normalizes removed legacy optics values without changing the data shape', () => {
    const legacy = {
      ...DEFAULT_CAMERA_CONTROL,
      focalLength: 70,
      aperture: 'f/11',
    } as unknown as CameraControlData;

    expect(resolveCameraControl(legacy)).toEqual({
      ...legacy,
      focalLength: 35,
      aperture: 'f/8',
    });
  });
});
