export const ASPECT_RATIO_PRESETS = [
  'adaptive',
  '1:1',
  '4:3',
  '3:2',
  '16:9',
  '9:16',
  '3:4',
  '4:5',
  '2:3',
] as const;

export const OUTPUT_RESOLUTION_TIERS = ['1K', '2K', '4K'] as const;

export type AspectRatioPreset = typeof ASPECT_RATIO_PRESETS[number];
export type FixedAspectRatioPreset = Exclude<AspectRatioPreset, 'adaptive'>;
export type OutputResolutionTier = typeof OUTPUT_RESOLUTION_TIERS[number];
export type OutputSize = { width: number; height: number };

export const RESOLUTION_TIER_LONG_EDGE: Record<OutputResolutionTier, number> = {
  '1K': 1024,
  '2K': 2048,
  '4K': 3840,
};

const FIXED_ASPECT_RATIO_PRESETS = new Set<string>(
  ASPECT_RATIO_PRESETS.filter((value) => value !== 'adaptive'),
);

export function isOutputResolutionTier(value: string | undefined): value is OutputResolutionTier {
  return Boolean(value && OUTPUT_RESOLUTION_TIERS.includes(value as OutputResolutionTier));
}

export function getResolutionTier(value: string | undefined): OutputResolutionTier {
  return isOutputResolutionTier(value) ? value : '2K';
}

export function isFixedAspectRatioPreset(value: string | undefined): value is FixedAspectRatioPreset {
  return Boolean(value && FIXED_ASPECT_RATIO_PRESETS.has(value));
}

export function isValidOutputSize(size: unknown): size is OutputSize {
  return Boolean(
    size
    && typeof size === 'object'
    && 'width' in size
    && 'height' in size
    && typeof size.width === 'number'
    && typeof size.height === 'number'
    && Number.isSafeInteger(size.width)
    && Number.isSafeInteger(size.height)
    && size.width > 0
    && size.height > 0,
  );
}

export function parseAspectRatio(value: string | undefined): OutputSize | null {
  if (!value || value === 'adaptive') return null;
  const match = value.trim().replace(/[x×]/gi, ':').match(/^(\d+):(\d+)$/);
  if (!match) return null;
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  return isValidCustomAspectRatio(width, height) ? { width, height } : null;
}

export function isValidCustomAspectRatio(width: number, height: number): boolean {
  return Number.isSafeInteger(width)
    && Number.isSafeInteger(height)
    && width > 0
    && height > 0;
}

export function normalizeOutputSize(size: OutputSize, multiple = 1): OutputSize {
  const safeMultiple = Number.isSafeInteger(multiple) && multiple > 1 ? multiple : 1;
  const normalize = (value: number) => Math.max(
    safeMultiple,
    Math.round(Math.max(1, value) / safeMultiple) * safeMultiple,
  );
  return {
    width: normalize(size.width),
    height: normalize(size.height),
  };
}

export function calculateRequestedSize(
  aspectRatio: string | undefined,
  resolutionTier: string | undefined,
  adaptiveSourceSize?: OutputSize | null,
  multiple = 1,
): OutputSize {
  const longEdge = RESOLUTION_TIER_LONG_EDGE[getResolutionTier(resolutionTier)];
  const ratioDimensions = aspectRatio === 'adaptive'
    ? isValidOutputSize(adaptiveSourceSize)
      ? adaptiveSourceSize
      : { width: 1, height: 1 }
    : parseAspectRatio(aspectRatio) ?? { width: 1, height: 1 };
  const ratio = ratioDimensions.width / ratioDimensions.height;

  if (Math.abs(ratio - 1) < Number.EPSILON) {
    return normalizeOutputSize({ width: longEdge, height: longEdge }, multiple);
  }
  if (ratio > 1) {
    return normalizeOutputSize({
      width: longEdge,
      height: Math.round(longEdge / ratio),
    }, multiple);
  }
  return normalizeOutputSize({
    width: Math.round(longEdge * ratio),
    height: longEdge,
  }, multiple);
}

export function validateRequestedSize(
  size: OutputSize | null | undefined,
  resolutionTier: string | undefined,
): size is OutputSize {
  if (!isValidOutputSize(size)) return false;
  const maxDimension = RESOLUTION_TIER_LONG_EDGE[getResolutionTier(resolutionTier)];
  return size.width <= maxDimension && size.height <= maxDimension;
}

export function clampRequestedSize(
  size: OutputSize,
  resolutionTier: string | undefined,
  preserveRatio: boolean,
  multiple = 1,
): OutputSize {
  const maxDimension = RESOLUTION_TIER_LONG_EDGE[getResolutionTier(resolutionTier)];
  if (preserveRatio) {
    const scale = Math.min(1, maxDimension / size.width, maxDimension / size.height);
    return normalizeOutputSize({
      width: Math.max(1, Math.round(size.width * scale)),
      height: Math.max(1, Math.round(size.height * scale)),
    }, multiple);
  }
  return normalizeOutputSize({
    width: Math.min(maxDimension, Math.max(1, size.width)),
    height: Math.min(maxDimension, Math.max(1, size.height)),
  }, multiple);
}

export function resolveOutputSize(
  actualSize: OutputSize | null | undefined,
  requestedSize: OutputSize | null | undefined,
): OutputSize | null {
  if (isValidOutputSize(actualSize)) return actualSize;
  if (isValidOutputSize(requestedSize)) return requestedSize;
  return null;
}

export function formatOutputDimensions(dimensions: OutputSize): string {
  return `${dimensions.width} × ${dimensions.height}`;
}

export function formatAspectRatioLabel(
  aspectRatio: string | undefined,
  labels: { adaptive: string; custom: string },
): string {
  if (!aspectRatio || aspectRatio === 'adaptive') return labels.adaptive;
  if (isFixedAspectRatioPreset(aspectRatio)) return aspectRatio;
  return parseAspectRatio(aspectRatio) ? labels.custom : aspectRatio;
}

export function formatModelParamsSummary(
  aspectRatio: string | undefined,
  resolutionTier: string,
  labels: { adaptive: string; custom: string },
): string {
  const tier = getResolutionTier(resolutionTier);
  const ratioLabel = formatAspectRatioLabel(aspectRatio, labels);
  return `${ratioLabel} · ${tier}`;
}

export function doesSizeMatchAspectRatio(size: OutputSize, aspectRatio: string | undefined): boolean {
  const ratio = parseAspectRatio(aspectRatio);
  if (!ratio) return false;
  return Math.abs(size.width * ratio.height - size.height * ratio.width) <= Math.max(ratio.width, ratio.height);
}

export type TargetSizeDraft = {
  width: string;
  height: string;
};

export function updateTargetSizeDraft({
  width,
  height,
  field,
  value,
  locked,
  lockedRatio,
}: {
  width: string;
  height: string;
  field: 'width' | 'height';
  value: string;
  locked: boolean;
  lockedRatio: number;
}): TargetSizeDraft | null {
  if (!/^\d*$/.test(value)) return null;

  let nextWidth = field === 'width' ? value : width;
  let nextHeight = field === 'height' ? value : height;
  const numericValue = Number(value);

  if (locked && value && numericValue > 0 && Number.isFinite(lockedRatio) && lockedRatio > 0) {
    if (field === 'width') {
      nextHeight = String(Math.max(1, Math.round(numericValue / lockedRatio)));
    } else {
      nextWidth = String(Math.max(1, Math.round(numericValue * lockedRatio)));
    }
  }

  return { width: nextWidth, height: nextHeight };
}

export function commitTargetSizeDraft(
  draft: TargetSizeDraft,
  resolutionTier: string | undefined,
  preserveRatio: boolean,
  multiple = 1,
): OutputSize | null {
  if (!/^\d+$/.test(draft.width) || !/^\d+$/.test(draft.height)) return null;
  const size = {
    width: Number(draft.width),
    height: Number(draft.height),
  };
  if (!isValidOutputSize(size)) return null;
  return clampRequestedSize(size, resolutionTier, preserveRatio, multiple);
}
