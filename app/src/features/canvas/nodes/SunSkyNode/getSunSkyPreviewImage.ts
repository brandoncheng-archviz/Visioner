import { clamp, snapToStep } from './sunSkyNode.utils';

const ELEVATION_PREVIEW_PATH = '/assets/sun-sky/elevation-preview/azimuth-55';
const AZIMUTH_STANDARD_PATH = '/assets/sun-sky/azimuth-preview/elevation-30';
const AZIMUTH_LOW_PATH = '/assets/sun-sky/azimuth-preview/elevation-12';

const ELEVATION_LEVELS = [0, 3, 6, 9, 12, 15, 18, 24, 30, 45, 60, 75, 90];
const AZIMUTH_LEVELS = [0, 45, 90, 135, 180, 225, 270, 315];

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

function findNearestLevel(value: number, levels: number[]): number {
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

/**
 * Select the preview image path based on elevation and azimuth.
 *
 * Strategy:
 * - If azimuth is close to 55°, use the elevation-preview series (main visual).
 * - If azimuth deviates significantly from 55°, use the azimuth-preview series
 *   based on elevation range (elevation-12 for <=18°, elevation-30 for >18°).
 */
export function getSunSkyPreviewImage(elevation: number, azimuth: number): string {
  const clampedElevation = clamp(elevation, 0, 90);
  const normalizedAzimuth = snapToStep(clamp(azimuth, 0, 355), 5);

  // If azimuth is close to 55°, prefer the elevation series
  const azimuthDeviation = Math.abs(normalizedAzimuth - 55);
  if (azimuthDeviation <= 22) {
    const nearestElevation = findNearestLevel(clampedElevation, ELEVATION_LEVELS);
    return `${ELEVATION_PREVIEW_PATH}/elevation-${pad2(nearestElevation)}.jpg`;
  }

  // Otherwise use azimuth series based on elevation range
  const nearestAzimuth = findNearestLevel(normalizedAzimuth, AZIMUTH_LEVELS);
  if (clampedElevation <= 18) {
    return `${AZIMUTH_LOW_PATH}/azimuth-${pad3(nearestAzimuth)}.jpg`;
  }
  return `${AZIMUTH_STANDARD_PATH}/azimuth-${pad3(nearestAzimuth)}.jpg`;
}
