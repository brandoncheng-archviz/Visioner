import type { LightPreviewData } from '../types/lightPreview.types';
import type { RelightCloudAmount, RelightFogLevel, RelightSettings } from '../types/relight.types';
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

export function createRelightLightPreview(
  sun: { elevation: number; azimuth: number },
  settings: RelightSettings,
): LightPreviewData {
  const elevation = snapToStep(clamp(sun.elevation, 0, 90), 3);
  const azimuth = snapToStep(clamp(sun.azimuth, 0, 360), 5);
  const baseDerived = resolveSunSkyDerived({ elevation, azimuth });
  const atmosphereLabel = resolveRelightAtmosphereLabel(settings);
  const atmospherePrompt = resolveAtmospherePrompt(settings);

  return {
    enabled: true,
    sun: { elevation, azimuth },
    settings: { ...settings },
    derived: {
      ...baseDerived,
      summary: `${baseDerived.timeLabel} · ${baseDerived.directionLabel}，${atmosphereLabel}，${baseDerived.shadowLengthLabel}、${baseDerived.shadowBlurLabel}阴影，适合建筑可视化。`,
      promptText: `${baseDerived.promptText}, ${atmospherePrompt}`,
    },
  };
}
