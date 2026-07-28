import { describe, expect, it } from 'vitest';
import { getQuickRenderDisplayLabel } from './quickRenderExteriorUtils';

describe('getQuickRenderDisplayLabel', () => {
  it.each([
    ['快速渲染-室外 01', '室外渲染 01'],
    ['快速渲染·室外', '室外渲染'],
    ['Quick Render - Exterior 03', '室外渲染 03'],
    ['Exterior Render 02', '室外渲染 02'],
  ])('migrates system label %s', (label, expected) => {
    expect(getQuickRenderDisplayLabel(label, '室外渲染')).toBe(expected);
  });

  it('keeps a custom label unchanged', () => {
    expect(getQuickRenderDisplayLabel('商业街夜景方案', '室外渲染')).toBe('商业街夜景方案');
  });
});
