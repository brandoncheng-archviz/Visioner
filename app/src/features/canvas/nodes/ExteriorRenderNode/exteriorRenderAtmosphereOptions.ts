import type {
  ExteriorRenderAtmosphereLighting,
  ExteriorRenderAtmosphereStyle,
  ExteriorRenderAtmosphereTime,
  ExteriorRenderAtmosphereWeather,
} from './exteriorRender.types';

export type ExteriorRenderAtmosphereDisplayOption<T extends string> = {
  id: T;
  labelKey: string;
};

export const EXTERIOR_RENDER_TIME_OPTIONS: ExteriorRenderAtmosphereDisplayOption<ExteriorRenderAtmosphereTime>[] = [
  { id: 'sunrise', labelKey: 'atmosphere.time.sunrise' },
  { id: 'earlyMorning', labelKey: 'atmosphere.time.earlyMorning' },
  { id: 'noon', labelKey: 'atmosphere.time.noon' },
  { id: 'afternoon', labelKey: 'atmosphere.time.afternoon' },
  { id: 'sunset', labelKey: 'atmosphere.time.sunset' },
  { id: 'night', labelKey: 'atmosphere.time.night' },
];

export const EXTERIOR_RENDER_LIGHTING_OPTIONS: ExteriorRenderAtmosphereDisplayOption<ExteriorRenderAtmosphereLighting>[] = [
  { id: 'front', labelKey: 'atmosphere.lighting.front' },
  { id: 'back', labelKey: 'atmosphere.lighting.back' },
  { id: 'left', labelKey: 'atmosphere.lighting.left' },
  { id: 'right', labelKey: 'atmosphere.lighting.right' },
  { id: 'softSky', labelKey: 'atmosphere.lighting.softSky' },
];

export const EXTERIOR_RENDER_WEATHER_OPTIONS: ExteriorRenderAtmosphereDisplayOption<ExteriorRenderAtmosphereWeather>[] = [
  { id: 'sunny', labelKey: 'atmosphere.weather.sunny' },
  { id: 'cloudy', labelKey: 'atmosphere.weather.cloudy' },
  { id: 'rainy', labelKey: 'atmosphere.weather.rainy' },
  { id: 'snowy', labelKey: 'atmosphere.weather.snowy' },
  { id: 'foggy', labelKey: 'atmosphere.weather.foggy' },
];

export const EXTERIOR_RENDER_STYLE_OPTIONS: ExteriorRenderAtmosphereDisplayOption<ExteriorRenderAtmosphereStyle>[] = [
  { id: 'photoreal', labelKey: 'atmosphere.style.photoreal' },
  { id: 'luxuryRealEstate', labelKey: 'atmosphere.style.luxuryRealEstate' },
  { id: 'competitionVisual', labelKey: 'atmosphere.style.competitionVisual' },
  { id: 'conceptAtmosphere', labelKey: 'atmosphere.style.conceptAtmosphere' },
  { id: 'commercialAd', labelKey: 'atmosphere.style.commercialAd' },
];

const EXTERIOR_RENDER_LEGACY_STYLE_MAP: Readonly<Record<string, ExteriorRenderAtmosphereStyle | null>> = {
  photoreal: 'photoreal',
  photorealistic: 'photoreal',
  '照片般真实': 'photoreal',
  '照片真实': 'photoreal',
  luxuryRealEstate: 'luxuryRealEstate',
  luxury: 'luxuryRealEstate',
  '高端地产': 'luxuryRealEstate',
  competitionVisual: 'competitionVisual',
  '竞赛表现': 'competitionVisual',
  conceptAtmosphere: 'conceptAtmosphere',
  dramaticConcept: 'conceptAtmosphere',
  painterly: 'conceptAtmosphere',
  '概念戏剧': 'conceptAtmosphere',
  '绘画感': 'conceptAtmosphere',
  '概念氛围': 'conceptAtmosphere',
  commercialAd: 'commercialAd',
  '商业广告': 'commercialAd',
  nordic: null,
  '北欧氛围': null,
};

export function normalizeExteriorRenderAtmosphereStyle(value: unknown): ExteriorRenderAtmosphereStyle | null {
  if (typeof value !== 'string') return null;
  return EXTERIOR_RENDER_LEGACY_STYLE_MAP[value] ?? null;
}

export const EXTERIOR_RENDER_TOGGLE_OPTIONS = [
  { key: 'addEntourage', labelKey: 'atmosphere.toggles.addEntourage.label' },
  { key: 'addPeople', labelKey: 'atmosphere.toggles.addPeople.label' },
  { key: 'interiorLights', labelKey: 'atmosphere.toggles.interiorLights.label' },
  { key: 'motionBlur', labelKey: 'atmosphere.toggles.motionBlur.label' },
] as const;
