import { describe, expect, it } from 'vitest';
import enUS from '../../../../i18n/locales/en-US';
import zhCN from '../../../../i18n/locales/zh-CN';
import {
  EXTERIOR_RENDER_STYLE_OPTIONS,
  normalizeExteriorRenderAtmosphereStyle,
} from './exteriorRenderAtmosphereOptions';
import { createExteriorRenderNodeData } from './exteriorRenderUtils';

describe('exterior render atmosphere styles', () => {
  it('exposes the five architectural visualization styles in the requested order', () => {
    expect(EXTERIOR_RENDER_STYLE_OPTIONS.map((option) => option.id)).toEqual([
      'photoreal',
      'luxuryRealEstate',
      'competitionVisual',
      'conceptAtmosphere',
      'commercialAd',
    ]);
    expect(EXTERIOR_RENDER_STYLE_OPTIONS.map((option) => option.id)).not.toContain('nordic');
    expect(EXTERIOR_RENDER_STYLE_OPTIONS.map((option) => option.id)).not.toContain('painterly');
  });

  it('keeps the Chinese and English labels aligned with the style values', () => {
    expect(EXTERIOR_RENDER_STYLE_OPTIONS.map((option) => zhCN.atmosphere.style[option.id])).toEqual([
      '照片真实',
      '高端地产',
      '竞赛表现',
      '概念氛围',
      '商业广告',
    ]);
    expect(EXTERIOR_RENDER_STYLE_OPTIONS.map((option) => enUS.atmosphere.style[option.id])).toEqual([
      'Photoreal',
      'Luxury Real Estate',
      'Competition Visual',
      'Concept Atmosphere',
      'Commercial Ad',
    ]);
  });

  it('normalizes supported legacy values without exposing obsolete options', () => {
    expect(normalizeExteriorRenderAtmosphereStyle('photorealistic')).toBe('photoreal');
    expect(normalizeExteriorRenderAtmosphereStyle('luxury')).toBe('luxuryRealEstate');
    expect(normalizeExteriorRenderAtmosphereStyle('dramaticConcept')).toBe('conceptAtmosphere');
    expect(normalizeExteriorRenderAtmosphereStyle('painterly')).toBe('conceptAtmosphere');
    expect(normalizeExteriorRenderAtmosphereStyle('nordic')).toBeNull();
    expect(normalizeExteriorRenderAtmosphereStyle('unknown-style')).toBeNull();
  });

  it('keeps new exterior-render nodes unset by default', () => {
    expect(createExteriorRenderNodeData('室外渲染').atmosphere?.style).toEqual({ source: 'unset' });
  });
});
