export interface SimpleSunSkyState {
  sun: {
    elevation: number;
    azimuth: number;
  };
  derived: SimpleSunSkyDerived;
  linkedImageNodeIds: string[];
}

export interface SimpleSunSkyDerived {
  timeLabel: string;
  directionLabel: string;
  skyTopColor: string;
  skyHorizonColor: string;
  skyDescription: string;
  sunColor: string;
  colorTemp: number;
  sunIntensity: number;
  shadowDirection: number;
  shadowLengthScale: number;
  shadowLengthLabel: string;
  shadowBlur: number;
  shadowBlurLabel: string;
  shadowOpacity: number;
  summary: string;
  promptText: string;
}

export interface SimpleSunSkyInput {
  sun?: {
    elevation?: number;
    azimuth?: number;
  };
  linkedImageNodeIds?: string[];
}
