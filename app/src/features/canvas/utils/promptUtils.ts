import type { ImageReferencePromptBlock, PromptContent, ReferenceInfo, StylePreset } from '../types/imageNode.types';
import { getPresetById } from '../constants/presets';
import type { PresetItem } from '../types/imageNode.types';

export function getImageReferencePromptText(reference: ReferenceInfo) {
  if (reference.role === 'primary_building' || reference.roleLabel.includes('主体建筑')) {
    return '保持建筑结构、体块比例、立面关系、相机角度和构图比例不变。权重：最高。';
  }
  if (reference.role === 'atmosphere_reference' || reference.role === 'overall_reference' || reference.roleLabel.includes('氛围')) {
    return '参考整体时间段、天气状态、色调、光影氛围和画面情绪。权重：最高。';
  }
  if (reference.role === 'vegetation_reference' || reference.role === 'plant_reference' || reference.roleLabel.includes('植物')) {
    return '参考植物种类、种植密度、层次关系、季节状态和景观氛围。权重：中。';
  }
  if (reference.role === 'people_reference' || reference.roleLabel.includes('人物')) {
    return '参考人物类型、姿态、尺度关系、活动状态和画面中的生活感。权重：中。';
  }
  if (reference.role === 'sky_reference' || reference.roleLabel.includes('天空')) {
    return '参考天空状态、云量、光线方向、大气透明度和整体天气感。权重：最高。';
  }
  if (reference.role === 'custom_reference') {
    const customUsage = reference.customRoleLabel?.trim() || reference.roleLabel.trim();
    if (customUsage && customUsage !== '自定义用途...' && customUsage !== '未定义用途') {
      return `参考该图片中的${customUsage.replace(/参考$/, '')}视觉信息。维度：由用户定义。`;
    }
    return '参考该图片中用户指定的自定义视觉信息。维度：由用户定义。';
  }
  if (reference.role === 'material_reference' || reference.roleLabel.includes('材质')) {
    return '参考该图片中的材质纹理、反射关系和细节质感。权重：中。';
  }
  if (reference.role === 'lighting_reference' || reference.roleLabel.includes('灯光')) {
    return '参考该图片中的时间段、光照强弱和明暗关系。权重：中。';
  }
  return '参考该图片中的关键视觉信息。';
}

export function createImageReferenceBlock(reference: ReferenceInfo): ImageReferencePromptBlock {
  return {
    type: 'image_reference',
    id: `image-ref-${reference.nodeId}`,
    imageId: reference.nodeId,
    sourceNodeId: reference.nodeId,
    usage: reference.roleLabel || '未定义用途',
    thumbnailUrl: reference.imageUrl,
    promptText: getImageReferencePromptText(reference),
  };
}

export function buildPromptSubmission(
  userText: string,
  promptContent: PromptContent[],
  selectedPresetIds: string[],
  selectedStyle: StylePreset | null,
) {
  const trimmedUserText = userText.trim();
  const imageRefBlocks = promptContent.filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference');

  // 按用途分类图片引用（优先级由高到低）
  const primaryBuilding = imageRefBlocks.filter((b) => b.usage?.includes('主体建筑'));
  const customUsages = imageRefBlocks.filter((b) => b.usage?.includes('自定义'));
  const localRefs = imageRefBlocks.filter((b) => b.usage?.includes('植物') || b.usage?.includes('人物') || b.usage?.includes('天空'));
  const atmosphereRefs = imageRefBlocks.filter((b) => b.usage?.includes('氛围'));
  const undefinedRefs = imageRefBlocks.filter((b) => !b.usage || b.usage === '未定义用途');

  const presetPrompts = selectedPresetIds
    .map(getPresetById)
    .filter((preset): preset is PresetItem => Boolean(preset))
    .map((preset) => preset.promptTemplate);

  const sections: string[] = [];
  if (trimmedUserText) sections.push(`用户明确要求：${trimmedUserText}`);
  if (primaryBuilding.length) sections.push(`主体建筑约束：${primaryBuilding.map((b) => b.promptText).join('；')}`);
  if (customUsages.length) sections.push(`自定义用途约束：${customUsages.map((b) => b.promptText).join('；')}`);
  if (localRefs.length) sections.push(`局部参考：${localRefs.map((b) => b.promptText).join('；')}`);
  if (atmosphereRefs.length) sections.push(`氛围参考：${atmosphereRefs.map((b) => b.promptText).join('；')}`);
  if (presetPrompts.length) sections.push(`预设增强：${presetPrompts.join('。')}`);
  if (undefinedRefs.length) sections.push(`未定义参考：${undefinedRefs.map((b) => b.promptText).join('；')}`);

  return {
    textPrompt: sections.join('\n\n'),
    imageReferences: imageRefBlocks.map((block) => ({
      imageId: block.imageId,
      sourceNodeId: block.sourceNodeId,
      usage: block.usage,
    })),
    globalStyle: selectedStyle
      ? {
          id: selectedStyle.id,
          title: selectedStyle.title,
          prompt: selectedStyle.prompt,
        }
      : null,
  };
}
