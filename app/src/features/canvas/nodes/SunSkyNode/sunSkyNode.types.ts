export interface SunSkyNodeData {
  sun: {
    elevation: number;
    azimuth: number;
  };
  derived: SunSkyNodeDerived;
  linkedImageNodeIds: string[];
}

export interface SunSkyNodeDerived {
  timeLabel: string;
  directionLabel: string;
  skyTopColor: string;
  skyHorizonColor: string;
  sunColor: string;
  colorTemp: number;
  sunIntensity: number;
  shadowDirection: number;
  shadowLengthScale: number;
  shadowBlur: number;
  shadowOpacity: number;
  shadowLengthLabel: string;
  shadowBlurLabel: string;
  skyLabel: string;
  summary: string;
  promptText: string;
  previewImagePath: string;
}
