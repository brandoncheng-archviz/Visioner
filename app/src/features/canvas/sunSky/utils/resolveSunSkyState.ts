import type { SunSkyState, TimePhase, SkyCondition, SkyModel, ShadowLength, ShadowSoftness, ColorMood, ContrastLevel, DirectionStrength } from '../types/sunSky.types';
import { clamp, snapToStep, getShadowDirection, getDirectionLabel } from './sunSkyMath';
import { buildSunSkyPrompt } from './sunSkyPrompt';

function deriveTimePhase(elevation: number, userOverride: boolean, currentPhase?: TimePhase): { phase: TimePhase; inferred: boolean } {
  if (userOverride && currentPhase) {
    return { phase: currentPhase, inferred: false };
  }

  const e = clamp(elevation, 0, 90);
  if (e < 5) return { phase: "golden_hour", inferred: true };
  if (e < 18) return { phase: "golden_hour", inferred: true };
  if (e < 30) return { phase: "afternoon", inferred: true };
  if (e < 45) return { phase: "afternoon", inferred: true };
  if (e < 65) return { phase: "morning", inferred: true };
  return { phase: "midday", inferred: true };
}

function deriveColorTemp(phase: TimePhase, elevation: number, condition: SkyCondition): number {
  const baseMap: Record<TimePhase, [number, number]> = {
    early_morning: [3800, 4800],
    morning: [4800, 5400],
    midday: [5600, 6500],
    afternoon: [4500, 5200],
    golden_hour: [3200, 4300],
    blue_hour: [7000, 9000],
  };

  const [min, max] = baseMap[phase] || [4500, 5500];
  let temp = min + (max - min) * 0.5;

  // Elevation fine-tuning
  if (phase === "golden_hour") {
    temp = max - (elevation / 18) * (max - min) * 0.5;
  } else if (phase === "midday") {
    temp = min + ((elevation - 65) / 25) * (max - min);
  }

  // Sky condition adjustment
  if (condition === "overcast" || condition === "foggy") {
    temp = Math.min(temp + 800, 7500);
  } else if (condition === "hazy") {
    temp = Math.min(temp + 300, 6200);
  }

  return Math.round(clamp(temp, 2500, 10000));
}

function deriveIntensity(elevation: number, condition: SkyCondition): number {
  const e = clamp(elevation, 0, 90);
  let intensity: number;
  if (e < 5) intensity = 0.8 + (e / 5) * 0.4;
  else if (e < 18) intensity = 1.2 + ((e - 5) / 13) * 0.7;
  else if (e < 30) intensity = 1.8 + ((e - 18) / 12) * 0.4;
  else if (e < 45) intensity = 2.1 + ((e - 30) / 15) * 0.4;
  else if (e < 65) intensity = 2.4 + ((e - 45) / 20) * 0.4;
  else intensity = 2.5 + ((e - 65) / 25) * 0.5;

  if (condition === "overcast" || condition === "foggy") {
    intensity *= 0.6;
  } else if (condition === "cloudy" || condition === "partly_cloudy") {
    intensity *= 0.85;
  } else if (condition === "hazy") {
    intensity *= 0.9;
  }

  return Math.round(intensity * 10) / 10;
}

function deriveShadowLength(elevation: number): ShadowLength {
  const e = clamp(elevation, 0, 90);
  if (e < 15) return "very_long";
  if (e < 30) return "long";
  if (e < 45) return "medium";
  if (e < 65) return "short";
  return "very_short";
}

function deriveShadowSoftness(size: number): ShadowSoftness {
  const s = clamp(size, 0.5, 10);
  if (s <= 1.2) return "hard";
  if (s <= 2.5) return "standard";
  if (s <= 5.0) return "soft";
  return "very_soft";
}

function deriveDirectionStrength(condition: SkyCondition): DirectionStrength {
  if (condition === "clear" || condition === "hazy") return "strong";
  if (condition === "partly_cloudy" || condition === "cloudy") return "medium";
  return "weak";
}

function deriveSkyModel(condition: SkyCondition, phase: TimePhase): SkyModel {
  if (condition === "overcast") return "cie_overcast";
  if (phase === "golden_hour" || phase === "blue_hour") return "hosek_wilkie_inspired";
  if (condition === "clear") return "preetham_inspired";
  return "art_directed";
}

function deriveSkyColors(phase: TimePhase, condition: SkyCondition, turbidity: number): { top: string; horizon: string; sun: string } {
  const t = clamp(turbidity, 2, 10);
  const turbidityFactor = (t - 2) / 8; // 0 to 1

  // Default clear midday
  let top = "#3a7bd5";
  let horizon = "#8ec5e8";
  let sun = "#fff5e0";

  if (condition === "clear") {
    if (phase === "midday") {
      top = "#2d8ed8";
      horizon = "#a8d8f0";
      sun = "#ffffff";
    } else if (phase === "afternoon" || phase === "morning") {
      top = "#3a8fd8";
      horizon = "#c4e0f0";
      sun = "#fff8e7";
    } else if (phase === "golden_hour") {
      top = "#4a6fa5";
      horizon = "#f5b971";
      sun = "#ffcc66";
    } else if (phase === "blue_hour") {
      top = "#1a2a4a";
      horizon = "#4a5a8a";
      sun = "#aabbdd";
    }
  } else if (condition === "partly_cloudy") {
    top = "#5a7a9a";
    horizon = "#b0c8d8";
    sun = "#fff0d0";
  } else if (condition === "cloudy") {
    top = "#6a7a8a";
    horizon = "#a0b0c0";
    sun = "#e8e8e8";
  } else if (condition === "overcast") {
    top = "#7a8490";
    horizon = "#b0b8c0";
    sun = "#d0d4d8";
  } else if (condition === "foggy") {
    top = "#8a9298";
    horizon = "#c8ccd0";
    sun = "#e0e4e8";
  } else if (condition === "hazy") {
    top = "#6a8a9a";
    horizon = "#c8b898";
    sun = "#f0d8a8";
  }

  // Turbidity adjustment: higher turbidity = more muted/warmer
  if (turbidityFactor > 0.3) {
    top = blendColor(top, "#8a8a7a", turbidityFactor * 0.4);
    horizon = blendColor(horizon, "#c8c4b8", turbidityFactor * 0.3);
  }

  return { top, horizon, sun };
}

function blendColor(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function deriveLightTypeLabel(directionLabel: string, phase: TimePhase, condition: SkyCondition): string {
  const dirShort = directionLabel.replace("光", "");

  if (condition === "overcast" || condition === "foggy") {
    if (condition === "overcast") return "阴天漫射光";
    return "雾天柔光";
  }

  if (phase === "blue_hour") return "蓝调时刻冷光";

  if (phase === "golden_hour") {
    return `${dirShort}黄金侧光`;
  }

  if (phase === "midday") {
    return "正午清晰日光";
  }

  return `标准${phase === "afternoon" ? "下午" : phase === "morning" ? "上午" : "清晨"}侧光`;
}

function deriveColorMood(colorTemp: number): ColorMood {
  if (colorTemp < 4500) return "warm";
  if (colorTemp > 6200) return "cool";
  return "neutral";
}

function deriveContrast(condition: SkyCondition, intensity: number, directionStrength: DirectionStrength): ContrastLevel {
  if (condition === "overcast" || condition === "foggy") return "low";
  if (condition === "cloudy") return "medium";
  if (condition === "partly_cloudy") return "medium";
  if (directionStrength === "strong" && intensity > 2.2) return "high";
  if (directionStrength === "strong") return "medium_high";
  return "medium";
}

function deriveTimeLabel(phase: TimePhase): string {
  const map: Record<TimePhase, string> = {
    early_morning: "清晨",
    morning: "上午",
    midday: "正午",
    afternoon: "下午",
    golden_hour: "黄金时刻",
    blue_hour: "蓝调时刻",
  };
  return map[phase];
}

function deriveSummary(params: {
  directionLabel: string;
  timeLabel: string;
  shadowLength: ShadowLength;
  shadowSoftness: ShadowSoftness;
  skyCondition: SkyCondition;
  lightTypeLabel: string;
}): string {
  const shadowLenMap: Record<string, string> = {
    very_long: "超长阴影",
    long: "长阴影",
    medium: "中等长度阴影",
    short: "短阴影",
    very_short: "极短阴影",
  };

  const shadowSoftMap: Record<string, string> = {
    hard: "硬边缘",
    standard: "标准边缘",
    soft: "柔和边缘",
    very_soft: "非常柔和",
  };

  const skyMap: Record<string, string> = {
    clear: "晴朗天空",
    partly_cloudy: "薄云",
    cloudy: "多云",
    overcast: "阴天",
    foggy: "雾天",
    hazy: "暖霾",
  };

  const parts: string[] = [];
  parts.push(`${params.directionLabel}，${params.timeLabel}`);
  parts.push(`${shadowLenMap[params.shadowLength]}，${shadowSoftMap[params.shadowSoftness]}`);
  parts.push(skyMap[params.skyCondition] || "");

  let sentence = `${params.lightTypeLabel}，${shadowLenMap[params.shadowLength]}，阴影${shadowSoftMap[params.shadowSoftness]}`;

  if (params.skyCondition === "clear") {
    sentence += "，方向感清晰，适合突出建筑体块和空间层次";
  } else if (params.skyCondition === "overcast") {
    sentence += "，漫射光均匀，适合表现材质细节和柔和氛围";
  } else if (params.skyCondition === "foggy") {
    sentence += "，氛围朦胧，适合营造意境和远景层次";
  } else if (params.skyCondition === "hazy") {
    sentence += "，暖色空气感，适合表现城市氛围和远景退晕";
  } else {
    sentence += "，自然建筑光照";
  }

  return sentence;
}

export function resolveSunSkyState(input: {
  enabled?: boolean;
  sun: {
    elevation: number;
    azimuth: number;
    size: number;
  };
  time?: {
    phase?: TimePhase;
    userOverride?: boolean;
  };
  sky: {
    condition: SkyCondition;
    turbidity: number;
    horizonBlur?: number;
    cloudAmount?: number;
  };
  atmosphere?: {
    volumeEffect?: number;
    groundAlbedoMode?: string;
    ozone?: number;
  };
  preview?: {
    realtimeEnabled?: boolean;
    previewResolution?: 256 | 384 | 512;
  };
  source?: {
    presetId?: string;
    editedFromPreset?: boolean;
  };
}): SunSkyState {
  // 1. Clamp and snap
  const elevation = snapToStep(clamp(input.sun.elevation, 0, 90), 3);
  const azimuth = snapToStep(clamp(input.sun.azimuth, 0, 355), 5);
  const size = clamp(input.sun.size, 0.5, 10);

  const turbidity = clamp(input.sky.turbidity, 2, 10);
  const horizonBlur = clamp(input.sky.horizonBlur ?? 0.35, 0, 1);
  const cloudAmount = input.sky.cloudAmount !== undefined ? clamp(input.sky.cloudAmount, 0, 1) : undefined;

  const volumeEffect = clamp(input.atmosphere?.volumeEffect ?? 0.2, 0, 1);
  const groundAlbedoMode = (input.atmosphere?.groundAlbedoMode as SunSkyState["atmosphere"]["groundAlbedoMode"]) || "urban";
  const ozone = input.atmosphere?.ozone !== undefined ? clamp(input.atmosphere.ozone, 0, 1) : undefined;

  const userOverride = input.time?.userOverride ?? false;
  const currentPhase = input.time?.phase;

  // 2. Derive time phase
  const { phase: derivedPhase, inferred: inferredFromSun } = deriveTimePhase(elevation, userOverride, currentPhase);
  const finalPhase = userOverride && currentPhase ? currentPhase : derivedPhase;

  // 3. Derive sun properties
  const colorTemp = deriveColorTemp(finalPhase, elevation, input.sky.condition);
  const intensity = deriveIntensity(elevation, input.sky.condition);

  // 4. Derive shadow
  const shadowLength = deriveShadowLength(elevation);
  const shadowDirection = getShadowDirection(azimuth);
  const shadowSoftness = deriveShadowSoftness(size);

  // 5. Derive direction strength
  const directionStrength = deriveDirectionStrength(input.sky.condition);

  // 6. Derive sky model
  const skyModel = deriveSkyModel(input.sky.condition, finalPhase);

  // 7. Derive colors
  const colors = deriveSkyColors(finalPhase, input.sky.condition, turbidity);

  // 8. Direction label
  const directionLabel = getDirectionLabel(azimuth);

  // 9. Light type label
  const lightTypeLabel = deriveLightTypeLabel(directionLabel, finalPhase, input.sky.condition);

  // 10. Time label
  const timeLabel = deriveTimeLabel(finalPhase);

  // 11. Color mood
  const colorMood = deriveColorMood(colorTemp);

  // 12. Contrast
  const contrast = deriveContrast(input.sky.condition, intensity, directionStrength);

  // 13. Prompt
  const promptText = buildSunSkyPrompt({
    timePhase: finalPhase,
    skyCondition: input.sky.condition,
    directionLabel,
    lightTypeLabel,
    shadowLength,
    shadowSoftness,
    colorMood,
    contrast,
    directionStrength,
    turbidity,
  });

  // 14. Summary
  const summary = deriveSummary({
    directionLabel,
    timeLabel,
    shadowLength,
    shadowSoftness,
    skyCondition: input.sky.condition,
    lightTypeLabel,
  });

  return {
    enabled: input.enabled ?? true,
    sun: {
      elevation,
      azimuth,
      size,
      intensity,
      colorTemp,
    },
    time: {
      phase: finalPhase,
      inferredFromSun,
      userOverride,
    },
    sky: {
      condition: input.sky.condition,
      model: skyModel,
      turbidity,
      horizonBlur,
      cloudAmount,
    },
    atmosphere: {
      volumeEffect,
      groundAlbedoMode,
      ozone,
    },
    derived: {
      timeLabel,
      timePhase: finalPhase,
      directionLabel,
      lightTypeLabel,
      skyTopColor: colors.top,
      skyHorizonColor: colors.horizon,
      sunColor: colors.sun,
      shadowLength,
      shadowDirection,
      shadowSoftness,
      colorMood,
      contrast,
      directionStrength,
      summary,
      promptText,
    },
    preview: {
      realtimeEnabled: input.preview?.realtimeEnabled ?? false,
      previewMode: input.preview?.realtimeEnabled ? "image_relighting" : "sphere_demo",
      previewResolution: input.preview?.previewResolution ?? 384,
    },
    source: {
      presetId: input.source?.presetId,
      editedFromPreset: input.source?.editedFromPreset ?? false,
    },
  };
}
