import { describe, expect, it } from 'vitest';
import {
  applyDiscreteWheelDelta,
  INITIAL_DISCRETE_WHEEL_STATE,
  normalizeWheelDelta,
} from './discreteWheel';

describe('discrete wheel selection', () => {
  it('accumulates small trackpad deltas before emitting one step', () => {
    const first = applyDiscreteWheelDelta(INITIAL_DISCRETE_WHEEL_STATE, 8, 0, 32, 140);
    const second = applyDiscreteWheelDelta(first.state, 9, 10, 32, 140);
    const third = applyDiscreteWheelDelta(second.state, 15, 20, 32, 140);

    expect(first.step).toBe(0);
    expect(second.step).toBe(0);
    expect(third.step).toBe(1);
    expect(third.state.accumulatedDelta).toBe(0);
  });

  it('emits at most one step while the cooldown is active', () => {
    const first = applyDiscreteWheelDelta(INITIAL_DISCRETE_WHEEL_STATE, -120, 100, 32, 140);
    const momentum = applyDiscreteWheelDelta(first.state, -120, 160, 32, 140);
    const afterCooldown = applyDiscreteWheelDelta(momentum.state, -120, 241, 32, 140);

    expect(first.step).toBe(-1);
    expect(momentum.step).toBe(0);
    expect(afterCooldown.step).toBe(-1);
  });

  it('resets accumulation when the scroll direction changes', () => {
    const downward = applyDiscreteWheelDelta(INITIAL_DISCRETE_WHEEL_STATE, 20, 0, 32, 140);
    const reversed = applyDiscreteWheelDelta(downward.state, -14, 10, 32, 140);

    expect(reversed.step).toBe(0);
    expect(reversed.state.accumulatedDelta).toBe(-14);
    expect(reversed.state.direction).toBe(-1);
  });

  it('normalizes line and page delta modes and uses the dominant axis', () => {
    expect(normalizeWheelDelta(2, 1, 0)).toBe(2);
    expect(normalizeWheelDelta(0, 2, 1)).toBe(32);
    expect(normalizeWheelDelta(0, -1, 2, 900)).toBe(-900);
  });
});
