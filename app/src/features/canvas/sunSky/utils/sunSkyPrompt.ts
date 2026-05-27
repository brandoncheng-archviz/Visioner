import type { SkyCondition, TimePhase, ShadowLength, ShadowSoftness, ColorMood, DirectionStrength } from '../types/sunSky.types';

export function buildSunSkyPrompt(params: {
  timePhase: TimePhase;
  skyCondition: SkyCondition;
  directionLabel: string;
  lightTypeLabel: string;
  shadowLength: ShadowLength;
  shadowSoftness: ShadowSoftness;
  colorMood: ColorMood;
  contrast: string;
  directionStrength: DirectionStrength;
  turbidity: number;
  summary?: string;
}): string {
  const parts: string[] = [];

  // Time & lighting base
  const timeDescriptions: Record<TimePhase, string> = {
    early_morning: "early morning soft light",
    morning: "morning daylight",
    midday: "bright midday sun",
    afternoon: "afternoon sunlight",
    golden_hour: "golden hour warm light",
    blue_hour: "blue hour cool ambient light",
  };

  parts.push(timeDescriptions[params.timePhase] || "daylight");

  // Direction
  const dirMap: Record<string, string> = {
    "正前方光": "front lighting",
    "右前方光": "warm side light from the right-front",
    "右侧光": "side light from the right",
    "右后方光": "backlight from the right-rear",
    "正后方逆光": "strong backlight",
    "左后方光": "backlight from the left-rear",
    "左侧光": "side light from the left",
    "左前方光": "warm side light from the left-front",
  };
  const dirText = dirMap[params.directionLabel] || "natural lighting";

  if (params.directionStrength === "weak") {
    parts.push("diffused overcast lighting, soft ambient fill");
  } else if (params.directionStrength === "medium") {
    parts.push(`partially diffused ${dirText}`);
  } else {
    parts.push(dirText);
  }

  // Shadow
  const shadowLenMap: Record<ShadowLength, string> = {
    very_long: "very long dramatic shadows",
    long: "long soft shadows",
    medium: "medium length shadows",
    short: "short defined shadows",
    very_short: "minimal short shadows",
  };

  const shadowSoftMap: Record<ShadowSoftness, string> = {
    hard: "hard shadow edges",
    standard: "natural shadow edges",
    soft: "soft shadow edges",
    very_soft: "very soft diffused shadows",
  };

  parts.push(`${shadowLenMap[params.shadowLength]}, ${shadowSoftMap[params.shadowSoftness]}`);

  // Sky
  const skyMap: Record<SkyCondition, string> = {
    clear: "clear blue sky",
    partly_cloudy: "partly cloudy sky with scattered clouds",
    cloudy: "cloudy sky with soft diffused light",
    overcast: "overcast grey sky, flat diffused lighting",
    foggy: "foggy atmosphere with reduced visibility",
    hazy: "hazy warm atmosphere with soft horizon glow",
  };
  parts.push(skyMap[params.skyCondition] || "natural sky");

  // Color mood
  if (params.colorMood === "warm") {
    parts.push("warm color temperature");
  } else if (params.colorMood === "cool") {
    parts.push("cool blue-tinted atmosphere");
  }

  // Atmosphere / turbidity
  if (params.turbidity > 6) {
    parts.push("heavy atmospheric haze, muted distant elements");
  } else if (params.turbidity > 4) {
    parts.push("noticeable aerial perspective");
  } else if (params.turbidity < 2.5) {
    parts.push("crisp clear atmosphere");
  }

  // Contrast
  if (params.contrast === "high") {
    parts.push("high contrast lighting");
  } else if (params.contrast === "low") {
    parts.push("low contrast soft lighting");
  }

  // Architectural purpose
  parts.push("realistic architectural visualization lighting, enhance facade depth and spatial hierarchy");

  return parts.join(", ");
}
