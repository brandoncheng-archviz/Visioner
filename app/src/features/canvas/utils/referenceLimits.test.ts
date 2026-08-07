import { describe, expect, it } from 'vitest';
import enUS from '../../../i18n/locales/en-US';
import zhCN from '../../../i18n/locales/zh-CN';
import {
  REFERENCE_LIMIT_MESSAGES,
  formatReferenceLimitIssue,
} from './referenceLimits';

function createTranslator(locale: typeof zhCN) {
  return (key: string, values: Readonly<Record<string, number>>) => {
    const value = key.split('.').reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, locale);
    if (typeof value !== 'string') return key;
    return Object.entries(values).reduce(
      (text, [name, replacement]) => text.replaceAll(`{{${name}}}`, String(replacement)),
      value,
    );
  };
}

describe('reference limit i18n', () => {
  it('stores stable translation keys instead of UI copy', () => {
    expect(REFERENCE_LIMIT_MESSAGES.maxReferences).toEqual({
      titleKey: 'reference.validation.limitReachedTitle',
      messageKey: 'reference.validation.limitReachedMessage',
      values: { max: 6 },
    });
    expect(JSON.stringify(REFERENCE_LIMIT_MESSAGES)).not.toMatch(/[\u4e00-\u9fff]/);
  });

  it('formats the same issue through the active locale', () => {
    const issue = REFERENCE_LIMIT_MESSAGES.maxReferencesForGenerate;
    const zhMessage = formatReferenceLimitIssue(issue, createTranslator(zhCN));
    const enMessage = formatReferenceLimitIssue(issue, createTranslator(enUS as typeof zhCN));

    expect(zhMessage).toBe('参考图数量超过上限\n当前节点最多支持 6 张引用图，请删除部分引用后再生成。');
    expect(enMessage).toBe('Too many reference images\nThis node supports up to 6 reference images. Remove some references before generating.');
  });
});
