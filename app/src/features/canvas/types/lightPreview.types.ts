import type { SunSkyNodeDerived } from '../nodes/SunSkyNode/sunSkyNode.types';
import type { RelightSettings } from './relight.types';

export interface LightPreviewData {
  enabled: boolean;
  sun: {
    elevation: number;
    azimuth: number;
  };
  derived: SunSkyNodeDerived;
  settings?: RelightSettings;
}
