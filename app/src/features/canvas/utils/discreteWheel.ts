export type WheelStep = -1 | 0 | 1;

export interface DiscreteWheelState {
  accumulatedDelta: number;
  direction: WheelStep;
  lockedUntil: number;
}

export interface DiscreteWheelResult {
  state: DiscreteWheelState;
  step: WheelStep;
}

export const INITIAL_DISCRETE_WHEEL_STATE: DiscreteWheelState = {
  accumulatedDelta: 0,
  direction: 0,
  lockedUntil: 0,
};

export function normalizeWheelDelta(
  deltaX: number,
  deltaY: number,
  deltaMode: number,
  pageHeight = 800,
): number {
  const dominantDelta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
  if (!Number.isFinite(dominantDelta)) return 0;
  if (deltaMode === 1) return dominantDelta * 16;
  if (deltaMode === 2) return dominantDelta * pageHeight;
  return dominantDelta;
}

export function applyDiscreteWheelDelta(
  state: DiscreteWheelState,
  delta: number,
  now: number,
  threshold: number,
  cooldownMs: number,
): DiscreteWheelResult {
  if (!Number.isFinite(delta) || delta === 0) return { state, step: 0 };
  if (now < state.lockedUntil) return { state, step: 0 };

  const direction: WheelStep = delta > 0 ? 1 : -1;
  const accumulatedDelta = state.direction !== 0 && state.direction !== direction
    ? delta
    : state.accumulatedDelta + delta;

  if (Math.abs(accumulatedDelta) < threshold) {
    return {
      state: { ...state, accumulatedDelta, direction },
      step: 0,
    };
  }

  return {
    state: {
      accumulatedDelta: 0,
      direction: 0,
      lockedUntil: now + cooldownMs,
    },
    step: direction,
  };
}
