import type { RelightPreset, RelightSettings } from '../types/relight.types';

export const DEFAULT_RELIGHT_SUN = {
  elevation: 33,
  azimuth: 55,
} as const;

export const DEFAULT_RELIGHT_SETTINGS: RelightSettings = {
  cloudAmount: 'clear',
  fogLevel: 'none',
};

export const RELIGHT_PRESETS: RelightPreset[] = [
  {
    id: 'early-morning-low-light',
    name: '清晨低光',
    description: '低角度柔光与轻雾',
    elevation: 9,
    azimuth: 50,
    cloudAmount: 'fewClouds',
    fogLevel: 'light',
  },
  {
    id: 'morning-soft-light',
    name: '上午柔光',
    description: '清爽自然的柔和日光',
    elevation: 30,
    azimuth: 65,
    cloudAmount: 'fewClouds',
    fogLevel: 'none',
  },
  {
    id: 'afternoon-side-light',
    name: '下午侧光',
    description: '侧光强化建筑体块',
    elevation: 24,
    azimuth: 10,
    cloudAmount: 'clear',
    fogLevel: 'none',
  },
  {
    id: 'golden-hour',
    name: '黄金时刻',
    description: '暖色地平线与长阴影',
    elevation: 12,
    azimuth: 55,
    cloudAmount: 'fewClouds',
    fogLevel: 'light',
  },
  {
    id: 'soft-backlight',
    name: '柔和逆光',
    description: '轻雾中的建筑边缘光',
    elevation: 18,
    azimuth: 90,
    cloudAmount: 'cloudy',
    fogLevel: 'light',
  },
  {
    id: 'clear-noon',
    name: '正午清晰',
    description: '短阴影与清透天空',
    elevation: 69,
    azimuth: 55,
    cloudAmount: 'clear',
    fogLevel: 'none',
  },
];
