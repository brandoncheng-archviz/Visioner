import { describe, expect, it } from 'vitest';
import { getExteriorRenderDisplayLabel } from './exteriorRenderUtils';

describe('getExteriorRenderDisplayLabel', () => {
  it.each([
    ['室外渲染', '室外渲染'],
    ['室外渲染 01', '室外渲染 01'],
    ['Exterior Render', '室外渲染'],
    ['Exterior Render 02', '室外渲染 02'],
  ])('localizes system label %s', (label, expected) => {
    expect(getExteriorRenderDisplayLabel(label, '室外渲染')).toBe(expected);
  });

  it('keeps a custom label unchanged', () => {
    expect(getExteriorRenderDisplayLabel('商业街夜景方案', '室外渲染')).toBe('商业街夜景方案');
  });
});
