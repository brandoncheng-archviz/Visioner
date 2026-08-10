// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { LightPreviewData } from '../../types/lightPreview.types';
import { ImageLightingControlPopover } from './ImageLightingControlPopover';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ImageLightingControlPopover', () => {
  it('writes changes immediately, preserves settings when disabled, and resets to the original image', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const onChange = vi.fn();

    function Harness() {
      const [value, setValue] = useState<LightPreviewData | null>(null);
      return (
        <ImageLightingControlPopover
          anchorElement={anchor}
          value={value}
          onChange={(nextValue) => {
            onChange(nextValue);
            setValue(nextValue);
          }}
          onOpenChange={vi.fn()}
        />
      );
    }

    render(<Harness />);

    expect(screen.getAllByText('跟随原图').length).toBeGreaterThan(0);
    expect(screen.queryByText('应用')).toBeNull();

    fireEvent.click(screen.getByRole('switch', { name: '光影控制' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));

    fireEvent.click(screen.getByRole('button', { name: '黄金时刻' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      enabled: true,
      settings: expect.objectContaining({ lightingPresetId: 'golden-hour' }),
    }));

    const sliders = document.querySelectorAll<HTMLInputElement>('input[type="range"]');
    fireEvent.change(sliders[2] as HTMLInputElement, { target: { value: '65' } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      enabled: true,
      settings: expect.objectContaining({
        cloudAmountValue: 65,
        lightingPresetId: undefined,
      }),
    }));

    fireEvent.click(screen.getByRole('switch', { name: '光影控制' }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({
      enabled: false,
      settings: expect.objectContaining({ cloudAmountValue: 65 }),
    }));

    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
    anchor.remove();
  });
});
