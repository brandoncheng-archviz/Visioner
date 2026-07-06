import { describe, expect, it } from 'vitest';
import type { ModelParams } from '../types/canvas.types';
import type { GenerationInput } from '../types/generation.types';
import { buildImageGenerationRequest } from './imageGenerationRequest';

const baseModelParams: ModelParams = {
  model: 'Nano Banana 2',
  ratio: '16:9',
  resolution: '2K',
  lens: '标准',
  count: '1张',
};

function createReference(
  role: string,
  promptText: string,
  sourceNodeId = `source-${role}`,
): GenerationInput['inputRefs'][number] {
  return {
    imageId: sourceNodeId,
    imageUrl: `https://example.com/${sourceNodeId}.jpg`,
    usageKey: role,
    usageLabel: role,
    promptText,
  };
}

describe('buildImageGenerationRequest', () => {
  it('builds a request containing only a handwritten prompt', () => {
    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '一座位于山谷中的现代住宅',
      userPrompt: '一座位于山谷中的现代住宅',
      inputRefs: [],
      modelParams: baseModelParams,
    });

    expect(request).toEqual({
      nodeId: 'image-node-1',
      prompt: '一座位于山谷中的现代住宅',
      userPrompt: '一座位于山谷中的现代住宅',
      inputRefs: [],
      markRefs: undefined,
      modelParams: {
        model: 'Nano Banana 2',
        aspectRatio: '16:9',
        resolution: '2K',
        count: 1,
      },
      controller: undefined,
      style: undefined,
      presets: undefined,
    });
  });

  it.each([
    ['primary_building', '保持主体建筑结构、体块比例和构图稳定。'],
    ['atmosphere_reference', '参考傍晚天气、暖色调和整体光影氛围。'],
    ['undefined_usage', '参考该图片中的关键视觉信息。'],
  ])('maps a %s reference to the API request', (role, promptText) => {
    const reference = createReference(role, promptText);

    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '生成建筑效果图',
      userPrompt: '生成建筑效果图',
      inputRefs: [reference],
      modelParams: baseModelParams,
    });

    expect(request.inputRefs).toEqual([{
      sourceNodeId: reference.imageId,
      imageUrl: reference.imageUrl,
      role,
      promptText,
    }]);
  });

  it('uses the final edited reference prompt instead of an old default description', () => {
    const oldDefaultPrompt = '保持建筑结构、体块比例、立面关系、相机角度和构图比例不变。';
    const finalEditedPrompt = '保留建筑主入口，但将二层立面改为连续玻璃幕墙。';
    const reference = createReference('primary_building', finalEditedPrompt);

    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '调整建筑立面',
      userPrompt: '调整建筑立面',
      inputRefs: [reference],
      modelParams: baseModelParams,
    });

    expect(request.inputRefs[0]?.promptText).toBe(finalEditedPrompt);
    expect(request.inputRefs[0]?.promptText).not.toBe(oldDefaultPrompt);
  });

  it('maps mark references including their final prompt and region', () => {
    const markRefs: NonNullable<GenerationInput['markRefs']> = [{
      markId: 'mark-1',
      sourceNodeId: 'source-image-1',
      usageKey: 'landscape_reference',
      usageLabel: '景观参考',
      markType: 'box',
      markPoint: { normalizedX: 0.4, normalizedY: 0.6 },
      markBox: {
        normalizedX: 0.3,
        normalizedY: 0.5,
        normalizedWidth: 0.2,
        normalizedHeight: 0.25,
      },
      candidates: [{
        id: 'candidate-1',
        label: '棕榈树叶子',
        type: 'plant',
        level: 'part',
        promptText: '只在标记区域增加更茂密的棕榈树叶子。',
      }],
      selectedCandidateId: 'candidate-1',
      markLabel: '棕榈树叶子',
      promptText: '只在标记区域增加更茂密的棕榈树叶子。',
    }];

    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '优化景观',
      userPrompt: '优化景观',
      inputRefs: [],
      markRefs,
      modelParams: baseModelParams,
    });

    expect(request.markRefs).toEqual([{
      sourceNodeId: 'source-image-1',
      label: '棕榈树叶子',
      region: {
        point: { normalizedX: 0.4, normalizedY: 0.6 },
        box: {
          normalizedX: 0.3,
          normalizedY: 0.5,
          normalizedWidth: 0.2,
          normalizedHeight: 0.25,
        },
      },
      promptText: '只在标记区域增加更茂密的棕榈树叶子。',
    }]);
  });

  it.each([
    ['1张', 1],
    ['2张', 2],
    ['4张', 4],
  ] as const)('normalizes count %s to %i', (count, expectedCount) => {
    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '生成图片',
      userPrompt: '生成图片',
      inputRefs: [],
      modelParams: { ...baseModelParams, count },
    });

    expect(request.modelParams).toEqual({
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      resolution: '2K',
      count: expectedCount,
    });
  });

  it('includes controller, style and presets without changing their values', () => {
    const controller = {
      toggles: { addPeople: true },
      time: 'sunset',
      weather: 'snowy',
    };
    const style = {
      styleKey: 'conceptual_drama',
      stylePrompt: 'dramatic architectural visualization',
    };
    const presets = ['clean_up', 'view_to_render'];

    const request = buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: '生成概念建筑图',
      userPrompt: '生成概念建筑图',
      inputRefs: [],
      modelParams: baseModelParams,
      controller,
      style,
      presets,
    });

    expect(request.controller).toEqual(controller);
    expect(request.style).toEqual(style);
    expect(request.presets).toEqual(presets);
  });

  it('does not mutate caller-owned node data, references or prompt blocks', () => {
    const nodeData = {
      prompt: '生成住宅效果图',
      modelParams: { ...baseModelParams },
      references: [{
        nodeId: 'source-building',
        role: 'primary_building',
        imageUrl: 'https://example.com/building.jpg',
      }],
      promptBlocks: [{
        type: 'image_reference',
        sourceNodeId: 'source-building',
        promptText: '使用用户最终编辑后的主体建筑说明。',
        promptTextEdited: true,
      }],
    };
    const inputRefs = [createReference(
      nodeData.references[0].role,
      nodeData.promptBlocks[0].promptText,
      nodeData.references[0].nodeId,
    )];
    const snapshot = structuredClone({ nodeData, inputRefs });

    buildImageGenerationRequest({
      nodeId: 'image-node-1',
      prompt: nodeData.prompt,
      userPrompt: nodeData.prompt,
      inputRefs,
      modelParams: nodeData.modelParams,
      controller: { time: 'sunset' },
      style: { styleKey: 'nordic_atmosphere' },
      presets: ['clean_up'],
    });

    expect({ nodeData, inputRefs }).toEqual(snapshot);
  });
});
