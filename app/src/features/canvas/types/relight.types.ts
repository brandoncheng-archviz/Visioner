import type { LightPreviewData } from './lightPreview.types';

export type RelightCloudAmount = 'clear' | 'fewClouds' | 'cloudy' | 'overcast';
export type RelightFogLevel = 'none' | 'light' | 'medium' | 'heavy';

export interface RelightSettings {
  cloudAmount: RelightCloudAmount;
  fogLevel: RelightFogLevel;
  lightingPresetId?: string;
}

export interface RelightPreset {
  id: string;
  name: string;
  description: string;
  elevation: number;
  azimuth: number;
  cloudAmount: RelightCloudAmount;
  fogLevel: RelightFogLevel;
}

export interface RelightCreationOptions {
  lightPreview?: LightPreviewData;
  relightSettings?: RelightSettings;
}
