import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ModelAspectRatioOptions } from './ModelAspectRatioOptions';

describe('ModelAspectRatioOptions', () => {
  it('renders ratio names only, including portrait presets', () => {
    const html = renderToStaticMarkup(
      <ModelAspectRatioOptions
        selectedValue="4:3"
        adaptiveLabel="Adaptive"
        onSelect={() => undefined}
      />,
    );

    ['Adaptive', '1:1', '4:3', '3:2', '16:9', '9:16', '3:4', '4:5', '2:3'].forEach((label) => {
      expect(html).toContain(label);
    });
    expect(html).not.toContain('×');
    expect(html).not.toContain('1024');
    expect(html).not.toContain('2048');
    expect(html).not.toContain('3840');
  });
});
