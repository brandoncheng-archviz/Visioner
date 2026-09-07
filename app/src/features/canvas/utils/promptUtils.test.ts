import { describe, expect, it } from 'vitest';
import type {
  ImageReferencePromptBlock,
  ImageRole,
  LocalReferenceType,
  ReferenceInfo,
} from '../types/imageNode.types';
import type { ImageControllerState } from '../types/imageController.types';
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

    expect(prompt).toContain('[PRIMARY SUBJECT]');
    expect(prompt).toContain(`Primary subject instruction: ${getImageReferencePromptText(references[0])}`);
    expect(prompt).toContain('[ATMOSPHERE / ENVIRONMENT TRANSFER]');
    expect(prompt).toContain(`Atmosphere transfer instruction: ${getImageReferencePromptText(references[1])}`);
  });

  it('protects primary structure and camera while allowing atmosphere to rebuild original lighting', () => {
    const primary = createReference('primary', 'primary_building', '主体建筑');
    const atmosphere = createReference('atmosphere', 'atmosphere_reference', '氛围参考');
    const result = buildFromReferences([primary, atmosphere]);

    expect(result.referenceImages[0]?.promptText).toContain('不默认保留原图已有阴影、受光方向、曝光和色温');
    expect(result.referenceImages[1]?.promptText).toContain('季节、天气、地面状态、植被状态、天空、光照、色温');
    expect(result.referenceImages[1]?.promptText).toContain('迁移并应用到主体场景');
    expect(result.referenceImages[1]?.promptText).toContain('不得复制该图的建筑内容');
    expect(result.referenceImages[1]?.promptText).toContain('可覆盖主体建筑原图已有光影');
    expect(result.textPrompt).toContain('统一重建建筑、地面、植物和环境的受光、背光与投影关系');
    expect(result.textPrompt).toContain('只有用户明确要求“保留原图光影”时才保留原图光影');
  });

  it('emits mandatory environment-transfer instructions without weakening primary-subject protection', () => {
    const result = buildFromReferences([
      createReference('primary', 'primary_building', '主体建筑'),
      createReference('snow', 'atmosphere_reference', '氛围参考'),
    ]);

    expect(result.textPrompt).toContain('Image 1 is the primary architectural subject and the only primary subject.');
    expect(result.textPrompt).toContain('Do not replace or blend this building with architecture from any other reference image.');
    expect(result.textPrompt).toContain('Image 2 is an atmosphere/environment reference, not a subject reference.');
    expect(result.textPrompt).toContain('Do not copy, replace, or blend in its architecture or building geometry.');
    expect(result.textPrompt).toContain('Transfer and apply only its season, weather, ground condition, vegetation condition, sky, lighting, color temperature');
    expect(result.textPrompt).toContain('[REQUIRED TRANSFORMATION]');
    expect(result.textPrompt).toContain('required, mandatory, and not optional');
    expect(result.textPrompt).toContain('must visibly become a winter snow environment');
    expect(result.textPrompt).toContain('primary architecture, geometry, camera, perspective, and composition must remain unchanged');
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
    ['overall_reference', undefined, '[ATMOSPHERE / ENVIRONMENT TRANSFER]'],
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

  it('preserves the controller state in structured submission output', () => {
    const controller: ImageControllerState = {
      toggles: {
        addEnvironment: true,
        addPeople: false,
        indoorLighting: true,
        motionBlur: false,
      },
      time: 'dusk',
      lightDirection: 'left_side_light',
      weather: 'cloudy',
      season: null,
      style: 'premium_real_estate',
    };

    const result = buildPromptSubmission('', [], [], null, [], null, controller);

    expect(result.controller?.state).toEqual(controller);
  });
});
