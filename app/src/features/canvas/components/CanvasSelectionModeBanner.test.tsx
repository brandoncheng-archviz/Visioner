// @vitest-environment jsdom

import { cleanup, fireEvent, render } from '@testing-library/react';
import { ImagePlus } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { CanvasSelectionModeBanner } from './CanvasSelectionModeBanner';

afterEach(cleanup);

describe('CanvasSelectionModeBanner', () => {
  it('uses the shared prominent UI and exposes back and close actions without Esc copy', () => {
    const onBackToNode = vi.fn();
    const onClose = vi.fn();
    render(
      <CanvasSelectionModeBanner
        icon={ImagePlus}
        title="从画布选择参考"
        description="点击图片节点作为图像输入"
        onBackToNode={onBackToNode}
        onClose={onClose}
      />,
    );

    const banner = document.querySelector<HTMLElement>('[data-canvas-selection-banner="true"]');
    expect(banner?.textContent).toContain('从画布选择参考');
    expect(banner?.textContent).toContain('点击图片节点作为图像输入');
    expect(banner?.textContent).not.toContain('Esc');

    const buttons = banner?.querySelectorAll('button');
    fireEvent.click(buttons?.[0] as HTMLButtonElement);
    fireEvent.click(buttons?.[1] as HTMLButtonElement);
    expect(onBackToNode).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
