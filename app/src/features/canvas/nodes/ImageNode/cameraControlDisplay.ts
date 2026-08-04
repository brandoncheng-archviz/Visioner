import type {
  CameraAperture,
  CameraControlData,
  CameraFocalLength,
  CameraHeight,
} from '../../types/imageNodeData.types';

export const DEFAULT_CAMERA_CONTROL: CameraControlData = {
  enabled: false,
  height: 'slightlyHigh',
  focalLength: 35,
  aperture: 'f/8',
  twoPointPerspective: false,
};

interface CameraHeightPreset {
  value: CameraHeight;
  labelKey: string;
  fixedValue: string;
  descriptionKey: string;
}

interface CameraOpticsPreset<T extends string | number> {
  value: T;
  displayValue: string;
  nameKey: string;
  descriptionKey: string;
  usageKey: string;
  recommended?: boolean;
}

export const CAMERA_HEIGHT_PRESETS = [
  { value: 'low', labelKey: 'imageNode.camera.height.options.low', fixedValue: '0.5m', descriptionKey: 'imageNode.camera.height.descriptions.low' },
  { value: 'eyeLevel', labelKey: 'imageNode.camera.height.options.eyeLevel', fixedValue: '1.5m', descriptionKey: 'imageNode.camera.height.descriptions.eyeLevel' },
  { value: 'slightlyHigh', labelKey: 'imageNode.camera.height.options.slightlyHigh', fixedValue: '3.0m', descriptionKey: 'imageNode.camera.height.descriptions.slightlyHigh' },
  { value: 'semiBirdsEye', labelKey: 'imageNode.camera.height.options.semiBirdsEye', fixedValue: '8.0m', descriptionKey: 'imageNode.camera.height.descriptions.semiBirdsEye' },
  { value: 'birdsEye', labelKey: 'imageNode.camera.height.options.birdsEye', fixedValue: '30m', descriptionKey: 'imageNode.camera.height.descriptions.birdsEye' },
  { value: 'aerial', labelKey: 'imageNode.camera.height.options.aerial', fixedValue: '100m', descriptionKey: 'imageNode.camera.height.descriptions.aerial' },
] satisfies CameraHeightPreset[];

export const CAMERA_FOCAL_LENGTH_PRESETS = [
  { value: 16, displayValue: '16mm', nameKey: 'imageNode.camera.focalLength.presets.16.name', descriptionKey: 'imageNode.camera.focalLength.presets.16.description', usageKey: 'imageNode.camera.focalLength.presets.16.usage' },
  { value: 24, displayValue: '24mm', nameKey: 'imageNode.camera.focalLength.presets.24.name', descriptionKey: 'imageNode.camera.focalLength.presets.24.description', usageKey: 'imageNode.camera.focalLength.presets.24.usage' },
  { value: 35, displayValue: '35mm', nameKey: 'imageNode.camera.focalLength.presets.35.name', descriptionKey: 'imageNode.camera.focalLength.presets.35.description', usageKey: 'imageNode.camera.focalLength.presets.35.usage', recommended: true },
  { value: 50, displayValue: '50mm', nameKey: 'imageNode.camera.focalLength.presets.50.name', descriptionKey: 'imageNode.camera.focalLength.presets.50.description', usageKey: 'imageNode.camera.focalLength.presets.50.usage' },
  { value: 85, displayValue: '85mm', nameKey: 'imageNode.camera.focalLength.presets.85.name', descriptionKey: 'imageNode.camera.focalLength.presets.85.description', usageKey: 'imageNode.camera.focalLength.presets.85.usage' },
  { value: 100, displayValue: '100mm', nameKey: 'imageNode.camera.focalLength.presets.100.name', descriptionKey: 'imageNode.camera.focalLength.presets.100.description', usageKey: 'imageNode.camera.focalLength.presets.100.usage' },
] satisfies CameraOpticsPreset<CameraFocalLength>[];

export const CAMERA_APERTURE_PRESETS = [
  { value: 'f/2.8', displayValue: 'f/2.8', nameKey: 'imageNode.camera.aperture.presets.f2_8.name', descriptionKey: 'imageNode.camera.aperture.presets.f2_8.description', usageKey: 'imageNode.camera.aperture.presets.f2_8.usage' },
  { value: 'f/4', displayValue: 'f/4', nameKey: 'imageNode.camera.aperture.presets.f4.name', descriptionKey: 'imageNode.camera.aperture.presets.f4.description', usageKey: 'imageNode.camera.aperture.presets.f4.usage' },
  { value: 'f/5.6', displayValue: 'f/5.6', nameKey: 'imageNode.camera.aperture.presets.f5_6.name', descriptionKey: 'imageNode.camera.aperture.presets.f5_6.description', usageKey: 'imageNode.camera.aperture.presets.f5_6.usage' },
  { value: 'f/8', displayValue: 'f/8', nameKey: 'imageNode.camera.aperture.presets.f8.name', descriptionKey: 'imageNode.camera.aperture.presets.f8.description', usageKey: 'imageNode.camera.aperture.presets.f8.usage', recommended: true },
  { value: 'f/16', displayValue: 'f/16', nameKey: 'imageNode.camera.aperture.presets.f16.name', descriptionKey: 'imageNode.camera.aperture.presets.f16.description', usageKey: 'imageNode.camera.aperture.presets.f16.usage' },
] satisfies CameraOpticsPreset<CameraAperture>[];

export function getCameraHeightPreset(value: CameraHeight): CameraHeightPreset {
  return CAMERA_HEIGHT_PRESETS.find((preset) => preset.value === value) ?? CAMERA_HEIGHT_PRESETS[2];
}

export function resolveCameraControl(value?: CameraControlData): CameraControlData {
  const resolved = { ...DEFAULT_CAMERA_CONTROL, ...value };
  const focalLength = CAMERA_FOCAL_LENGTH_PRESETS.some((preset) => preset.value === resolved.focalLength)
    ? resolved.focalLength
    : DEFAULT_CAMERA_CONTROL.focalLength;
  const aperture = CAMERA_APERTURE_PRESETS.some((preset) => preset.value === resolved.aperture)
    ? resolved.aperture
    : DEFAULT_CAMERA_CONTROL.aperture;
  return { ...resolved, focalLength, aperture };
}
