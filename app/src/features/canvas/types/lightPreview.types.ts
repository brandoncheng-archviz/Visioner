import type { SunSkyNodeDerived } from '../nodes/SunSkyNode/sunSkyNode.types';

export interface LightPreviewData {
  enabled: boolean;
  sun: {
    elevation: number;
    azimuth: number;
  };
  derived: SunSkyNodeDerived;
}
