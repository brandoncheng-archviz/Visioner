import { describe, expect, it, vi } from 'vitest';
import { bindDiscreteWheelSelection } from './useDiscreteWheelSelection';

class SelectorWheelEvent extends Event {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaMode: number;

  constructor(deltaY: number, deltaMode = 0, deltaX = 0) {
    super('wheel', { bubbles: true, cancelable: true });
    this.deltaX = deltaX;
    this.deltaY = deltaY;
    this.deltaMode = deltaMode;
  }
}

function createSelectorElement() {
  return new EventTarget() as HTMLElement;
}

describe('native camera wheel selector binding', () => {
  it('dispatches a mouse WheelEvent to the selector and changes one value', () => {
    const selector = createSelectorElement();
    const values = ['previous', 'current', 'next'];
    let selectedIndex = 1;
    const cleanup = bindDiscreteWheelSelection(selector, {
      isDisabled: () => false,
      onStep: (step) => {
        selectedIndex += step;
      },
    });

    const event = new SelectorWheelEvent(120) as unknown as WheelEvent;
    selector.dispatchEvent(event);

    expect(values[selectedIndex]).toBe('next');
    expect(event.defaultPrevented).toBe(true);
    cleanup();
  });

  it('accumulates trackpad WheelEvents and changes exactly one value', () => {
    const selector = createSelectorElement();
    const onStep = vi.fn();
    const cleanup = bindDiscreteWheelSelection(selector, {
      isDisabled: () => false,
      onStep,
    });

    selector.dispatchEvent(new SelectorWheelEvent(8));
    selector.dispatchEvent(new SelectorWheelEvent(8));
    selector.dispatchEvent(new SelectorWheelEvent(8));
    selector.dispatchEvent(new SelectorWheelEvent(8));

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(1);
    cleanup();
  });

  it('consumes the event but does not change a value while camera control is disabled', () => {
    const selector = createSelectorElement();
    const onStep = vi.fn();
    const cleanup = bindDiscreteWheelSelection(selector, {
      isDisabled: () => true,
      onStep,
    });

    const event = new SelectorWheelEvent(-120) as unknown as WheelEvent;
    selector.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onStep).not.toHaveBeenCalled();
    cleanup();
  });
});
