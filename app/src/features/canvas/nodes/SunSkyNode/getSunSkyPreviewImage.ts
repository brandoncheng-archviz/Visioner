import { clamp, normalizeAzimuthForMath } from './sunSkyNode.utils';

const MATRIX_PREVIEW_PATH = '/assets/sun-sky/matrix-preview';
const preloadedSunSkyPreviewImages = new Set<string>();

export const SUN_SKY_MATRIX_ELEVATIONS = [0, 3, 6, 9, 12, 15, 18, 24, 30, 36, 45, 54, 60, 69, 75, 84, 90];
export const SUN_SKY_MATRIX_AZIMUTHS = [0, 45, 90, 135, 180, 225, 270, 315];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

export function findNearestSunSkyLevel(value: number, levels: number[]): number {
  let nearest = levels[0];
  let minDist = Infinity;
  for (const level of levels) {
    const dist = Math.abs(level - value);
    if (dist < minDist) {
      minDist = dist;
      nearest = level;
    }
  }
  return nearest;
}

function findNearestSunSkyAzimuth(value: number): number {
  let nearest = SUN_SKY_MATRIX_AZIMUTHS[0];
  let minDist = Infinity;
  for (const level of SUN_SKY_MATRIX_AZIMUTHS) {
    const directDist = Math.abs(level - value);
    const circularDist = Math.min(directDist, 360 - directDist);
    if (circularDist < minDist) {
      minDist = circularDist;
      nearest = level;
    }
  }
  return nearest;
}

export function getSunSkyPreviewImage(params: { elevation: number; azimuth: number }): string {
  const clampedElevation = clamp(params.elevation, SUN_SKY_MATRIX_ELEVATIONS[0], SUN_SKY_MATRIX_ELEVATIONS[SUN_SKY_MATRIX_ELEVATIONS.length - 1]);
  const normalizedAzimuth = normalizeAzimuthForMath(params.azimuth);
  const nearestElevation = findNearestSunSkyLevel(clampedElevation, SUN_SKY_MATRIX_ELEVATIONS);
  const nearestAzimuth = findNearestSunSkyAzimuth(normalizedAzimuth);

  return `${MATRIX_PREVIEW_PATH}/elevation-${pad2(nearestElevation)}/azimuth-${pad3(nearestAzimuth)}.webp`;
}

function getLevelNeighborIndexes<T>(items: T[], index: number): number[] {
  return [index - 1, index, index + 1].filter((candidate) => candidate >= 0 && candidate < items.length);
}

export function getNearbySunSkyPreviewImages(params: { elevation: number; azimuth: number }): string[] {
  const clampedElevation = clamp(params.elevation, SUN_SKY_MATRIX_ELEVATIONS[0], SUN_SKY_MATRIX_ELEVATIONS[SUN_SKY_MATRIX_ELEVATIONS.length - 1]);
  const normalizedAzimuth = normalizeAzimuthForMath(params.azimuth);
  const nearestElevation = findNearestSunSkyLevel(clampedElevation, SUN_SKY_MATRIX_ELEVATIONS);
  const nearestAzimuth = findNearestSunSkyAzimuth(normalizedAzimuth);
  const elevationIndex = SUN_SKY_MATRIX_ELEVATIONS.indexOf(nearestElevation);
  const azimuthIndex = SUN_SKY_MATRIX_AZIMUTHS.indexOf(nearestAzimuth);
  const paths = new Set<string>();

  for (const nearbyElevationIndex of getLevelNeighborIndexes(SUN_SKY_MATRIX_ELEVATIONS, elevationIndex)) {
    const elevation = SUN_SKY_MATRIX_ELEVATIONS[nearbyElevationIndex];
    paths.add(`${MATRIX_PREVIEW_PATH}/elevation-${pad2(elevation)}/azimuth-${pad3(nearestAzimuth)}.webp`);
  }

  for (const offset of [-1, 0, 1]) {
    const nearbyAzimuthIndex = (azimuthIndex + offset + SUN_SKY_MATRIX_AZIMUTHS.length) % SUN_SKY_MATRIX_AZIMUTHS.length;
    const azimuth = SUN_SKY_MATRIX_AZIMUTHS[nearbyAzimuthIndex];
    paths.add(`${MATRIX_PREVIEW_PATH}/elevation-${pad2(nearestElevation)}/azimuth-${pad3(azimuth)}.webp`);
  }

  return [...paths];
}

export function preloadNearbySunSkyImages(params: { elevation: number; azimuth: number }): void {
  if (typeof window === 'undefined') return;
  getNearbySunSkyPreviewImages(params).forEach((path) => {
    if (preloadedSunSkyPreviewImages.has(path)) return;
    preloadedSunSkyPreviewImages.add(path);
    const image = new window.Image();
    image.decoding = 'async';
    image.src = path;
  });
}
