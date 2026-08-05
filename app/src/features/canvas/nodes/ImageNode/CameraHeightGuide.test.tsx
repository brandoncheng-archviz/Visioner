// @vitest-environment jsdom

import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '@/i18n';
import { CameraHeightGuide } from './CameraHeightGuide';

afterEach(cleanup);

describe('CameraHeightGuide', () => {
  it('opens the complete six-level guide on hover', async () => {
    render(<CameraHeightGuide />);
    fireEvent.pointerEnter(document.querySelector('[data-camera-guide-trigger="height"]') as HTMLElement);

    await waitFor(() => {
      expect(document.body.textContent).toContain('机位高度对照');
      expect(document.body.textContent).toContain('近地');
      expect(document.body.textContent).toContain('0.5m');
      expect(document.body.textContent).toContain('航拍');
      expect(document.body.textContent).toContain('100m');
      expect(document.body.textContent).toContain('大尺度航拍，呈现城市与环境关系');
    });
  });
});
