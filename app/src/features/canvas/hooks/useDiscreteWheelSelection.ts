import { useEffect, useLayoutEffect, useRef } from 'react';
import {
  applyDiscreteWheelDelta,
  INITIAL_DISCRETE_WHEEL_STATE,
  normalizeWheelDelta,
  type DiscreteWheelState,
  type WheelStep,
} from '../utils/discreteWheel';

interface DiscreteWheelBindingOptions {
  isDisabled: () => boolean;
  threshold?: number;
  cooldownMs?: number;
  idleResetMs?: number;
  onStep: (step: Exclude<WheelStep, 0>) => void;
}

interface UseDiscreteWheelSelectionOptions {
  element: HTMLElement | null;
  disabled?: boolean;
  threshold?: number;
  cooldownMs?: number;
  idleResetMs?: number;
  onStep: (step: Exclude<WheelStep, 0>) => void;
}

/**
 * Binds directly to one selector element. A wheel event can only target this
 * listener while the pointer is over this element, so no React hover state is
 * needed as an activation prerequisite.
 */
export function bindDiscreteWheelSelection(
  element: HTMLElement,
  {
    isDisabled,
    threshold = 32,
    cooldownMs = 140,
    idleResetMs = 180,
    onStep,
  }: DiscreteWheelBindingOptions,
): () => void {
  let wheelState: DiscreteWheelState = { ...INITIAL_DISCRETE_WHEEL_STATE };
  let idleTimer: ReturnType<typeof setTimeout> | null = null;

  const resetInput = () => {
    wheelState = { ...INITIAL_DISCRETE_WHEEL_STATE };
    if (idleTimer !== null) {
      globalThis.clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const disabled = isDisabled();
    if (disabled) return;

    const delta = normalizeWheelDelta(
      event.deltaX,
      event.deltaY,
      event.deltaMode,
      typeof window === 'undefined' ? 800 : window.innerHeight,
    );
    const result = applyDiscreteWheelDelta(
      wheelState,
      delta,
      performance.now(),
      threshold,
      cooldownMs,
    );
    wheelState = result.state;

    if (idleTimer !== null) globalThis.clearTimeout(idleTimer);
    idleTimer = globalThis.setTimeout(resetInput, idleResetMs);

    if (result.step !== 0) onStep(result.step);
  };

  element.addEventListener('wheel', handleWheel, { passive: false });
  return () => {
    element.removeEventListener('wheel', handleWheel);
    resetInput();
  };
}

export function useDiscreteWheelSelection({
  element,
  disabled = false,
  threshold,
  cooldownMs,
  idleResetMs,
  onStep,
}: UseDiscreteWheelSelectionOptions): void {
  const disabledRef = useRef(disabled);
  const onStepRef = useRef(onStep);

  useLayoutEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useLayoutEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  useEffect(() => {
    if (!element) return;
    return bindDiscreteWheelSelection(element, {
      isDisabled: () => disabledRef.current,
      threshold,
      cooldownMs,
      idleResetMs,
      onStep: (step) => onStepRef.current(step),
    });
  }, [cooldownMs, element, idleResetMs, threshold]);
}
