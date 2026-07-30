import { describe, expect, it } from 'vitest';
import enUS from '../../../i18n/locales/en-US';
import zhCN from '../../../i18n/locales/zh-CN';
import {
  getImageRoleLabel,
  getLocalReferenceLabel,
  LOCAL_REFERENCE_TYPE_OPTIONS,
  REFERENCE_ROLE_OPTIONS,
  UNIQUE_USAGES,
  validateCustomReferenceLabel,
} from './imageUsages';

function createTranslator(locale: typeof zhCN) {
  return (key: string) => {
    const value = key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, locale);
    return typeof value === 'string' ? value : key;
  };
}

describe('shared reference labels', () => {
  const zh = createTranslator(zhCN);
  const en = createTranslator(enUS as typeof zhCN);

  it('resolves stable role ids in both locales', () => {
    expect(getImageRoleLabel('primary_building', undefined, undefined, undefined, zh)).toBe('主体建筑');
    expect(getImageRoleLabel('primary_building', undefined, undefined, undefined, en)).toBe('Primary Building');
    expect(getImageRoleLabel('atmosphere_reference', undefined, undefined, undefined, zh)).toBe('氛围参考');
    expect(getImageRoleLabel('atmosphere_reference', undefined, undefined, undefined, en)).toBe('Atmosphere Reference');
  });

  it('maps local reference values to runtime translation keys', () => {
    expect(LOCAL_REFERENCE_TYPE_OPTIONS).toEqual([
      { value: 'vegetation', storageValue: 'vegetation', labelKey: 'reference.localTypes.vegetation' },
      { value: 'people', storageValue: 'people', labelKey: 'reference.localTypes.people' },
      { value: 'sky', storageValue: 'sky', labelKey: 'reference.localTypes.sky' },
      { value: 'water', storageValue: 'seawater', labelKey: 'reference.localTypes.water' },
      { value: 'city', storageValue: 'city', labelKey: 'reference.localTypes.city' },
      { value: 'fog', storageValue: 'mist', labelKey: 'reference.localTypes.fog' },
    ]);
    expect(getLocalReferenceLabel('local_reference', 'seawater', undefined, undefined, zh)).toBe('海水');
    expect(getLocalReferenceLabel('local_reference', 'seawater', undefined, undefined, en)).toBe('Water');
  });

  it('keeps canonical ids and uniqueness rules independent from locale', () => {
    expect(REFERENCE_ROLE_OPTIONS.map(({ value }) => value)).toEqual([
      'primaryBuilding',
      'atmosphere',
      'local',
      'unassigned',
    ]);
    expect(UNIQUE_USAGES).toEqual(['primary_building', 'atmosphere_reference']);
    expect(getImageRoleLabel('primary_building', undefined, undefined, undefined, zh)).not.toBe(
      getImageRoleLabel('primary_building', undefined, undefined, undefined, en),
    );
    expect(UNIQUE_USAGES).toEqual(['primary_building', 'atmosphere_reference']);
  });
});

describe('custom reference names', () => {
  it('rejects reserved Chinese and English labels case-insensitively', () => {
    expect(validateCustomReferenceLabel('主体建筑').message).toBe('reference_custom_reserved');
    expect(validateCustomReferenceLabel('PRIMARY BUILDING').message).toBe('reference_custom_reserved');
    expect(validateCustomReferenceLabel('  atmosphere   reference ')).toEqual({
      ok: false,
      message: 'reference_custom_reserved',
    });
  });

  it('keeps custom labels while rejecting case-insensitive duplicates', () => {
    expect(validateCustomReferenceLabel('Facade Detail')).toEqual({ ok: true, label: 'Facade Detail' });
    expect(validateCustomReferenceLabel('facade detail', ['Facade Detail']).message).toBe('reference_custom_duplicate');
  });
});
