import { describe, expect, it } from 'vitest';
import enUS from '../../../i18n/locales/en-US';
import zhCN from '../../../i18n/locales/zh-CN';
import { IMAGE_MODEL_OPTIONS } from '../constants/imageModelOptions';
import { buildExteriorRenderRequest } from '../nodes/ExteriorRenderNode/exteriorRenderRequest';
import { buildImageGenerationRequest } from './imageGenerationRequest';
import {
  RESOLUTION_TIER_LONG_EDGE,
  calculateRequestedSize,
  clampRequestedSize,
  commitTargetSizeDraft,
  formatModelParamsSummary,
  normalizeOutputSize,
  resolveOutputSize,
  updateTargetSizeDraft,
  validateRequestedSize,
} from './modelParams';

const labels = { adaptive: 'Adaptive', custom: 'Custom' };

describe('shared model parameter sizing', () => {
  it('defines the requested long edge for every resolution tier', () => {
    expect(RESOLUTION_TIER_LONG_EDGE).toEqual({ '1K': 1024, '2K': 2048, '4K': 3840 });
    IMAGE_MODEL_OPTIONS.forEach((model) => {
      expect(model.resolutions).toEqual(['1K', '2K', '4K']);
    });
  });

  it.each([
    ['1:1', '2K', { width: 2048, height: 2048 }],
    ['4:3', '2K', { width: 2048, height: 1536 }],
    ['16:9', '4K', { width: 3840, height: 2160 }],
    ['9:16', '4K', { width: 2160, height: 3840 }],
    ['3:4', '2K', { width: 1536, height: 2048 }],
    ['4:5', '2K', { width: 1638, height: 2048 }],
    ['4:5', '4K', { width: 3072, height: 3840 }],
    ['2:3', '2K', { width: 1365, height: 2048 }],
  ])('calculates %s at %s using the target long edge', (ratio, tier, expected) => {
    expect(calculateRequestedSize(ratio, tier)).toEqual(expected);
  });

  it('uses the source ratio for adaptive sizing and falls back to square', () => {
    expect(calculateRequestedSize('adaptive', '1K', { width: 1600, height: 900 }))
      .toEqual({ width: 1024, height: 576 });
    expect(calculateRequestedSize('adaptive', '1K')).toEqual({ width: 1024, height: 1024 });
  });

  it('normalizes to a configured model multiple in one shared function', () => {
    expect(normalizeOutputSize({ width: 1365, height: 2048 }, 8))
      .toEqual({ width: 1368, height: 2048 });
  });

  it('formats compact summaries without target dimensions', () => {
    expect(formatModelParamsSummary('1:1', '2K', labels))
      .toBe('1:1 · 2K');
    expect(formatModelParamsSummary('1800:1200', '2K', labels))
      .toBe('Custom · 2K');
    expect(formatModelParamsSummary('adaptive', '4K', labels))
      .toBe('Adaptive · 4K');
    expect(formatModelParamsSummary('4:5', '2K', labels))
      .toBe('4:5 · 2K');
  });

  it('validates and clamps independently when the ratio lock is off', () => {
    expect(validateRequestedSize({ width: 2049, height: 1200 }, '2K')).toBe(false);
    expect(clampRequestedSize({ width: 3000, height: 1200 }, '2K', false))
      .toEqual({ width: 2048, height: 1200 });
  });

  it('scales both dimensions together when the ratio lock is on', () => {
    expect(clampRequestedSize({ width: 4096, height: 2048 }, '2K', true))
      .toEqual({ width: 2048, height: 1024 });
  });

  it('prefers an actual 5000+ result without clamping it to the request tier', () => {
    expect(resolveOutputSize(
      { width: 5120, height: 2880 },
      { width: 3840, height: 2160 },
    )).toEqual({ width: 5120, height: 2880 });
  });

  it('gives ImageNode and ExteriorRenderNode the same requested dimensions', () => {
    const imageRequest = buildImageGenerationRequest({
      nodeId: 'image-1',
      prompt: '',
      userPrompt: '',
      inputRefs: [],
      modelParams: {
        model: 'Nano Banana 2',
        ratio: '4:5',
        resolution: '2K',
        lens: 'standard',
        count: '1',
      },
    });
    const exteriorRequest = buildExteriorRenderRequest({
      connectedImages: [],
      modelParams: {
        model: 'Nano Banana 2',
        aspectRatio: '4:5',
        resolution: '2K',
        count: 1,
      },
    });

    expect(imageRequest.modelParams.requestedSize).toEqual({ width: 1638, height: 2048 });
    expect(imageRequest.modelParams.model).toBe('nano-banana-2');
    expect(exteriorRequest.modelParams.requestedSize).toEqual(imageRequest.modelParams.requestedSize);
    expect(imageRequest.modelParams.aspectRatio).toBe('4:5');
    expect(exteriorRequest.modelParams.aspectRatio).toBe('4:5');
  });

  it('uses matching locale structures and no obsolete aspect-ratio hint', () => {
    expect(zhCN.modelParams).toHaveProperty('targetSize.label', '目标尺寸');
    expect(enUS.modelParams).toHaveProperty('targetSize.label', 'Target size');
    expect(zhCN.modelParams.aspectRatio).not.toHaveProperty('hint');
    expect(enUS.modelParams.aspectRatio).not.toHaveProperty('hint');
    expect(zhCN.modelParams.aspectRatio).not.toHaveProperty('custom');
    expect(enUS.modelParams.aspectRatio).not.toHaveProperty('custom');
  });
});

describe('target-size drafts', () => {
  it('allows a temporary empty input without committing it', () => {
    expect(updateTargetSizeDraft({
      width: '1024',
      height: '768',
      field: 'width',
      value: '',
      locked: false,
      lockedRatio: 4 / 3,
    })).toEqual({ width: '', height: '768' });
    expect(commitTargetSizeDraft({ width: '', height: '768' }, '1K', false)).toBeNull();
  });

  it('links the other dimension while locked', () => {
    expect(updateTargetSizeDraft({
      width: '1024',
      height: '768',
      field: 'width',
      value: '2048',
      locked: true,
      lockedRatio: 4 / 3,
    })).toEqual({ width: '2048', height: '1536' });
  });

  it('keeps dimensions independent while unlocked and clamps on commit', () => {
    expect(updateTargetSizeDraft({
      width: '1024',
      height: '768',
      field: 'width',
      value: '3000',
      locked: false,
      lockedRatio: 4 / 3,
    })).toEqual({ width: '3000', height: '768' });
    expect(commitTargetSizeDraft({ width: '3000', height: '768' }, '2K', false))
      .toEqual({ width: 2048, height: 768 });
  });

  it.each(['-1', '1.5', 'NaN', 'abc'])('rejects invalid characters in %s', (value) => {
    expect(updateTargetSizeDraft({
      width: '1',
      height: '1',
      field: 'width',
      value,
      locked: false,
      lockedRatio: 1,
    })).toBeNull();
  });
});
