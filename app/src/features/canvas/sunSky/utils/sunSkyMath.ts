export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function normalizeAzimuth(azimuth: number): number {
  let a = azimuth % 360;
  if (a < 0) a += 360;
  return a;
}

export function getShadowDirection(azimuth: number): number {
  return (azimuth + 180) % 360;
}

export function getDirectionLabel(azimuth: number): string {
  const normalized = normalizeAzimuth(azimuth);
  // 8 sectors of 45° each, centered on 0°, 45°, 90°, etc.
  const sector = Math.round(normalized / 45) % 8;
  const labels: Record<number, string> = {
    0: "正前方光",
    1: "右前方光",
    2: "右侧光",
    3: "右后方光",
    4: "正后方逆光",
    5: "左后方光",
    6: "左侧光",
    7: "左前方光",
  };
  return labels[sector] || "未知方向";
}

export function getDirectionLabelShort(azimuth: number): string {
  const normalized = normalizeAzimuth(azimuth);
  const sector = Math.round(normalized / 45) % 8;
  const labels: Record<number, string> = {
    0: "前",
    1: "右前",
    2: "右",
    3: "右后",
    4: "后",
    5: "左后",
    6: "左",
    7: "左前",
  };
  return labels[sector] || "?";
}

export function sunAnglesToVector(elevation: number, azimuth: number): { x: number; y: number; z: number } {
  const elevRad = (elevation * Math.PI) / 180;
  const azimRad = (azimuth * Math.PI) / 180;

  const x = Math.cos(elevRad) * Math.sin(azimRad);
  const y = Math.sin(elevRad);
  const z = Math.cos(elevRad) * Math.cos(azimRad);

  return { x, y, z };
}

export function getElevationLabel(elevation: number): string {
  if (elevation < 5) return "地平线附近";
  if (elevation < 18) return "低角度";
  if (elevation < 35) return "中低角度";
  if (elevation < 55) return "中角度";
  if (elevation < 75) return "高角度";
  return "天顶附近";
}

export function shadowLengthToPixels(shadowLength: string, baseSize: number = 60): number {
  const map: Record<string, number> = {
    very_long: baseSize * 2.5,
    long: baseSize * 1.8,
    medium: baseSize * 1.2,
    short: baseSize * 0.7,
    very_short: baseSize * 0.3,
  };
  return map[shadowLength] || baseSize;
}

export function shadowSoftnessToBlur(softness: string, baseBlur: number = 4): number {
  const map: Record<string, number> = {
    hard: baseBlur * 0.5,
    standard: baseBlur * 1.0,
    soft: baseBlur * 2.5,
    very_soft: baseBlur * 5.0,
  };
  return map[softness] || baseBlur;
}
