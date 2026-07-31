import { describe, expect, it } from 'vitest';
import type {
  ImageReferencePromptBlock,
  ImageRole,
  LocalReferenceType,
  ReferenceInfo,
} from '../types/imageNode.types';
import {
  buildPromptSubmission,
  createImageReferenceBlock,
  getImageReferencePromptText,
} from './promptUtils';

function createReference(
  nodeId: string,
  role: ImageRole | null,
  roleLabel: string,
  localReferenceType?: LocalReferenceType,
): ReferenceInfo {
  return {
    nodeId,
    index: 0,
    role,
    roleLabel,
    localReferenceType,
    imageUrl: `/${nodeId}.png`,
  };
}

function buildFromReferences(references: ReferenceInfo[], blocks?: ImageReferencePromptBlock[]) {
  return buildPromptSubmission(
    '',
    blocks ?? references.map(createImageReferenceBlock),
    [],
    null,
    references,
  );
}

describe('reference prompt classification', () => {
  it('classifies the same stable roles identically under Chinese and English labels', () => {
    const zhReferences = [
      createReference('primary', 'primary_building', '主体建筑'),
      createReference('atmosphere', 'atmosphere_reference', '氛围参考'),
      createReference('local', 'local_reference', '局部参考 · 植物', 'vegetation'),
      createReference('undefined', 'undefined_usage', '未设置参考用途'),
    ];
    const enReferences = [
      createReference('primary', 'primary_building', 'Primary Building'),
      createReference('atmosphere', 'atmosphere_reference', 'Atmosphere Reference'),
      createReference('local', 'local_reference', 'Local Reference · Vegetation', 'vegetation'),
      createReference('undefined', 'undefined_usage', 'No Role Assigned'),
    ];

    expect(buildFromReferences(enReferences).textPrompt)
      .toBe(buildFromReferences(zhReferences).textPrompt);
  });

  it('groups primary-building and atmosphere references by normalized role', () => {
    const references = [
      createReference('primary', 'primary_building', 'unrelated display label'),
      createReference('atmosphere', 'atmosphere_reference', 'unrelated display label'),
    ];
    const prompt = buildFromReferences(references).textPrompt;

    expect(prompt).toContain(`主体建筑默认保护：${getImageReferencePromptText(references[0])}`);
    expect(prompt).toContain(`氛围参考：${getImageReferencePromptText(references[1])}`);
  });

  it.each<LocalReferenceType>([
    'vegetation',
    'people',
    'sky',
    'seawater',
    'city',
    'glass',
    'mist',
    'paving',
    'custom',
    'water',
    'retail',
  ])('groups local reference type %s without reading its display label', (localReferenceType) => {
    const reference = createReference(
      `local-${localReferenceType}`,
      'local_reference',
      'unrelated display label',
      localReferenceType,
    );
    const block = {
      ...createImageReferenceBlock(reference),
      promptText: `manual-${localReferenceType}`,
      promptTextEdited: true,
    };

    expect(buildFromReferences([reference], [block]).textPrompt)
      .toContain(`旧版局部参考：manual-${localReferenceType}`);
  });

  it('groups missing and explicit undefined roles without translated usage text', () => {
    const references = [
      createReference('missing', null, ''),
      createReference('undefined', 'undefined_usage', 'anything'),
    ];
    const prompt = buildFromReferences(references).textPrompt;

    expect(prompt).toContain('未定义参考：');
    expect(prompt).toContain(getImageReferencePromptText(references[0]));
    expect(prompt).toContain(getImageReferencePromptText(references[1]));
    expect(createImageReferenceBlock(references[0]).usage).toBe('undefined_usage');
  });

  it.each([
    ['overall_reference', undefined, '氛围参考：'],
    ['vegetation_reference', undefined, '旧版局部参考：'],
    ['plant_reference', undefined, '旧版局部参考：'],
    ['people_reference', undefined, '旧版局部参考：'],
    ['sky_reference', undefined, '旧版局部参考：'],
    ['custom_reference', undefined, '旧版局部参考：'],
    ['local_reference', 'water', '旧版局部参考：'],
    ['local_reference', 'retail', '旧版局部参考：'],
  ] satisfies Array<[ImageRole, LocalReferenceType | undefined, string]>)(
    'keeps legacy role/type %s compatibility',
    (role, localReferenceType, sectionLabel) => {
      const reference = createReference('legacy', role, 'unrelated display label', localReferenceType);
      expect(buildFromReferences([reference]).textPrompt).toContain(sectionLabel);
    },
  );

  it('preserves user-edited promptText verbatim through grouping and structured output', () => {
    const reference = createReference('edited', 'local_reference', 'Local Reference', 'people');
    const editedPrompt = 'Keep this user-edited instruction exactly.';
    const block: ImageReferencePromptBlock = {
      ...createImageReferenceBlock(reference),
      promptText: editedPrompt,
      promptTextEdited: true,
    };
    const result = buildFromReferences([reference], [block]);

    expect(result.textPrompt).toContain(`旧版局部参考：${editedPrompt}`);
    expect(result.referenceImages[0].promptText).toBe(editedPrompt);
    expect(result.promptBlocks[0]).toEqual(expect.objectContaining({
      promptText: editedPrompt,
      promptTextEdited: true,
    }));
  });
});
