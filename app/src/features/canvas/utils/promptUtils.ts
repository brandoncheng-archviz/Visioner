import type { ImageReferencePromptBlock, PromptContent, ReferenceInfo, StyleDefinition, PromptTemplate } from '../types/imageNode.types';
import type { LightPreviewData } from '../types/lightPreview.types';
import { getPresetById } from '../constants/presets';
import type { PresetItem } from '../types/imageNode.types';

function serializePromptTemplate(template: string | PromptTemplate): string {
  if (typeof template === 'string') return template;
  const parts = [
    template.goal,
    template.style,
    template.image,
    template.atmosphere,
    template.sky,
    template.lighting,
    template.color,
    template.background,
    template.environment,
    template.vegetation,
    template.material,
    template.materialImpact,
    template.output,
  ].filter(Boolean);
  return parts.join(' ');
}

function extractConstraints(template: string | PromptTemplate): string | null {
  if (typeof template === 'string') return null;
  return template.constraints || null;
}

function serializeStylePrompt(style: StyleDefinition): string {
  const template = style.promptTemplate;
  return [
    `风格核心：${template.styleCore}`,
    `色彩：${template.color}`,
    `光线：${template.lighting}`,
    `氛围：${template.atmosphere}`,
    `建筑与环境：${template.architectureEnvironment}`,
    `构图：${template.composition}`,
    `材质：${template.material}`,
    `人物与配景：${template.entourage}`,
    `避免：${template.avoid}`,
  ].join('\n');
}

export function stripReferencePromptMetadata(promptText: string) {
  const weightLabel = '权重';
  const labelIndex = promptText.indexOf(weightLabel);
  if (labelIndex < 0) return promptText.trim();

  const isSeparator = (char: string | undefined) => Boolean(char && /[。.;；\n\r]/u.test(char));

  let start = labelIndex;
  while (start > 0 && !isSeparator(promptText[start - 1])) {
    start -= 1;
  }
  if (start > 0 && isSeparator(promptText[start - 1])) {
    start -= 1;
  }

  let end = labelIndex + weightLabel.length;
  while (end < promptText.length && !isSeparator(promptText[end])) {
    end += 1;
  }
  if (end < promptText.length && isSeparator(promptText[end])) {
    end += 1;
  }

  return `${promptText.slice(0, start)}${promptText.slice(end)}`.trim();
}

export function getImageReferencePromptText(reference: ReferenceInfo) {
  if (reference.role === 'primary_building' || reference.roleLabel.includes('主体建筑')) {
    return '保持建筑结构、体块比例、立面关系、相机角度和构图比例不变。';
  }
  if (reference.role === 'atmosphere_reference' || reference.role === 'overall_reference' || reference.roleLabel.includes('氛围')) {
    return '参考整体时间段、天气状态、色调、光影氛围和画面情绪。';
  }
  if (reference.role === 'vegetation_reference' || reference.role === 'plant_reference' || reference.roleLabel.includes('植物')) {
    return '参考植物种类、种植密度、层次关系、季节状态和景观氛围。';
  }
  if (reference.role === 'people_reference' || reference.roleLabel.includes('人物')) {
    return '参考人物类型、姿态、尺度关系、活动状态和画面中的生活感。';
  }
  if (reference.role === 'sky_reference' || reference.roleLabel.includes('天空')) {
    return '参考天空状态、云量、光线方向、大气透明度和整体天气感。';
  }
  if (reference.role === 'custom_reference') {
    const customUsage = reference.customRoleLabel?.trim() || reference.roleLabel.trim();
    if (customUsage && customUsage !== '自定义用途...' && customUsage !== '未定义用途') {
      return `参考该图片中的${customUsage.replace(/参考/, '')}视觉信息。维度：由用户定义。`;
    }
    return '参考该图片中用户指定的自定义视觉信息。维度：由用户定义。';
  }
  if (reference.role === 'undefined_usage') {
    return '该图片尚未明确控制维度，仅作为中性视觉参考处理。';
  }
  if (reference.role === 'material_reference' || reference.roleLabel.includes('材质')) {
    return '参考该图片中的材质纹理、反射关系和细节质感。';
  }
  if (reference.role === 'lighting_reference' || reference.roleLabel.includes('灯光')) {
    return '参考该图片中的时间段、光照强弱和明暗关系。';
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
    promptText: stripReferencePromptMetadata(getImageReferencePromptText(reference)),
  };
}

function getPresetType(preset: PresetItem): 'enhancement' | 'modifier' {
  if (preset.presetType) return preset.presetType;
  return preset.category === 'realism' || preset.category === 'perspective' || preset.category === 'style'
    ? 'enhancement'
    : 'modifier';
}

export function buildPromptSubmission(
  userText: string,
  promptContent: PromptContent[],
  selectedPresetIds: string[],
  selectedStyle: StyleDefinition | null,
  nodeReferences: ReferenceInfo[] = [],
  lightPreview?: LightPreviewData | null,
) {
  const trimmedUserText = userText.trim();
  const imageRefBlocks = promptContent
    .filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference')
    .map((block) => ({
      ...block,
      promptText: stripReferencePromptMetadata(block.promptText),
    }));

  const referenceById = new Map(nodeReferences.map((reference) => [reference.nodeId, reference]));
  const blockRole = (block: ImageReferencePromptBlock) => referenceById.get(block.sourceNodeId)?.role ?? null;

  const primaryBuilding = imageRefBlocks.filter((block) => blockRole(block) === 'primary_building' || block.usage?.includes('主体建筑'));
  const customUsages = imageRefBlocks.filter((block) => blockRole(block) === 'custom_reference' || block.usage?.includes('自定义'));
  const localRefs = imageRefBlocks.filter(
    (block) =>
      blockRole(block) === 'vegetation_reference' ||
      blockRole(block) === 'plant_reference' ||
      blockRole(block) === 'people_reference' ||
      blockRole(block) === 'sky_reference' ||
      block.usage?.includes('植物') ||
      block.usage?.includes('人物') ||
      block.usage?.includes('天空'),
  );
  const atmosphereRefs = imageRefBlocks.filter((block) => blockRole(block) === 'atmosphere_reference' || blockRole(block) === 'overall_reference' || block.usage?.includes('氛围'));
  const undefinedRefs = imageRefBlocks.filter((block) => blockRole(block) === 'undefined_usage' || !block.usage || block.usage === '未定义用途');

  const selectedPresetsList = selectedPresetIds
    .map(getPresetById)
    .filter((preset): preset is PresetItem => Boolean(preset));

  const presetPrompts = selectedPresetsList.map((preset) => {
    const prompt = serializePromptTemplate(preset.promptTemplate);
    return preset.owner === 'user' ? `${preset.name}：${prompt}` : prompt;
  });

  const allConstraints: string[] = [];
  selectedPresetsList.forEach((preset) => {
    const c = extractConstraints(preset.promptTemplate);
    if (c) allConstraints.push(c);
  });

  const presets = selectedPresetsList.map((preset) => ({
    presetKey: preset.id,
    presetLabel: preset.name,
    presetPrompt: serializePromptTemplate(preset.promptTemplate),
    presetType: getPresetType(preset),
  }));

  const sections: string[] = [];
  if (trimmedUserText) sections.push(`用户明确要求：${trimmedUserText}`);
  if (presetPrompts.length) {
    let presetSection = `预设增强：${presetPrompts.join('。')}`;
    if (allConstraints.length > 0) {
      const constraintSet = new Set<string>();
      allConstraints.forEach((c) => {
        c.split(/[;；]/).forEach((part) => {
          const trimmed = part.trim();
          if (trimmed) constraintSet.add(trimmed);
        });
      });
      if (constraintSet.size > 0) {
        presetSection += `\n约束：${Array.from(constraintSet).join('；')}`;
      }
    }
    sections.push(presetSection);
  }
  if (primaryBuilding.length) sections.push(`主体建筑约束：${primaryBuilding.map((block) => block.promptText).join('；')}`);
  if (customUsages.length) sections.push(`自定义用途约束：${customUsages.map((block) => block.promptText).join('；')}`);
  if (localRefs.length) sections.push(`局部参考：${localRefs.map((block) => block.promptText).join('；')}`);
  if (atmosphereRefs.length) sections.push(`氛围参考：${atmosphereRefs.map((block) => block.promptText).join('；')}`);
  if (undefinedRefs.length) sections.push(`未定义参考：${undefinedRefs.map((block) => block.promptText).join('；')}`);
  if (selectedStyle) {
    sections.push(`最终全局 Look / LUT / 视觉语言：${serializeStylePrompt(selectedStyle)}`);
  }
  if (lightPreview?.enabled && lightPreview.derived?.promptText) {
    sections.push(`光影控制：${lightPreview.derived.promptText}`);
  }

  if (nodeReferences.length) {
    sections.push('维度控制约束：参考图按各自定义用途控制对应内容维度；风格持续作用于整体画面表现层，不无故破坏主体建筑、植物、人物、天空等内容约束；普通增强型预设不覆盖参考图约束，修改型预设与用户明确手写指令可覆盖对应维度。');
  }

  return {
    textPrompt: sections.join('\n\n'),
    referenceImages: nodeReferences.map((reference) => ({
      imageId: reference.nodeId,
      imageUrl: reference.imageUrl,
      usageKey: reference.role ?? 'undefined_usage',
      usageLabel: reference.roleLabel || '未定义用途',
      customUsageName: reference.customRoleLabel,
      promptText: getImageReferencePromptText(reference),
    })),
    promptBlocks: promptContent.map((block) =>
      block.type === 'image_reference'
        ? { ...block, promptText: stripReferencePromptMetadata(block.promptText) }
        : block,
    ),
    userPrompt: trimmedUserText,
    presets,
    globalStyle: selectedStyle
      ? {
          styleKey: selectedStyle.id,
          styleLabel: selectedStyle.title,
          stylePrompt: serializeStylePrompt(selectedStyle),
          styleRole: 'global-look' as const,
        }
      : null,
    imageReferences: nodeReferences.map((reference) => ({
      imageId: reference.nodeId,
      sourceNodeId: reference.nodeId,
      usage: reference.roleLabel || '未定义用途',
    })),
  };
}
