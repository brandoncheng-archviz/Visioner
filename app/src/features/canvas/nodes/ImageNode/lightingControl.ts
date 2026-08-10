import { DEFAULT_RELIGHT_SETTINGS, DEFAULT_RELIGHT_SUN } from '../../constants/relightPresets';
import type {
  RelightCloudAmount,
  RelightFogLevel,
  RelightSettings,
  RelightTimePeriod,
} from '../../types/relight.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import { createRelightLightPreview } from '../../utils/relightSettings';

export interface ImageLightingDraft {
  timePeriod: RelightTimePeriod;
  elevation: number;
  azimuth: number;
  cloudAmount: number;
  fogAmount: number;
  presetId?: string;
}

export interface ImageLightingPreset extends ImageLightingDraft {
  id: string;
  labelKey: string;
  descriptionKey: string;
}

export type ImageLightingDirection = 'right' | 'rightBack' | 'back' | 'leftBack' | 'left' | 'leftFront' | 'front' | 'rightFront';

export const IMAGE_LIGHTING_TIME_OPTIONS: ReadonlyArray<{
  value: RelightTimePeriod;
  labelKey: string;
  suggestedElevation: number;
}> = [
  { value: 'earlyMorning', labelKey: 'imageNode.lighting.time.options.earlyMorning', suggestedElevation: 9 },
  { value: 'morning', labelKey: 'imageNode.lighting.time.options.morning', suggestedElevation: 30 },
  { value: 'noon', labelKey: 'imageNode.lighting.time.options.noon', suggestedElevation: 75 },
  { value: 'afternoon', labelKey: 'imageNode.lighting.time.options.afternoon', suggestedElevation: 30 },
  { value: 'evening', labelKey: 'imageNode.lighting.time.options.evening', suggestedElevation: 12 },
  { value: 'night', labelKey: 'imageNode.lighting.time.options.night', suggestedElevation: 3 },
];

export const IMAGE_LIGHTING_PRESETS: ReadonlyArray<ImageLightingPreset> = [
  {
    id: 'early-morning-low-light',
    labelKey: 'imageNode.lighting.presets.earlyMorningLow',
    descriptionKey: 'imageNode.lighting.presetDescriptions.earlyMorningLow',
    timePeriod: 'earlyMorning',
    elevation: 9,
    azimuth: 50,
    cloudAmount: 28,
    fogAmount: 22,
  },
  {
    id: 'morning-front-light',
    labelKey: 'imageNode.lighting.presets.morningFront',
    descriptionKey: 'imageNode.lighting.presetDescriptions.morningFront',
    timePeriod: 'morning',
    elevation: 30,
    azimuth: 270,
    cloudAmount: 18,
    fogAmount: 0,
  },
  {
    id: 'afternoon-side-light',
    labelKey: 'imageNode.lighting.presets.afternoonSide',
    descriptionKey: 'imageNode.lighting.presetDescriptions.afternoonSide',
    timePeriod: 'afternoon',
    elevation: 24,
    azimuth: 10,
    cloudAmount: 8,
    fogAmount: 0,
  },
  {
    id: 'soft-backlight',
    labelKey: 'imageNode.lighting.presets.softBacklight',
    descriptionKey: 'imageNode.lighting.presetDescriptions.softBacklight',
    timePeriod: 'afternoon',
    elevation: 18,
    azimuth: 90,
    cloudAmount: 58,
    fogAmount: 18,
  },
  {
    id: 'golden-hour',
    labelKey: 'imageNode.lighting.presets.goldenHour',
    descriptionKey: 'imageNode.lighting.presetDescriptions.goldenHour',
    timePeriod: 'evening',
    elevation: 12,
    azimuth: 55,
    cloudAmount: 24,
    fogAmount: 12,
  },
  {
    id: 'overcast-diffuse',
    labelKey: 'imageNode.lighting.presets.overcastDiffuse',
    descriptionKey: 'imageNode.lighting.presetDescriptions.overcastDiffuse',
    timePeriod: 'afternoon',
    elevation: 36,
    azimuth: 45,
    cloudAmount: 92,
    fogAmount: 8,
  },
];

const CLOUD_DEFAULT_VALUES: Record<RelightCloudAmount, number> = {
  clear: 0,
  fewClouds: 28,
  cloudy: 62,
  overcast: 92,
};

const FOG_DEFAULT_VALUES: Record<RelightFogLevel, number> = {
  none: 0,
  light: 22,
  medium: 58,
  heavy: 88,
};

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getCloudAmount(value: number): RelightCloudAmount {
  if (value < 20) return 'clear';
  if (value < 50) return 'fewClouds';
  if (value < 80) return 'cloudy';
  return 'overcast';
}

export function getFogLevel(value: number): RelightFogLevel {
  if (value < 15) return 'none';
  if (value < 45) return 'light';
  if (value < 75) return 'medium';
  return 'heavy';
}

export function getImageLightingDirection(azimuth: number): ImageLightingDirection {
  const normalized = ((azimuth % 360) + 360) % 360;
  const sector = Math.round(normalized / 45) % 8;
  return ['right', 'rightBack', 'back', 'leftBack', 'left', 'leftFront', 'front', 'rightFront'][sector] as ImageLightingDirection;
}

export function inferLightingTimePeriod(elevation: number): RelightTimePeriod {
  if (elevation <= 5) return 'night';
  if (elevation <= 12) return 'evening';
  if (elevation <= 27) return 'afternoon';
  if (elevation >= 60) return 'noon';
  return 'morning';
}

export function createDefaultImageLightingDraft(): ImageLightingDraft {
  return {
    timePeriod: 'afternoon',
    elevation: DEFAULT_RELIGHT_SUN.elevation,
    azimuth: DEFAULT_RELIGHT_SUN.azimuth,
    cloudAmount: CLOUD_DEFAULT_VALUES[DEFAULT_RELIGHT_SETTINGS.cloudAmount],
    fogAmount: FOG_DEFAULT_VALUES[DEFAULT_RELIGHT_SETTINGS.fogLevel],
  };
}

export function createImageLightingDraft(value?: LightPreviewData | null): ImageLightingDraft {
  if (!value) return createDefaultImageLightingDraft();
  const settings = value.settings;
  return {
    timePeriod: settings?.timePeriod ?? inferLightingTimePeriod(value.sun.elevation),
    elevation: value.sun.elevation,
    azimuth: value.sun.azimuth,
    cloudAmount: clampPercent(settings?.cloudAmountValue ?? CLOUD_DEFAULT_VALUES[settings?.cloudAmount ?? 'clear']),
    fogAmount: clampPercent(settings?.fogAmountValue ?? FOG_DEFAULT_VALUES[settings?.fogLevel ?? 'none']),
    presetId: settings?.lightingPresetId,
  };
}

export function createImageLightingPreview(draft: ImageLightingDraft, enabled = true): LightPreviewData {
  const cloudAmount = clampPercent(draft.cloudAmount);
  const fogAmount = clampPercent(draft.fogAmount);
  const settings: RelightSettings = {
    cloudAmount: getCloudAmount(cloudAmount),
    fogLevel: getFogLevel(fogAmount),
    cloudAmountValue: cloudAmount,
    fogAmountValue: fogAmount,
    timePeriod: draft.timePeriod,
    lightingPresetId: draft.presetId,
  };
  return {
    ...createRelightLightPreview(
      { elevation: draft.elevation, azimuth: draft.azimuth },
      settings,
    ),
    enabled,
  };
}

export function selectImageLightingTime(
  draft: ImageLightingDraft,
  timePeriod: RelightTimePeriod,
): ImageLightingDraft {
  const option = IMAGE_LIGHTING_TIME_OPTIONS.find((item) => item.value === timePeriod);
  return {
    ...draft,
    timePeriod,
    elevation: option?.suggestedElevation ?? draft.elevation,
    presetId: undefined,
  };
}
