import type { ImageMark, ImageMarkReferencePromptBlock, ImageReferencePromptBlock, PromptContent, ReferenceInfo, StyleDefinition } from '../types/imageNode.types';
import {
  getNormalizedRole,
  getLocalReferenceTypeFromRole,
  getLocalReferenceOption,
  getLocalReferenceLabel,
  normalizeLocalReferenceType,
} from '../constants/imageUsages';
import type { LightPreviewData } from '../types/lightPreview.types';
import { getPresetById } from '../constants/presets';
import type { PresetItem } from '../types/imageNode.types';
import { sortReferencesByUsage } from './referenceUtils';
import i18n from '@/i18n';

const LEGACY_CUSTOM_REFERENCE_LABEL = ['自定义', '用途...'].join('');

function normalizeSentence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[。！？.!?]$/u.test(trimmed) ? trimmed : `${trimmed}。`;
}

export function getPresetPromptText(preset: PresetItem): string {
  const template = preset.promptTemplate;
  if (typeof template === 'string') return template.trim();

  const mainParts = [
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
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  const constraintText = template.constraints?.trim();
  const sentences = mainParts.map(normalizeSentence);
  if (constraintText) {
    const normalizedConstraint = normalizeSentence(constraintText.replace(/^(避免|不要)[：:，,、\s]*/u, ''));
    sentences.push(`避免${normalizedConstraint}`);
  }

  return sentences.join('');
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
  const normalizedRole = getNormalizedRole(reference.role);

  if (normalizedRole === 'primary_building' || reference.roleLabel.includes('主体建筑')) {
    return '保持建筑结构、体块比例、立面关系、相机角度和构图比例不变。';
  }
  if (normalizedRole === 'atmosphere_reference' || reference.role === 'overall_reference' || reference.roleLabel.includes('氛围')) {
    return '参考整体时间段、天气状态、色调、光影氛围和画面情绪。';
  }
  if (reference.role === 'material_reference' || reference.roleLabel.includes('材质')) {
    return '参考该图片中的材质类型、表面纹理、反射关系、粗糙度和细节质感。';
  }
  if (reference.role === 'landscape_reference' || reference.roleLabel.includes('景观')) {
    return '参考该图片中的景观布局、植物配置、地形关系、铺装与室外空间氛围。';
  }
  if (reference.role === 'lighting_reference' || reference.roleLabel.includes('照明') || reference.roleLabel.includes('灯光')) {
    return '参考该图片中的灯具语言、光色、照明强度、明暗层次和光线分布。';
  }
  if (reference.role === 'interior_reference' || reference.roleLabel.includes('室内')) {
    return '参考该图片中的室内空间布局、家具陈设、室内材质和整体氛围。';
  }
  if (normalizedRole === 'local_reference') {
    const type = normalizeLocalReferenceType(reference.localReferenceType) || getLocalReferenceTypeFromRole(reference.role);
    const label = getLocalReferenceLabel(reference.role, reference.localReferenceType, reference.localReferenceLabel, reference.customRoleLabel);
    if (type === 'custom' && label) {
      return `只参考该图中的「${label}」相关视觉信息，不复制整体建筑体块与构图。`;
    }
    if (type) {
      const option = getLocalReferenceOption(type);
      if (option) return option.promptText;
    }
    if (label) {
      return `只参考该图中的「${label}」相关视觉信息，不复制整体建筑体块与构图。`;
    }
    return '只重点参考该图中的指定局部元素，不复制整体建筑体块与构图。';
  }
  if (reference.role === 'custom_reference') {
    const customUsage = reference.customRoleLabel?.trim() || reference.roleLabel.trim();
    if (customUsage && customUsage !== LEGACY_CUSTOM_REFERENCE_LABEL && customUsage !== '未设置参考用途' && customUsage !== '未定义用途') {
      return `只参考该图片中的${customUsage.replace(/参考/, '')}相关视觉信息，不复制整体建筑体块与构图。`;
    }
    return '只参考该图片中用户指定的局部参考视觉信息，不复制整体建筑体块与构图。';
  }
  if (reference.role === 'undefined_usage') {
    return '该图片尚未明确控制维度，仅作为中性视觉参考处理。';
  }
  return '参考该图片中的关键视觉信息。';
}

export function createImageReferenceBlock(reference: ReferenceInfo): ImageReferencePromptBlock {
  return {
    type: 'image_reference',
    id: `image-ref-${reference.nodeId}`,
    imageId: reference.nodeId,
    sourceNodeId: reference.nodeId,
    usage: reference.roleLabel || i18n.t('imageNode.undefinedUsage'),
    thumbnailUrl: reference.imageUrl,
    promptText: stripReferencePromptMetadata(getImageReferencePromptText(reference)),
  };
}

export function createImageMarkReferenceBlock(mark: ImageMark): ImageMarkReferencePromptBlock {
  const selectedCandidate = mark.candidates.find((candidate) => candidate.id === mark.selectedCandidateId)
    ?? mark.candidates[0];
  return {
    type: 'image_mark_reference',
    id: `image-mark-ref-${mark.id}`,
    markId: mark.id,
    imageId: mark.sourceNodeId,
    sourceNodeId: mark.sourceNodeId,
    usageKey: mark.usageKey,
    usageLabel: mark.usageLabel,
    thumbnailUrl: mark.sourceImageUrl,
    markType: mark.markType,
    markPoint: mark.point,
    markBox: mark.box,
    candidates: mark.candidates,
    selectedCandidateId: selectedCandidate?.id ?? '',
    markLabel: selectedCandidate?.label ?? '',
    promptText: selectedCandidate?.promptText ?? '',
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
  const sortedNodeReferences = sortReferencesByUsage(nodeReferences);
  const imageRefBlocks = promptContent
    .filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference')
    .map((block) => ({
      ...block,
      promptText: stripReferencePromptMetadata(block.promptText),
    }));
  const imageMarkBlocks = promptContent.filter(
    (block): block is ImageMarkReferencePromptBlock => block.type === 'image_mark_reference',
  );

  const referenceById = new Map(sortedNodeReferences.map((reference) => [reference.nodeId, reference]));
  const sortedReferenceIndex = new Map(sortedNodeReferences.map((reference, index) => [reference.nodeId, index]));
  const blockRole = (block: ImageReferencePromptBlock) => referenceById.get(block.sourceNodeId)?.role ?? null;
  const blockLocalReferenceType = (block: ImageReferencePromptBlock) =>
    normalizeLocalReferenceType(referenceById.get(block.sourceNodeId)?.localReferenceType);
  const isLocalReferenceBlock = (block: ImageReferencePromptBlock) =>
    blockRole(block) === 'local_reference' ||
    blockRole(block) === 'custom_reference' ||
    blockRole(block) === 'vegetation_reference' ||
    blockRole(block) === 'plant_reference' ||
    blockRole(block) === 'people_reference' ||
    blockRole(block) === 'sky_reference' ||
    Boolean(blockLocalReferenceType(block)) ||
    block.usage?.includes('植物') ||
    block.usage?.includes('人物') ||
    block.usage?.includes('天空') ||
    block.usage?.includes('海水') ||
    block.usage?.includes('城市') ||
    block.usage?.includes('玻璃') ||
    block.usage?.includes('雾气') ||
    block.usage?.includes('铺装') ||
    block.usage?.includes('局部');

  const sortBlocksByReferenceOrder = (blocks: ImageReferencePromptBlock[]) =>
    [...blocks].sort((a, b) => {
      const aOrder = sortedReferenceIndex.get(a.sourceNodeId);
      const bOrder = sortedReferenceIndex.get(b.sourceNodeId);
      if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== undefined) return -1;
      if (bOrder !== undefined) return 1;
      return imageRefBlocks.indexOf(a) - imageRefBlocks.indexOf(b);
    });

  const primaryBuilding = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'primary_building' || block.usage?.includes('主体建筑')));
  const atmosphereRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'atmosphere_reference' || blockRole(block) === 'overall_reference' || block.usage?.includes('氛围')));
  const materialRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'material_reference' || block.usage?.includes('材质')));
  const landscapeRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'landscape_reference' || block.usage?.includes('景观')));
  const lightingRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'lighting_reference' || block.usage?.includes('照明') || block.usage?.includes('灯光')));
  const interiorRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'interior_reference' || block.usage?.includes('室内')));
  const localRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter(isLocalReferenceBlock));
  const undefinedRefs = sortBlocksByReferenceOrder(imageRefBlocks.filter((block) => blockRole(block) === 'undefined_usage' || !block.usage || block.usage === '未设置参考用途' || block.usage === '未定义用途'));

  const selectedPresetsList = selectedPresetIds
    .map(getPresetById)
    .filter((preset): preset is PresetItem => Boolean(preset));

  const presets = selectedPresetsList.map((preset) => ({
    presetKey: preset.id,
    presetLabel: preset.name,
    presetPrompt: getPresetPromptText(preset),
    presetType: getPresetType(preset),
  }));

  const sections: string[] = [];
  if (trimmedUserText) sections.push(trimmedUserText);
  if (primaryBuilding.length) sections.push(`主体建筑约束：${primaryBuilding.map((block) => block.promptText).join('；')}`);
  if (atmosphereRefs.length) sections.push(`氛围参考：${atmosphereRefs.map((block) => block.promptText).join('；')}`);
  if (materialRefs.length) sections.push(`材质参考：${materialRefs.map((block) => block.promptText).join('；')}`);
  if (landscapeRefs.length) sections.push(`景观参考：${landscapeRefs.map((block) => block.promptText).join('；')}`);
  if (lightingRefs.length) sections.push(`照明参考：${lightingRefs.map((block) => block.promptText).join('；')}`);
  if (interiorRefs.length) sections.push(`室内参考：${interiorRefs.map((block) => block.promptText).join('；')}`);
  if (localRefs.length) sections.push(`旧版局部参考：${localRefs.map((block) => block.promptText).join('；')}`);
  if (undefinedRefs.length) sections.push(`未定义参考：${undefinedRefs.map((block) => block.promptText).join('；')}`);
  if (imageMarkBlocks.length) {
    sections.push(`元素标记参考：\n${imageMarkBlocks.map((block) => (
      `图${Math.max(1, (sortedReferenceIndex.get(block.sourceNodeId) ?? 0) + 1)} · ${block.usageLabel} · ${block.markLabel}：${stripReferencePromptMetadata(block.promptText)}`
    )).join('\n')}`);
  }
  if (selectedStyle) {
    sections.push(`最终全局 Look / LUT / 视觉语言：${serializeStylePrompt(selectedStyle)}`);
  }
  if (lightPreview?.enabled && lightPreview.derived?.promptText) {
    sections.push(`光影控制：${lightPreview.derived.promptText}`);
  }

  const sortedImageRefBlocks = sortBlocksByReferenceOrder(imageRefBlocks);
  let imageBlockIndex = 0;
  const sortedPromptContent = promptContent.map((block) => {
    if (block.type !== 'image_reference') return block;
    return sortedImageRefBlocks[imageBlockIndex++] ?? {
      ...block,
      promptText: stripReferencePromptMetadata(block.promptText),
    };
  });

  if (sortedNodeReferences.length) {
    sections.push('维度控制约束：参考图按各自用途控制对应内容维度；风格持续作用于整体画面表现层，不无故破坏主体建筑、氛围、材质、景观、照明和室内空间等内容约束；普通增强型预设不覆盖参考图约束，修改型预设与用户明确手写指令可覆盖对应维度。');
  }

  return {
    textPrompt: sections.join('\n\n'),
    referenceImages: sortedNodeReferences.map((reference) => ({
      imageId: reference.nodeId,
      imageUrl: reference.imageUrl,
      usageKey: reference.role ?? 'undefined_usage',
      usageLabel: reference.roleLabel || i18n.t('imageNode.undefinedUsage'),
      customUsageName: reference.customRoleLabel,
      localReferenceType: reference.localReferenceType,
      localReferenceLabel: reference.localReferenceLabel,
      localReferencePoint: reference.localReferencePoint,
      promptText: getImageReferencePromptText(reference),
    })),
    markReferences: imageMarkBlocks.map((block) => ({
      markId: block.markId,
      sourceNodeId: block.sourceNodeId,
      usageKey: block.usageKey,
      usageLabel: block.usageLabel,
      markType: block.markType,
      markPoint: block.markPoint,
      markBox: block.markBox,
      candidates: block.candidates,
      selectedCandidateId: block.selectedCandidateId,
      markLabel: block.markLabel,
      promptText: stripReferencePromptMetadata(block.promptText),
    })),
    promptBlocks: sortedPromptContent.map((block) =>
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
    imageReferences: sortedNodeReferences.map((reference) => ({
      imageId: reference.nodeId,
      sourceNodeId: reference.nodeId,
      usage: reference.roleLabel || i18n.t('imageNode.undefinedUsage'),
      localReferenceType: reference.localReferenceType,
      localReferenceLabel: reference.localReferenceLabel,
      localReferencePoint: reference.localReferencePoint,
    })),
  };
}
