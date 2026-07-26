import { describe, expect, it } from 'vitest';
import enUS from './en-US';
import zhCN from './zh-CN';

function collectLeafKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) => (
    collectLeafKeys(child, prefix ? `${prefix}.${key}` : key)
  ));
}

describe('locale key parity', () => {
  it('keeps zh-CN and en-US leaf keys identical', () => {
    expect(collectLeafKeys(zhCN).sort()).toEqual(collectLeafKeys(enUS).sort());
  });
});
