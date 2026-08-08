import type { LightPreviewData } from '../types/lightPreview.types';
import type { RelightCloudAmount, RelightFogLevel, RelightSettings, RelightTimePeriod } from '../types/relight.types';
import { resolveSunSkyDerived } from '../nodes/SunSkyNode/resolveSunSkyDerived';
import { clamp, snapToStep } from '../nodes/SunSkyNode/sunSkyNode.utils';

const CLOUD_LABELS: Record<RelightCloudAmount, string> = {
  clear: '晴朗',
  fewClouds: '少云',
  cloudy: '多云',
  overcast: '阴天',
};

const FOG_LABELS: Record<RelightFogLevel, string> = {
  none: '无雾',
  light: '轻雾',
  medium: '中雾',
  heavy: '浓雾',
};

const CLOUD_PROMPTS: Record<RelightCloudAmount, string> = {
  clear: 'clear sky',
  fewClouds: 'mostly clear sky with a few soft clouds',
  cloudy: 'cloudy sky with soft diffused daylight',
  overcast: 'overcast sky with broad diffused light',
};

export function resolveRelightAtmosphereLabel(settings: RelightSettings): string {
  const key = `${settings.cloudAmount}:${settings.fogLevel}`;
  const combinations: Record<string, string> = {
    'clear:none': '清透晴天',
    'clear:light': '晴天柔光',
    'clear:medium': '晴天薄雾',
    'clear:heavy': '晴朗天空 + 低空浓雾',
    'fewClouds:none': '少云清透',
    'fewClouds:light': '少云轻雾',
    'fewClouds:medium': '少云薄雾',
    'fewClouds:heavy': '云隙阳光穿过浓雾',
    'cloudy:none': '多云柔光',
    'cloudy:light': '多云柔光',
    'cloudy:medium': '多云薄雾',
    'cloudy:heavy': '多云浓雾',
    'overcast:none': '柔和阴天',
    'overcast:light': '阴天轻雾',
    'overcast:medium': '阴天薄雾',
    'overcast:heavy': '浓雾阴天',
  };
  return combinations[key] || `${CLOUD_LABELS[settings.cloudAmount]} · ${FOG_LABELS[settings.fogLevel]}`;
}

function resolveAtmospherePrompt(settings: RelightSettings): string {
  const fogPrompts: Record<RelightFogLevel, string> = {
    none: 'crisp clear atmosphere',
    light: 'subtle light mist with soft aerial perspective',
    medium: 'visible low atmospheric haze with softened distance',
    heavy: settings.cloudAmount === 'clear'
      ? 'clear upper sky, dense low-lying morning fog, sunlight passing through the mist'
      : 'dense atmospheric fog with soft diffused visibility',
  };
  return `${CLOUD_PROMPTS[settings.cloudAmount]}, ${fogPrompts[settings.fogLevel]}`;
}

const TIME_PERIOD_PROMPTS: Record<RelightTimePeriod, string> = {
  earlyMorning: 'early morning sun and sky atmosphere',
  morning: 'clean morning daylight atmosphere',
  noon: 'bright noon daylight atmosphere',
  afternoon: 'natural afternoon daylight atmosphere',
  evening: 'warm evening and golden-hour atmosphere',
  night: 'night sky atmosphere with restrained ambient illumination',
};

export function createRelightLightPreview(
  sun: { elevation: number; azimuth: number },
  settings: RelightSettings,
): LightPreviewData {
  const elevation = snapToStep(clamp(sun.elevation, 0, 90), 3);
  const azimuth = snapToStep(clamp(sun.azimuth, 0, 360), 5);
  const baseDerived = resolveSunSkyDerived({ elevation, azimuth });
  const atmosphereLabel = resolveRelightAtmosphereLabel(settings);
  const atmospherePrompt = resolveAtmospherePrompt(settings);
  const timePeriodPrompt = settings.timePeriod ? `${TIME_PERIOD_PROMPTS[settings.timePeriod]}, ` : '';
  const isSunsetAfterglow = settings.lightingPresetId === 'clear-noon';

  const derived = isSunsetAfterglow
    ? {
        ...baseDerived,
        timeLabel: '日落余晖',
        skyLabel: '柔和暮色天空 + 低饱和暖色地平线',
        summary: `${baseDerived.directionLabel}极低角度日落余晖，天空柔和并略带暮色，${atmosphereLabel}，${baseDerived.shadowLengthLabel}、${baseDerived.shadowBlurLabel}阴影，氛围低缓安静。`,
        promptText: `${timePeriodPrompt}late sunset afterglow, very low ${baseDerived.directionLabel === '右前方光' ? 'right-front light' : 'natural directional light'}, soft dusky sky, subdued warm horizon, quiet low-intensity illumination, ${baseDerived.shadowLengthLabel === '超长阴影' ? 'very long' : 'long'} soft shadows, ${atmospherePrompt}, realistic architectural visualization`,
      }
    : {
        ...baseDerived,
        summary: `${baseDerived.timeLabel} · ${baseDerived.directionLabel}，${atmosphereLabel}，${baseDerived.shadowLengthLabel}、${baseDerived.shadowBlurLabel}阴影，适合建筑可视化。`,
        promptText: `${timePeriodPrompt}${baseDerived.promptText}, ${atmospherePrompt}`,
      };

  return {
    enabled: true,
    sun: { elevation, azimuth },
    settings: { ...settings },
    derived,
  };
}
