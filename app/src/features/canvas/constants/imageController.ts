import type {
  ImageControllerState,
  ImageControllerToggles,
  LightDirectionPreferenceId,
  SeasonPreferenceId,
  StylePreferenceId,
  TimePreferenceId,
  WeatherPreferenceId,
} from '../types/imageController.types';

export interface ControllerOption<T extends string> {
  id: T;
  label: string;
  shortLabel?: string;
  description: string;
  prompt: string;
  presetId?: string;
  styleId?: string;
}

export interface ControllerToggleOption {
  id: keyof ImageControllerToggles;
  label: string;
  description: string;
  prompt: string;
  presetId?: string;
}

export const DEFAULT_IMAGE_CONTROLLER_STATE: ImageControllerState = {
  toggles: { addEnvironment: true, addPeople: true, indoorLighting: true, motionBlur: false },
  time: null,
  lightDirection: null,
  weather: null,
  season: null,
  style: null,
};

export const TOGGLE_OPTIONS: ControllerToggleOption[] = [
  { id: 'addEnvironment', label: '增加配景', description: '补充植物、车辆、景观、天空层次和远景细节，不主动加人物', prompt: '在不改变建筑主体、构图、设计逻辑、道路关系和主要景观边界的前提下，增加合理的环境配景元素，如植物、地被、景观小品、少量车辆、街道生活氛围、天空层次和远景细节。不要主动增加大量人物，配景不得抢建筑主体。' },
  { id: 'addPeople', label: '增加人物', description: '增加尺度人物和生活化活动', presetId: 'add_people', prompt: '增加合理的尺度人物、活动人物或生活化人物，让空间更有使用感和氛围感。人物比例、位置和数量需要自然克制，不得遮挡建筑主体，不得破坏构图。' },
  { id: 'indoorLighting', label: '室内灯光', description: '增强窗内灯光和空间使用感', presetId: 'artificial_light', prompt: '增强合理的室内灯光、窗内暖光和空间使用感，灯光应符合建筑功能、时间氛围和空间逻辑，避免过曝、过黄、霓虹化或色彩混乱。' },
  { id: 'motionBlur', label: '动态模糊', description: '给人物、车辆或活动元素增加克制运动感', prompt: '为人物、车辆或局部活动元素加入克制的动态模糊，增强画面生活感和运动感。建筑主体、立面、结构、材质和主要空间边界必须保持清晰。' },
];

export const TIME_OPTIONS: ControllerOption<TimePreferenceId>[] = [
  { id: 'sunrise', label: '日出', description: '低角度晨光、冷暖交替、长阴影', prompt: '时间氛围为日出时分，使用很低角度的晨光、冷暖交替的天空颜色、柔和但有方向感的光线和较长阴影，整体氛围安静、清透且富有清晨感。' },
  { id: 'morning', label: '清晨', description: '柔和日光、清透空气、自然早晨感', prompt: '时间氛围为清晨，使用柔和自然的早晨日光、清透空气和较长但不过分夸张的阴影，整体明亮、自然、安静。' },
  { id: 'noon', label: '正午', description: '高太阳、清晰材质、短阴影', prompt: '时间氛围为正午，使用高太阳角度、清晰直接的自然光、较短阴影和稳定曝光，突出建筑材质和空间关系的清晰表达。' },
  { id: 'afternoon', label: '下午', description: '稳定日光、略柔和、自然侧光', prompt: '时间氛围为下午，使用稳定自然的日光和略带方向感的侧光，阴影长度适中，画面清晰自然并具有舒适的白天氛围。' },
  { id: 'dusk', label: '傍晚', description: '暖色低光、长阴影、黄金时刻', presetId: 'golden_hour', prompt: '时间氛围为傍晚或黄金时刻，使用低角度暖色日光、较长阴影、柔和天空和更强的氛围感，同时保持建筑主体清晰。' },
  { id: 'night', label: '夜景', description: '夜间氛围、室内外灯光、暗部层次', presetId: 'night', prompt: '时间氛围为夜景，增强夜空、室内外灯光、暗部细节和合理反射，让夜间建筑氛围真实可信，避免过暗、灯光过曝或霓虹化。' },
];

export const LIGHT_DIRECTION_OPTIONS: ControllerOption<LightDirectionPreferenceId>[] = [
  { id: 'front_light', label: '顺光', description: '正面照亮建筑，画面清晰直接', prompt: '采用顺光关系，主要光线从画面正面或相机方向照向建筑，使建筑立面清晰可读，阴影关系自然克制。' },
  { id: 'left_side_light', label: '左侧光', description: '从画面左侧入射，增强体块层次', prompt: '阳光从画面左侧进入，形成自然侧光和体块阴影，增强建筑立面、材质和空间层次。' },
  { id: 'right_side_light', label: '右侧光', description: '从画面右侧入射，增强体块层次', prompt: '阳光从画面右侧进入，形成自然侧光和体块阴影，增强建筑立面、材质和空间层次。' },
  { id: 'back_light', label: '逆光', description: '强调轮廓、边缘高光和氛围', prompt: '采用逆光关系，光源位于建筑后方或画面远端，强调建筑轮廓、边缘高光和空间氛围，同时保持主体可读。' },
  { id: 'diffused_light', label: '漫射光', description: '柔和均匀、弱阴影、低对比', prompt: '采用漫射光关系，光线柔和均匀，阴影较弱，对比克制，整体接近阴天或云层过滤后的自然光感，同时保持建筑材质和空间层次清楚。' },
];

export const WEATHER_OPTIONS: ControllerOption<WeatherPreferenceId>[] = [
  { id: 'sunny', label: '晴天', description: '清晰天空、自然阳光', prompt: '天气为晴天，天空清晰，阳光自然，阴影关系明确，整体画面干净通透。' },
  { id: 'cloudy', label: '阴天', description: '柔和漫射光、低对比', prompt: '天气为阴天，使用柔和漫射光、低对比和均匀天空亮度，保持建筑材质清晰，避免画面灰脏。' },
  { id: 'rainy', label: '雨天', description: '湿润地面、柔和反射', presetId: 'rain', prompt: '天气为雨天或雨后，增强湿润地面、柔和反射、水汽感和阴天漫射光，避免夸张暴雨遮挡主体。' },
  { id: 'snowy', label: '雪天', description: '积雪、冷色天光、冬季空气', prompt: '天气为雪天，地面、植物和环境有合理积雪，天空为冷色天光，保持建筑主体清晰，避免积雪覆盖重要设计细节。' },
  { id: 'foggy', label: '雾天', description: '空气透视、柔和层次', presetId: 'fog', prompt: '天气带有雾气，通过空气透视、柔和远景和低对比增强空间层次，同时保持建筑主体可读。' },
];

export const SEASON_OPTIONS: ControllerOption<SeasonPreferenceId>[] = [
  { id: 'spring', label: '春', description: '新绿、轻盈、自然生长感', prompt: '季节为春季，植被呈现新绿和自然生长感，环境清新但不过度鲜艳，整体氛围轻盈自然。' },
  { id: 'summer', label: '夏', description: '浓绿、明亮、日照充足', prompt: '季节为夏季，植被浓绿，日照充足，环境饱满自然，避免过度闷热或色彩过饱和。' },
  { id: 'autumn', label: '秋', description: '暖棕植被、柔和空气', presetId: 'autumn', prompt: '季节为秋季，增强暖棕色植被、落叶、柔和空气感和低饱和季节氛围。' },
  { id: 'winter', label: '冬', description: '冬季植被、冷色空气', presetId: 'winter', prompt: '季节为冬季，使用冬季植被、冷色空气和克制的季节细节，保持建筑与环境真实统一。' },
];

export const STYLE_OPTIONS: ControllerOption<StylePreferenceId>[] = [
  { id: 'photo_realistic', label: '照片般真实', description: '照片级真实、自然光影、真实材质', presetId: 'photo_realistic', prompt: '将画面处理为照片般真实的建筑可视化效果，保持建筑主体、构图比例、体块关系和关键设计细节稳定，增强真实光影、自然材质、空间层次和环境融合度。' },
  { id: 'nordic_atmosphere', label: '北欧氛围', description: '低饱和、诗意氛围、柔和自然光', styleId: 'nordic_atmosphere', prompt: '使用北欧氛围感的视觉倾向，整体低饱和、冷静、克制、自然，强调柔和光线、空气感、自然环境融合和安静的建筑气质。' },
  { id: 'conceptual_drama', label: '概念戏剧', description: '强对比、概念叙事、戏剧化冲击', styleId: 'conceptual_drama', prompt: '使用概念戏剧感的视觉倾向，强化光影冲突、形体张力、冷暖关系和概念叙事感，让画面更具冲击力和设计表达。' },
  { id: 'premium_real_estate', label: '高端地产', description: '精致质感、温暖叙事、商业成片', styleId: 'premium_real_estate', prompt: '使用高端地产感的视觉倾向，强调精致材质、温暖灯光、舒适生活方式、清晰商业表达和高质量建筑可视化成片感。' },
  { id: 'painterly_expression', label: '绘画感', description: '绘画质感、艺术表达、诗意优雅', styleId: 'painterly_expression', prompt: '使用绘画感表现的视觉倾向，强化统一色彩、柔和边界、艺术化氛围和诗意表达，但保持建筑逻辑真实可信，避免过度绘画化。' },
];

export function hasActiveImageController(controller: ImageControllerState): boolean {
  return Object.values(controller.toggles).some(Boolean)
    || Boolean(controller.time || controller.lightDirection || controller.weather || controller.season || controller.style);
}
