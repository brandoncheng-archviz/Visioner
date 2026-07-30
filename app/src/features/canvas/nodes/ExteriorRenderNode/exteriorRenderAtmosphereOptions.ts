import type {
  QuickRenderAtmosphereLighting,
  QuickRenderAtmosphereStyle,
  QuickRenderAtmosphereTime,
  QuickRenderAtmosphereWeather,
} from './quickRenderExterior.types';

export type QuickRenderAtmosphereDisplayOption<T extends string> = {
  id: T;
  labelKey: string;
};

export const QUICK_RENDER_TIME_OPTIONS: QuickRenderAtmosphereDisplayOption<QuickRenderAtmosphereTime>[] = [
  { id: 'sunrise', labelKey: 'atmosphere.time.sunrise' },
  { id: 'earlyMorning', labelKey: 'atmosphere.time.earlyMorning' },
  { id: 'noon', labelKey: 'atmosphere.time.noon' },
  { id: 'afternoon', labelKey: 'atmosphere.time.afternoon' },
  { id: 'sunset', labelKey: 'atmosphere.time.sunset' },
  { id: 'night', labelKey: 'atmosphere.time.night' },
];

export const QUICK_RENDER_LIGHTING_OPTIONS: QuickRenderAtmosphereDisplayOption<QuickRenderAtmosphereLighting>[] = [
  { id: 'front', labelKey: 'atmosphere.lighting.front' },
  { id: 'back', labelKey: 'atmosphere.lighting.back' },
  { id: 'left', labelKey: 'atmosphere.lighting.left' },
  { id: 'right', labelKey: 'atmosphere.lighting.right' },
  { id: 'softSky', labelKey: 'atmosphere.lighting.softSky' },
];

export const QUICK_RENDER_WEATHER_OPTIONS: QuickRenderAtmosphereDisplayOption<QuickRenderAtmosphereWeather>[] = [
  { id: 'sunny', labelKey: 'atmosphere.weather.sunny' },
  { id: 'cloudy', labelKey: 'atmosphere.weather.cloudy' },
  { id: 'rainy', labelKey: 'atmosphere.weather.rainy' },
  { id: 'snowy', labelKey: 'atmosphere.weather.snowy' },
  { id: 'foggy', labelKey: 'atmosphere.weather.foggy' },
];

export const QUICK_RENDER_STYLE_OPTIONS: QuickRenderAtmosphereDisplayOption<QuickRenderAtmosphereStyle>[] = [
  { id: 'photorealistic', labelKey: 'atmosphere.style.photorealistic' },
  { id: 'nordic', labelKey: 'atmosphere.style.nordic' },
  { id: 'dramaticConcept', labelKey: 'atmosphere.style.dramaticConcept' },
  { id: 'luxuryRealEstate', labelKey: 'atmosphere.style.luxuryRealEstate' },
  { id: 'painterly', labelKey: 'atmosphere.style.painterly' },
];

export const QUICK_RENDER_TOGGLE_OPTIONS = [
  { key: 'addEntourage', labelKey: 'atmosphere.toggles.addEntourage.label' },
  { key: 'addPeople', labelKey: 'atmosphere.toggles.addPeople.label' },
  { key: 'interiorLights', labelKey: 'atmosphere.toggles.interiorLights.label' },
  { key: 'motionBlur', labelKey: 'atmosphere.toggles.motionBlur.label' },
] as const;
