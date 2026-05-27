export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function snapToStep(value: number, step: number): number {
  return Math.round(value / step) * step;
}

export function normalizeAzimuth(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function round(value: number, digits: number): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

export function interpolateColor(from: string, to: string, t: number): string {
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

export function sameStringList(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}
