import { Building2, Layers, Leaf, Users, Cloud, Pencil, Palette, Sun } from 'lucide-react';
import type { ImageRole, ImageRoleOption } from '../types/imageNode.types';

export const imageRoleOptions: ImageRoleOption[] = [
  {
    value: 'primary_building',
    label: '主体建筑',
    description: '参考建筑本体的体块、特征与主要材质',
    detail: '作为主体建筑参考，AI 将优先参考建筑体块、轮廓比例、立面关系、建筑特征，以及外立面的主要材质与纹理表达。',
    constraints: ['建筑体块', '轮廓比例', '立面语言', '开窗节奏', '建筑特征', '主要材质纹理'],
    Icon: Building2,
    color: '#3B82F6',
  },
  {
    value: 'atmosphere_reference',
    label: '氛围参考',
    description: '参考整体氛围 / 色调 / 真实度',
    detail: '作为氛围参考，AI 将主要参考整体时间段、天气状态、色调、光影情绪、曝光关系、对比度和真实度，不复制具体建筑内容。',
    constraints: ['时间段', '天气', '色调', '光影情绪', '曝光', '对比度', '真实度', '整体画面气质'],
    Icon: Layers,
    color: '#8B5CF6',
  },
  {
    value: 'vegetation_reference',
    label: '植物参考',
    description: '参考植物类型与绿化层次',
    detail: '作为植物参考，AI 将主要参考植物类型、树形、种植密度、景观层次、季节感、地域感和绿化风格，不改变主体建筑。',
    constraints: ['植物类型', '树形', '种植密度', '草坪', '灌木', '花境', '季节感', '绿化层次'],
    Icon: Leaf,
    color: '#22C55E',
  },
  {
    value: 'people_reference',
    label: '人物参考',
    description: '参考人物尺度 / 密度 / 活动状态',
    detail: '作为人物参考，AI 将主要参考人物密度、尺度关系、活动状态、生活方式和场景活力，不参考具体人物长相，不让人物成为视觉中心。',
    constraints: ['人物数量', '人物密度', '尺度关系', '活动状态', '生活方式', '服装季节', '场景活力'],
    Icon: Users,
    color: '#F97316',
  },
  {
    value: 'sky_reference',
    label: '天空参考',
    description: '参考天空 / 云层 / 天气背景',
    detail: '作为天空参考，AI 将主要参考天空颜色、云层形态、天气状态、日落层次和天空明暗关系，不改变主体建筑和画面构图。',
    constraints: ['天空颜色', '云层形态', '天气状态', '日落晚霞', '蓝天白云', '阴天天空', '明暗层次'],
    Icon: Cloud,
    color: '#FACC15',
  },
  {
    value: 'custom_reference',
    label: '自定义用途...',
    description: '自定义具体局部参考内容',
    detail: '用于定义具体局部参考内容，例如铺装、水景、入口、栏杆、灯带、室内家具、立面肌理、商业招牌等。',
    constraints: ['用户输入的具体局部内容'],
    Icon: Pencil,
    color: '#EF4444',
  },
];

export const roleColorMap: Record<ImageRole | 'null', string> = {
  primary_building: '#3B82F6',
  atmosphere_reference: '#8B5CF6',
  vegetation_reference: '#22C55E',
  people_reference: '#F97316',
  custom_reference: '#EF4444',
  overall_reference: '#8B5CF6',
  plant_reference: '#22C55E',
  material_reference: '#EF4444',
  lighting_reference: '#EF4444',
  sky_reference: '#FACC15',
  null: '#9CA3AF',
};

export const UNIQUE_USAGES: ImageRole[] = ['primary_building', 'atmosphere_reference', 'sky_reference'];

export const legacyImageRoleOptions: Partial<Record<ImageRole, ImageRoleOption>> = {
  overall_reference: imageRoleOptions.find((option) => option.value === 'atmosphere_reference'),
  plant_reference: imageRoleOptions.find((option) => option.value === 'vegetation_reference'),
  material_reference: {
    value: 'material_reference',
    label: '材质参考',
    description: '旧数据兼容：材质参考',
    detail: '旧数据兼容显示为材质参考。新建用途请使用自定义用途。',
    constraints: ['材质参考'],
    Icon: Palette,
    color: '#EF4444',
  },
  lighting_reference: {
    value: 'lighting_reference',
    label: '灯光参考',
    description: '旧数据兼容：灯光参考',
    detail: '旧数据兼容显示为灯光参考。新建用途请使用自定义用途。',
    constraints: ['灯光参考'],
    Icon: Sun,
    color: '#EF4444',
  },
};

export function normalizeCustomReferenceLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return trimmed.endsWith('参考') ? trimmed : `${trimmed}参考`;
}

export function getImageRoleOption(role: ImageRole | null | undefined, customLabel?: string) {
  if (!role) return null;
  const option = imageRoleOptions.find((item) => item.value === role) || legacyImageRoleOptions[role] || null;
  if (role !== 'custom_reference' || !option) return option;
  const label = customLabel?.trim() || option.label;
  return { ...option, label };
}

export function getImageRoleLabel(role: ImageRole | null | undefined, customLabel?: string) {
  return getImageRoleOption(role, customLabel)?.label || '未定义用途';
}

export function getImageRoleColor(role: ImageRole | null | undefined) {
  return roleColorMap[role ?? 'null'] || roleColorMap.null;
}
