// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react';
import { ImagePlus } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { registerImageMarkCaptureEntry } from '../utils/imageMarkCaptureRegistry';
import { CanvasImageMarkCaptureLayer } from './CanvasImageMarkCaptureLayer';
import { CanvasSelectionModeBanner } from './CanvasSelectionModeBanner';

afterEach(cleanup);

describe('CanvasImageMarkCaptureLayer', () => {
  it('keeps registered images clickable while the shared selection banner is visible', async () => {
    const image = document.createElement('img');
    document.body.append(image);
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 120,
      left: 100,
      top: 120,
      right: 340,
      bottom: 280,
      width: 240,
      height: 160,
      toJSON: () => ({}),
    });
    const startIdentify = vi.fn();
    const unregister = registerImageMarkCaptureEntry({
      nodeId: 'source-image',
      imageUrl: '/source.png',
      element: image,
      canMark: () => true,
      startIdentify,
    });

    render(
      <>
        <CanvasImageMarkCaptureLayer targetNodeId="target-image" />
        <CanvasSelectionModeBanner
          icon={ImagePlus}
          title="元素选择模式"
          onBackToNode={vi.fn()}
          onClose={vi.fn()}
        />
      </>,
    );

    const captureTarget = await waitFor(() => {
      const element = document.querySelector<HTMLElement>('.cursor-crosshair');
      expect(element).not.toBeNull();
      return element as HTMLElement;
    });
    captureTarget.dispatchEvent(new MouseEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: 160,
      clientY: 180,
    }));

    expect(startIdentify).toHaveBeenCalledTimes(1);
    expect(startIdentify.mock.calls[0]?.[1]).toBe('target-image');

    unregister();
    image.remove();
  });
});
