// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@/i18n';
import { CameraApertureGuide, CameraFocalLengthGuide } from './CameraOpticsGuide';

afterEach(cleanup);

describe('CameraOpticsGuide', () => {
  it('opens the complete focal-length guide with the default recommendation', async () => {
    render(<CameraFocalLengthGuide />);
    fireEvent.click(document.querySelector('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(document.body.textContent).toContain('焦距预设说明');
      expect(document.body.textContent).toContain('16mm');
      expect(document.body.textContent).toContain('超广角');
      expect(document.body.textContent).toContain('35mm');
      expect(document.body.textContent).toContain('黄金焦距');
      expect(document.body.textContent).toContain('85mm');
      expect(document.body.textContent).toContain('中长焦');
      expect(document.body.textContent).toContain('推荐 · 默认');
    });
  });

  it('opens the complete aperture guide and explains its semantic-only behavior', async () => {
    render(<CameraApertureGuide />);
    fireEvent.click(document.querySelector('button') as HTMLButtonElement);

    await waitFor(() => {
      expect(document.body.textContent).toContain('光圈预设说明');
      expect(document.body.textContent).toContain('f/2.8');
      expect(document.body.textContent).toContain('特写');
      expect(document.body.textContent).toContain('f/8');
      expect(document.body.textContent).toContain('全景清晰');
      expect(document.body.textContent).toContain('f/16');
      expect(document.body.textContent).toContain('光圈仅作为景深语义约束，不参与真实曝光计算。');
      expect(document.body.textContent).toContain('推荐 · 默认');
    });
  });
});
