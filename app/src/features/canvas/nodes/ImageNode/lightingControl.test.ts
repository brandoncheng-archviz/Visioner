import { describe, expect, it } from 'vitest';
import {
  createDefaultImageLightingDraft,
  createImageLightingDraft,
  createImageLightingPreview,
  getCloudAmount,
  getFogLevel,
  selectImageLightingTime,
} from './lightingControl';

describe('ImageNode lighting control', () => {
  it('maps continuous cloud and fog values to stable semantic bands', () => {
    expect([0, 20, 50, 80].map(getCloudAmount)).toEqual(['clear', 'fewClouds', 'cloudy', 'overcast']);
    expect([0, 15, 45, 75].map(getFogLevel)).toEqual(['none', 'light', 'medium', 'heavy']);
  });

  it('does not create persisted lighting data until the draft is applied', () => {
    const draft = createDefaultImageLightingDraft();
    expect(draft).toEqual(expect.objectContaining({ elevation: 33, azimuth: 55, cloudAmount: 0, fogAmount: 0 }));
    expect(createImageLightingDraft(null)).toEqual(draft);
  });

  it('stores exact slider values while reusing the existing sun preview', () => {
    const preview = createImageLightingPreview({
      timePeriod: 'evening',
      elevation: 12,
      azimuth: 55,
      cloudAmount: 37,
      fogAmount: 21,
    });

    expect(preview.sun).toEqual({ elevation: 12, azimuth: 55 });
    expect(preview.settings).toEqual(expect.objectContaining({
      timePeriod: 'evening',
      cloudAmount: 'fewClouds',
      fogLevel: 'light',
      cloudAmountValue: 37,
      fogAmountValue: 21,
    }));
    expect(preview.derived.previewImagePath).toContain('/assets/sun-sky/matrix-preview/');
  });

  it('keeps cloud and fog values out of the rendered direction preview', () => {
    const clearPreview = createImageLightingPreview({
      timePeriod: 'afternoon',
      elevation: 28,
      azimuth: 125,
      cloudAmount: 0,
      fogAmount: 0,
    });
    const atmosphericPreview = createImageLightingPreview({
      timePeriod: 'afternoon',
      elevation: 28,
      azimuth: 125,
      cloudAmount: 100,
      fogAmount: 100,
    });

    expect(atmosphericPreview.derived.previewImagePath).toBe(clearPreview.derived.previewImagePath);
  });

  it('applies a suggested elevation for time changes and leaves later manual edits possible', () => {
    const next = selectImageLightingTime(createDefaultImageLightingDraft(), 'noon');
    expect(next).toEqual(expect.objectContaining({ timePeriod: 'noon', elevation: 75, presetId: undefined }));
    expect({ ...next, elevation: 63 }).toEqual(expect.objectContaining({ timePeriod: 'noon', elevation: 63 }));
  });
});
