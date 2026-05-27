import type { SunSkyNodeDerived } from './sunSkyNode.types';
import { clamp, snapToStep, normalizeAzimuthForMath, lerp, round, interpolateColor } from './sunSkyNode.utils';
import { getSunSkyPreviewImage } from './getSunSkyPreviewImage';

interface ElevationKeyframe {
  elevation: number;
  timeLabel: string;
  skyTopColor: string;
  skyHorizonColor: string;
  sunColor: string;
  colorTemp: number;
  sunIntensity: number;
  shadowLengthScale: number;
  shadowBlur: number;
  shadowOpacity: number;
}

const KEYFRAMES: ElevationKeyframe[] = [
  {
    elevation: 3,
    timeLabel: '日出/日落边缘',
    skyTopColor: '#74879A',
    skyHorizonColor: '#EFB16B',
    sunColor: '#FFC46A',
    colorTemp: 3000,
    sunIntensity: 1.05,
    shadowLengthScale: 0.95,
    shadowBlur: 16,
    shadowOpacity: 0.45,
  },
  {
    elevation: 6,
    timeLabel: '黄金时刻',
    skyTopColor: '#7F91A3',
    skyHorizonColor: '#F0C27A',
    sunColor: '#FFD27A',
    colorTemp: 3300,
    sunIntensity: 1.18,
    shadowLengthScale: 0.88,
    shadowBlur: 14,
    shadowOpacity: 0.48,
  },
  {
    elevation: 9,
    timeLabel: '黄金时刻',
    skyTopColor: '#8999AA',
    skyHorizonColor: '#EFD19A',
    sunColor: '#FFE1A0',
    colorTemp: 3600,
    sunIntensity: 1.35,
    shadowLengthScale: 0.8,
    shadowBlur: 12,
    shadowOpacity: 0.5,
  },
  {
    elevation: 12,
    timeLabel: '黄金时刻',
    skyTopColor: '#94A2AF',
    skyHorizonColor: '#EAD8B8',
    sunColor: '#FFE8BF',
    colorTemp: 3950,
    sunIntensity: 1.55,
    shadowLengthScale: 0.72,
    shadowBlur: 10,
    shadowOpacity: 0.52,
  },
  {
    elevation: 15,
    timeLabel: '低角度日光',
    skyTopColor: '#A0ACB7',
    skyHorizonColor: '#DFD5C7',
    sunColor: '#FFF0D0',
    colorTemp: 4300,
    sunIntensity: 1.75,
    shadowLengthScale: 0.64,
    shadowBlur: 8,
    shadowOpacity: 0.54,
  },
  {
    elevation: 18,
    timeLabel: '低角度日光',
    skyTopColor: '#A6B2BD',
    skyHorizonColor: '#D8D3CA',
    sunColor: '#FFF4DC',
    colorTemp: 4550,
    sunIntensity: 1.88,
    shadowLengthScale: 0.58,
    shadowBlur: 7,
    shadowOpacity: 0.55,
  },
  {
    elevation: 24,
    timeLabel: '下午日光',
    skyTopColor: '#AAB8C6',
    skyHorizonColor: '#D1D3D1',
    sunColor: '#FFF8EA',
    colorTemp: 4900,
    sunIntensity: 2.05,
    shadowLengthScale: 0.48,
    shadowBlur: 6,
    shadowOpacity: 0.55,
  },
  {
    elevation: 30,
    timeLabel: '下午日光',
    skyTopColor: '#A7B9CB',
    skyHorizonColor: '#CCD2D5',
    sunColor: '#FFFDF4',
    colorTemp: 5150,
    sunIntensity: 2.18,
    shadowLengthScale: 0.4,
    shadowBlur: 5.5,
    shadowOpacity: 0.55,
  },
  {
    elevation: 45,
    timeLabel: '标准日光',
    skyTopColor: '#9EB6D0',
    skyHorizonColor: '#C7D0D8',
    sunColor: '#FFFFFF',
    colorTemp: 5700,
    sunIntensity: 2.45,
    shadowLengthScale: 0.26,
    shadowBlur: 4,
    shadowOpacity: 0.52,
  },
  {
    elevation: 60,
    timeLabel: '接近正午',
    skyTopColor: '#91B0D0',
    skyHorizonColor: '#C4CED8',
    sunColor: '#FFFFFF',
    colorTemp: 6100,
    sunIntensity: 2.65,
    shadowLengthScale: 0.16,
    shadowBlur: 3,
    shadowOpacity: 0.48,
  },
  {
    elevation: 75,
    timeLabel: '正午',
    skyTopColor: '#86A9CC',
    skyHorizonColor: '#C2CDD8',
    sunColor: '#FFFFFF',
    colorTemp: 6400,
    sunIntensity: 2.75,
    shadowLengthScale: 0.1,
    shadowBlur: 2.5,
    shadowOpacity: 0.44,
  },
  {
    elevation: 90,
    timeLabel: '顶光',
    skyTopColor: '#82A7CC',
    skyHorizonColor: '#C1CBD5',
    sunColor: '#FFFFFF',
    colorTemp: 6500,
    sunIntensity: 2.7,
    shadowLengthScale: 0.06,
    shadowBlur: 2,
    shadowOpacity: 0.4,
  },
];

function findElevationFrame(elevation: number): { current: ElevationKeyframe; next: ElevationKeyframe } {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const current = KEYFRAMES[i];
    const next = KEYFRAMES[i + 1];
    if (elevation >= current.elevation && elevation <= next.elevation) {
      return { current, next };
    }
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  return { current: last, next: last };
}

function interpolateElevation(elevation: number): ElevationKeyframe {
  const { current, next } = findElevationFrame(elevation);
  const range = next.elevation - current.elevation;
  const t = range === 0 ? 0 : (elevation - current.elevation) / range;

  return {
    elevation,
    timeLabel: t < 0.5 ? current.timeLabel : next.timeLabel,
    skyTopColor: interpolateColor(current.skyTopColor, next.skyTopColor, t),
    skyHorizonColor: interpolateColor(current.skyHorizonColor, next.skyHorizonColor, t),
    sunColor: interpolateColor(current.sunColor, next.sunColor, t),
    colorTemp: Math.round(lerp(current.colorTemp, next.colorTemp, t)),
    sunIntensity: round(lerp(current.sunIntensity, next.sunIntensity, t), 2),
    shadowLengthScale: round(lerp(current.shadowLengthScale, next.shadowLengthScale, t), 2),
    shadowBlur: round(lerp(current.shadowBlur, next.shadowBlur, t), 1),
    shadowOpacity: round(lerp(current.shadowOpacity, next.shadowOpacity, t), 2),
  };
}

function getDirectionLabel(azimuth: number): string {
  const sector = Math.round(normalizeAzimuthForMath(azimuth) / 45) % 8;
  const labels = ['右侧光', '右后方光', '正后方光 / 逆光', '左后方光', '左侧光', '左前方光', '正前方光', '右前方光'];
  return labels[sector];
}

function getSkyLabel(elevation: number): string {
  if (elevation <= 12) return '冷蓝天空 + 暖色地平线';
  if (elevation <= 30) return '自然蓝天 + 浅暖地平线';
  if (elevation <= 60) return '标准蓝天';
  return '正午蓝天';
}

function getShadowLengthLabel(scale: number): string {
  if (scale >= 0.85) return '超长阴影';
  if (scale >= 0.65) return '很长阴影';
  if (scale >= 0.45) return '长阴影';
  if (scale >= 0.25) return '中等阴影';
  if (scale >= 0.12) return '短阴影';
  return '极短阴影';
}

function getShadowBlurLabel(blur: number): string {
  if (blur >= 14) return '柔和';
  if (blur >= 10) return '稍柔';
  if (blur >= 5) return '标准';
  return '清晰';
}

function buildSummary(params: {
  directionLabel: string;
  timeLabel: string;
  elevation: number;
  skyLabel: string;
  shadowLengthLabel: string;
  shadowBlurLabel: string;
}): string {
  const elevationDesc = params.elevation <= 6 ? '极低角度' : params.elevation <= 15 ? '低角度' : params.elevation <= 30 ? '中低角度' : params.elevation <= 55 ? '中角度' : '高角度';
  const edge = params.shadowBlurLabel === '清晰' ? '边缘清晰' : params.shadowBlurLabel === '标准' ? '边缘标准' : `略带${params.shadowBlurLabel}`;
  return `${params.directionLabel}${elevationDesc}${params.timeLabel}，${params.skyLabel}，${params.shadowLengthLabel}${edge}，适合突出建筑体块和空间层次。`;
}

function buildPromptText(params: {
  directionLabel: string;
  elevation: number;
  skyLabel: string;
  shadowLengthLabel: string;
  shadowBlurLabel: string;
}): string {
  const directionMap: Record<string, string> = {
    '右侧光': 'right side sunlight',
    '右后方光': 'right-back side sunlight',
    '正后方光 / 逆光': 'backlight from behind',
    '左后方光': 'left-back side sunlight',
    '左侧光': 'left side sunlight',
    '左前方光': 'left-front side sunlight',
    '正前方光': 'front sunlight',
    '右前方光': 'right-front side sunlight',
  };
  const directionText = directionMap[params.directionLabel] || 'natural sunlight';

  const shadowLengthText = params.shadowLengthLabel === '超长阴影'
    ? 'very long'
    : params.shadowLengthLabel === '很长阴影'
      ? 'long'
      : params.shadowLengthLabel === '长阴影'
        ? 'long'
        : params.shadowLengthLabel === '中等阴影'
          ? 'medium'
          : params.shadowLengthLabel === '短阴影'
            ? 'short'
            : 'very short';
  const shadowBlurText = params.shadowBlurLabel === '清晰'
    ? 'crisp'
    : params.shadowBlurLabel === '标准'
      ? 'natural'
      : params.shadowBlurLabel === '稍柔'
        ? 'slightly soft'
        : 'soft';

  if (params.elevation <= 12) {
    return `low golden hour ${directionText}, warm horizon glow, cool upper sky, ${shadowLengthText} ${shadowBlurText} shadows, realistic architectural sun and sky lighting`;
  }
  if (params.elevation <= 30) {
    return `afternoon ${directionText}, natural blue sky, pale warm horizon, ${shadowLengthText} ${shadowBlurText} architectural shadows, realistic sun and sky lighting`;
  }
  if (params.elevation <= 60) {
    return `standard daylight, ${directionText}, natural blue sky, neutral white sunlight, ${shadowLengthText} ${shadowBlurText} architectural shadows, realistic sun and sky lighting`;
  }
  return `high noon sunlight, clean blue sky, white overhead sun, ${shadowLengthText} ${shadowBlurText} shadows, realistic architectural daylight`;
}

export interface ResolveSunSkyInput {
  elevation?: number;
  azimuth?: number;
  linkedImageNodeIds?: string[];
}

export function resolveSunSkyDerived(input?: ResolveSunSkyInput): SunSkyNodeDerived {
  const elevation = snapToStep(clamp(input?.elevation ?? 12, 3, 90), 3);
  const azimuth = snapToStep(clamp(input?.azimuth ?? 55, 0, 360), 5);
  const mathAzimuth = normalizeAzimuthForMath(azimuth);

  const frame = interpolateElevation(elevation);
  const directionLabel = getDirectionLabel(mathAzimuth);
  const skyLabel = getSkyLabel(elevation);
  const shadowLengthLabel = getShadowLengthLabel(frame.shadowLengthScale);
  const shadowBlurLabel = getShadowBlurLabel(frame.shadowBlur);
  const shadowDirection = normalizeAzimuthForMath(mathAzimuth + 180);
  const previewImagePath = getSunSkyPreviewImage({ elevation, azimuth });

  const summary = buildSummary({
    directionLabel,
    timeLabel: frame.timeLabel,
    elevation,
    skyLabel,
    shadowLengthLabel,
    shadowBlurLabel,
  });

  const promptText = buildPromptText({
    directionLabel,
    elevation,
    skyLabel,
    shadowLengthLabel,
    shadowBlurLabel,
  });

  return {
    timeLabel: frame.timeLabel,
    directionLabel,
    skyTopColor: frame.skyTopColor,
    skyHorizonColor: frame.skyHorizonColor,
    sunColor: frame.sunColor,
    colorTemp: frame.colorTemp,
    sunIntensity: frame.sunIntensity,
    shadowDirection,
    shadowLengthScale: frame.shadowLengthScale,
    shadowBlur: frame.shadowBlur,
    shadowOpacity: frame.shadowOpacity,
    shadowLengthLabel,
    shadowBlurLabel,
    skyLabel,
    summary,
    promptText,
    previewImagePath,
  };
}
