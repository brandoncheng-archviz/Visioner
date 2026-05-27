import type { SimpleSunSkyDerived, SimpleSunSkyInput, SimpleSunSkyState } from '../types/simpleSunSky.types';

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

const ELEVATION_KEYFRAMES: ElevationKeyframe[] = [
  {
    elevation: 0,
    timeLabel: '日出/日落边缘',
    skyTopColor: '#141a22',
    skyHorizonColor: '#e05828',
    sunColor: '#ff7a28',
    colorTemp: 2500,
    sunIntensity: 0.85,
    shadowLengthScale: 1,
    shadowBlur: 20,
    shadowOpacity: 0.42,
  },
  {
    elevation: 3,
    timeLabel: '日出/日落边缘',
    skyTopColor: '#1c2430',
    skyHorizonColor: '#d86830',
    sunColor: '#ff8c38',
    colorTemp: 2800,
    sunIntensity: 0.95,
    shadowLengthScale: 0.95,
    shadowBlur: 17,
    shadowOpacity: 0.45,
  },
  {
    elevation: 6,
    timeLabel: '黄金时刻',
    skyTopColor: '#283240',
    skyHorizonColor: '#e08840',
    sunColor: '#ffa040',
    colorTemp: 3200,
    sunIntensity: 1.15,
    shadowLengthScale: 0.88,
    shadowBlur: 14,
    shadowOpacity: 0.48,
  },
  {
    elevation: 9,
    timeLabel: '黄金时刻',
    skyTopColor: '#384454',
    skyHorizonColor: '#f0a858',
    sunColor: '#ffbc55',
    colorTemp: 3600,
    sunIntensity: 1.35,
    shadowLengthScale: 0.8,
    shadowBlur: 12,
    shadowOpacity: 0.5,
  },
  {
    elevation: 12,
    timeLabel: '黄金时刻',
    skyTopColor: '#485668',
    skyHorizonColor: '#f5c878',
    sunColor: '#ffd880',
    colorTemp: 4000,
    sunIntensity: 1.55,
    shadowLengthScale: 0.72,
    shadowBlur: 10,
    shadowOpacity: 0.52,
  },
  {
    elevation: 15,
    timeLabel: '低角度日光',
    skyTopColor: '#54687c',
    skyHorizonColor: '#e8ddd0',
    sunColor: '#fff0c0',
    colorTemp: 4400,
    sunIntensity: 1.75,
    shadowLengthScale: 0.64,
    shadowBlur: 8,
    shadowOpacity: 0.54,
  },
  {
    elevation: 18,
    timeLabel: '低角度日光',
    skyTopColor: '#4a78a8',
    skyHorizonColor: '#d4e0ec',
    sunColor: '#fff8f0',
    colorTemp: 4800,
    sunIntensity: 1.95,
    shadowLengthScale: 0.55,
    shadowBlur: 7,
    shadowOpacity: 0.55,
  },
  {
    elevation: 24,
    timeLabel: '下午日光',
    skyTopColor: '#3880c0',
    skyHorizonColor: '#c4dae8',
    sunColor: '#ffffff',
    colorTemp: 5200,
    sunIntensity: 2.15,
    shadowLengthScale: 0.42,
    shadowBlur: 5.5,
    shadowOpacity: 0.55,
  },
  {
    elevation: 33,
    timeLabel: '标准日光',
    skyTopColor: '#2a88d0',
    skyHorizonColor: '#bad8ee',
    sunColor: '#ffffff',
    colorTemp: 5600,
    sunIntensity: 2.35,
    shadowLengthScale: 0.3,
    shadowBlur: 4.5,
    shadowOpacity: 0.55,
  },
  {
    elevation: 45,
    timeLabel: '标准日光',
    skyTopColor: '#1e88e0',
    skyHorizonColor: '#b0d8f0',
    sunColor: '#ffffff',
    colorTemp: 6000,
    sunIntensity: 2.55,
    shadowLengthScale: 0.2,
    shadowBlur: 3.5,
    shadowOpacity: 0.52,
  },
  {
    elevation: 60,
    timeLabel: '接近正午',
    skyTopColor: '#1884e0',
    skyHorizonColor: '#b0daf2',
    sunColor: '#ffffff',
    colorTemp: 6300,
    sunIntensity: 2.75,
    shadowLengthScale: 0.12,
    shadowBlur: 2.8,
    shadowOpacity: 0.48,
  },
  {
    elevation: 75,
    timeLabel: '正午',
    skyTopColor: '#1a88e4',
    skyHorizonColor: '#b8def4',
    sunColor: '#ffffff',
    colorTemp: 6500,
    sunIntensity: 2.85,
    shadowLengthScale: 0.08,
    shadowBlur: 2.2,
    shadowOpacity: 0.44,
  },
  {
    elevation: 90,
    timeLabel: '顶光',
    skyTopColor: '#2088e0',
    skyHorizonColor: '#c0e2f5',
    sunColor: '#ffffff',
    colorTemp: 6600,
    sunIntensity: 2.8,
    shadowLengthScale: 0.05,
    shadowBlur: 1.8,
    shadowOpacity: 0.4,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToStep(value: number, step: number) {
  return Math.round(value / step) * step;
}

function normalizeAzimuth(value: number) {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function interpolateColor(from: string, to: string, t: number) {
  const fromRgb = parseColor(from);
  const toRgb = parseColor(to);
  const r = Math.round(lerp(fromRgb.r, toRgb.r, t));
  const g = Math.round(lerp(fromRgb.g, toRgb.g, t));
  const b = Math.round(lerp(fromRgb.b, toRgb.b, t));
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function parseColor(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

function toHex(value: number) {
  return clamp(value, 0, 255).toString(16).padStart(2, '0');
}

function findElevationFrame(elevation: number) {
  for (let index = 0; index < ELEVATION_KEYFRAMES.length - 1; index += 1) {
    const current = ELEVATION_KEYFRAMES[index];
    const next = ELEVATION_KEYFRAMES[index + 1];
    if (elevation >= current.elevation && elevation <= next.elevation) {
      return { current, next };
    }
  }
  const last = ELEVATION_KEYFRAMES[ELEVATION_KEYFRAMES.length - 1];
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

function round(value: number, digits: number) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function getSimpleSunSkyDirectionLabel(azimuth: number) {
  const sector = Math.round(normalizeAzimuth(azimuth) / 45) % 8;
  const labels = [
    '正前方光',
    '右前方光',
    '右侧光',
    '右后方光',
    '正后方逆光',
    '左后方光',
    '左侧光',
    '左前方光',
  ];
  return labels[sector];
}

function getSkyDescription(elevation: number) {
  if (elevation <= 12) return '冷蓝天空 + 暖色地平线';
  if (elevation <= 30) return '自然蓝天 + 浅暖地平线';
  if (elevation <= 60) return '标准蓝天';
  return '正午蓝天';
}

function getShadowLengthLabel(scale: number) {
  if (scale >= 0.78) return '超长阴影';
  if (scale >= 0.5) return '长阴影';
  if (scale >= 0.28) return '中等阴影';
  if (scale >= 0.12) return '短阴影';
  return '极短阴影';
}

function getShadowBlurLabel(blur: number) {
  if (blur >= 12) return '柔和';
  if (blur >= 7) return '稍柔';
  if (blur >= 4) return '标准';
  return '清晰';
}

function getElevationDescriptor(elevation: number) {
  if (elevation <= 6) return '极低角度';
  if (elevation <= 15) return '低角度';
  if (elevation <= 30) return '中低角度';
  if (elevation <= 55) return '中角度';
  return '高角度';
}

function buildSummary(params: {
  directionLabel: string;
  timeLabel: string;
  elevation: number;
  skyDescription: string;
  shadowLengthLabel: string;
  shadowBlurLabel: string;
}) {
  const elevationDesc = getElevationDescriptor(params.elevation);
  const shadowEdge = params.shadowBlurLabel === '清晰'
    ? '边缘清晰'
    : params.shadowBlurLabel === '标准'
    ? '边缘标准'
    : `略带${params.shadowBlurLabel}`;

  const skyShort = params.skyDescription.replace(' + ', '，').replace('冷蓝天空', '冷蓝天空').replace('自然蓝天 + 浅暖地平线', '自然蓝天');

  return `${params.directionLabel}${elevationDesc}${params.timeLabel}，${skyShort}，${params.shadowLengthLabel}${shadowEdge}，适合突出建筑体块和空间层次。`;
}

function buildPromptText(derived: Omit<SimpleSunSkyDerived, 'promptText'>) {
  return [
    'architectural visualization sun and sky lighting',
    derived.timeLabel,
    derived.directionLabel,
    `${derived.colorTemp}K sunlight`,
    `sun intensity ${derived.sunIntensity}`,
    derived.skyDescription,
    derived.shadowLengthLabel,
    `${derived.shadowBlurLabel} shadow edge`,
  ].join(', ');
}

export function resolveSimpleSunSkyState(input?: SimpleSunSkyInput): SimpleSunSkyState {
  const elevation = snapToStep(clamp(input?.sun?.elevation ?? 12, 0, 90), 3);
  const azimuth = snapToStep(normalizeAzimuth(input?.sun?.azimuth ?? 45), 5);
  const frame = interpolateElevation(elevation);
  const directionLabel = getSimpleSunSkyDirectionLabel(azimuth);
  const skyDescription = getSkyDescription(elevation);
  const shadowLengthLabel = getShadowLengthLabel(frame.shadowLengthScale);
  const shadowBlurLabel = getShadowBlurLabel(frame.shadowBlur);
  const shadowDirection = normalizeAzimuth(azimuth + 180);
  const summary = buildSummary({
    directionLabel,
    timeLabel: frame.timeLabel,
    elevation,
    skyDescription,
    shadowLengthLabel,
    shadowBlurLabel,
  });

  const derivedWithoutPrompt: Omit<SimpleSunSkyDerived, 'promptText'> = {
    timeLabel: frame.timeLabel,
    directionLabel,
    skyTopColor: frame.skyTopColor,
    skyHorizonColor: frame.skyHorizonColor,
    skyDescription,
    sunColor: frame.sunColor,
    colorTemp: frame.colorTemp,
    sunIntensity: frame.sunIntensity,
    shadowDirection,
    shadowLengthScale: frame.shadowLengthScale,
    shadowLengthLabel,
    shadowBlur: frame.shadowBlur,
    shadowBlurLabel,
    shadowOpacity: frame.shadowOpacity,
    summary,
  };

  return {
    sun: { elevation, azimuth },
    derived: {
      ...derivedWithoutPrompt,
      promptText: buildPromptText(derivedWithoutPrompt),
    },
    linkedImageNodeIds: input?.linkedImageNodeIds ?? [],
  };
}
