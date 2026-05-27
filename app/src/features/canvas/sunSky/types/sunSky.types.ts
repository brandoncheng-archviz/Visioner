export type TimePhase =
  | "early_morning"
  | "morning"
  | "midday"
  | "afternoon"
  | "golden_hour"
  | "blue_hour";

export type SkyCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "overcast"
  | "foggy"
  | "hazy";

export type SkyModel =
  | "preetham_inspired"
  | "hosek_wilkie_inspired"
  | "cie_overcast"
  | "art_directed";

export type GroundAlbedoMode =
  | "urban"
  | "grass"
  | "sand"
  | "snow"
  | "water";

export type ShadowLength =
  | "very_long"
  | "long"
  | "medium"
  | "short"
  | "very_short";

export type ShadowSoftness =
  | "hard"
  | "standard"
  | "soft"
  | "very_soft";

export type ColorMood =
  | "warm"
  | "neutral"
  | "cool";

export type ContrastLevel =
  | "low"
  | "medium"
  | "medium_high"
  | "high";

export type DirectionStrength =
  | "strong"
  | "medium"
  | "weak";

export type SunSkyPresetCategory =
  | "common_daylight"
  | "golden_hour"
  | "dramatic_backlight"
  | "soft_atmosphere";

export type SunSkyDerived = {
  timeLabel: string;
  timePhase: TimePhase;

  directionLabel: string;
  lightTypeLabel: string;

  skyTopColor: string;
  skyHorizonColor: string;
  sunColor: string;

  shadowLength: ShadowLength;
  shadowDirection: number;
  shadowSoftness: ShadowSoftness;

  colorMood: ColorMood;
  contrast: ContrastLevel;
  directionStrength: DirectionStrength;

  summary: string;
  promptText: string;
};

export type SunSkyState = {
  enabled: boolean;

  sun: {
    elevation: number;
    azimuth: number;
    size: number;
    intensity: number;
    colorTemp: number;
  };

  time: {
    phase: TimePhase;
    inferredFromSun: boolean;
    userOverride: boolean;
  };

  sky: {
    condition: SkyCondition;
    model: SkyModel;
    turbidity: number;
    horizonBlur: number;
    cloudAmount?: number;
  };

  atmosphere: {
    volumeEffect: number;
    groundAlbedoMode: GroundAlbedoMode;
    ozone?: number;
  };

  derived: SunSkyDerived;

  preview: {
    realtimeEnabled: boolean;
    previewMode: "sphere_demo" | "image_relighting";
    previewResolution: 256 | 384 | 512;
  };

  source: {
    presetId?: string;
    editedFromPreset: boolean;
  };
};

export type SunSkyPreset = {
  id: string;
  name: string;
  category: SunSkyPresetCategory;

  sun: {
    elevation: number;
    azimuth: number;
    size: number;
    intensity: number;
    colorTemp: number;
  };

  time: {
    phase: TimePhase;
  };

  sky: {
    condition: SkyCondition;
    model: SkyModel;
    turbidity: number;
    horizonBlur: number;
    cloudAmount?: number;
  };

  atmosphere: {
    volumeEffect: number;
    groundAlbedoMode: GroundAlbedoMode;
    ozone?: number;
  };

  derived: {
    timeLabel: string;
    directionLabel: string;
    shadowLength: ShadowLength;
    shadowSoftness: ShadowSoftness;
    colorMood: ColorMood;
    contrast: ContrastLevel;
    recommendedFor: string[];
  };

  assets: {
    thumbnail?: string;
    hdriPath?: string;
  };

  prompt: {
    base: string;
    lighting: string;
    sky: string;
    atmosphere: string;
    purpose: string;
  };

  description: string;
};

export type SunSkySnapshot = {
  id: string;

  sourceImageId?: string;
  previewImageUrl?: string;
  previewResolution: 256 | 384 | 512;

  sunSkyState: SunSkyState;

  generation: {
    modelId?: string;
    modelVersion?: string;
    seed?: number;
    promptText: string;
    negativePrompt?: string;
    createdAt: string;
  };

  output: {
    canUpscale: boolean;
    targetResolutions: Array<"1k" | "2k" | "4k">;
  };
};
