import type { LightPreviewData } from './lightPreview.types';

export type RelightCloudAmount = 'clear' | 'fewClouds' | 'cloudy' | 'overcast';
export type RelightFogLevel = 'none' | 'light' | 'medium' | 'heavy';
export type RelightTimePeriod = 'earlyMorning' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night';

export interface RelightSettings {
  cloudAmount: RelightCloudAmount;
  fogLevel: RelightFogLevel;
  /** ImageNode light-control values; absent on legacy RelightNode data. */
  cloudAmountValue?: number;
  fogAmountValue?: number;
  timePeriod?: RelightTimePeriod;
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
