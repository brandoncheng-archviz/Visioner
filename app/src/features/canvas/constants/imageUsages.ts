import { Building2, Layers, Leaf, Users, Cloud, Pencil, Palette, Sun, CircleHelp } from 'lucide-react';
import i18n from '@/i18n';
import type { ImageRole, ImageRoleOption } from '../types/imageNode.types';

export const SYSTEM_USAGE_LABELS = [
  '主体建筑',
  '氛围参考',
  '植物参考',
  '人物参考',
  '天空参考',
  '自定义用途',
  '未定义用途',
] as const;

export const imageRoleOptions: ImageRoleOption[] = [
  {
    value: 'primary_building',
    label: i18n.t('reference.primaryBuilding'),
    description: i18n.t('reference.primaryBuilding'),
    detail: i18n.t('reference.primaryBuildingDetail'),
    constraints: ['buildingMass', 'outlineRatio', 'facadeLanguage', 'windowRhythm', 'buildingFeature', 'mainMaterialTexture'],
    Icon: Building2,
    color: '#3B82F6',
  },
  {
    value: 'atmosphere_reference',
    label: i18n.t('reference.atmosphereReference'),
    description: i18n.t('reference.atmosphereReference'),
    detail: i18n.t('reference.atmosphereReferenceDetail'),
    constraints: ['timeOfDay', 'weather', 'colorTone', 'lightShadowMood', 'exposure', 'contrast', 'realism', 'overallQuality'],
    Icon: Layers,
    color: '#8B5CF6',
  },
  {
    value: 'vegetation_reference',
    label: i18n.t('reference.vegetationReference'),
    description: i18n.t('reference.vegetationReference'),
    detail: i18n.t('reference.vegetationReferenceDetail'),
    constraints: ['plantType', 'treeShape', 'plantingDensity', 'lawn', 'shrub', 'flowerBed', 'seasonalSense', 'greeningLevel'],
    Icon: Leaf,
    color: '#22C55E',
  },
  {
    value: 'people_reference',
    label: i18n.t('reference.peopleReference'),
    description: i18n.t('reference.peopleReference'),
    detail: i18n.t('reference.peopleReferenceDetail'),
    constraints: ['peopleCount', 'peopleDensity', 'scaleRelation', 'activityState', 'lifestyle', 'clothingSeason', 'sceneVitality'],
    Icon: Users,
    color: '#F97316',
  },
  {
    value: 'sky_reference',
    label: i18n.t('reference.skyReference'),
    description: i18n.t('reference.skyReference'),
    detail: i18n.t('reference.skyReferenceDetail'),
    constraints: ['skyColor', 'cloudShape', 'weatherState', 'sunsetGlow', 'blueSky', 'overcastSky', 'lightDarkLevel'],
    Icon: Cloud,
    color: '#FACC15',
  },
  {
    value: 'custom_reference',
    label: i18n.t('reference.customReference'),
    description: i18n.t('reference.customReference'),
    detail: i18n.t('reference.customReferenceDetail'),
    constraints: ['userDefinedContent'],
    Icon: Pencil,
    color: '#EF4444',
  },
  {
    value: 'undefined_usage',
    label: i18n.t('imageNode.undefinedUsage'),
    description: i18n.t('imageNode.undefinedUsage'),
    detail: i18n.t('reference.undefinedUsageDetail'),
    constraints: ['neutralVisualReference'],
    Icon: CircleHelp,
    color: '#9CA3AF',
  },
];

export const roleColorMap: Record<ImageRole | 'null', string> = {
  primary_building: '#3B82F6',
  atmosphere_reference: '#8B5CF6',
  vegetation_reference: '#22C55E',
  people_reference: '#F97316',
  custom_reference: '#EF4444',
  undefined_usage: '#9CA3AF',
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
    label: i18n.t('reference.materialReference'),
    description: i18n.t('reference.materialReference'),
    detail: i18n.t('reference.materialReferenceDetail'),
    constraints: ['materialReference'],
    Icon: Palette,
    color: '#EF4444',
  },
  lighting_reference: {
    value: 'lighting_reference',
    label: i18n.t('reference.lightingReference'),
    description: i18n.t('reference.lightingReference'),
    detail: i18n.t('reference.lightingReferenceDetail'),
    constraints: ['lightingReference'],
    Icon: Sun,
    color: '#EF4444',
  },
};

export function normalizeUsageNameForCompare(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function normalizeCustomReferenceLabel(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  return trimmed.slice(0, 24);
}

export function validateCustomReferenceLabel(value: string, existingLabels: string[] = []) {
  const label = normalizeCustomReferenceLabel(value);
  if (!label) return { ok: false as const, message: i18n.t('reference.customEmptyError') };
  const normalized = normalizeUsageNameForCompare(label);
  if (SYSTEM_USAGE_LABELS.some((reserved) => normalizeUsageNameForCompare(reserved) === normalized)) {
    return { ok: false as const, message: i18n.t('reference.customReservedError') };
  }
  if (existingLabels.some((existing) => normalizeUsageNameForCompare(existing) === normalized)) {
    return { ok: false as const, message: i18n.t('reference.customDuplicateError') };
  }
  return { ok: true as const, label };
}

export function getImageRoleOption(role: ImageRole | null | undefined, customLabel?: string) {
  if (!role) return null;
  const option = imageRoleOptions.find((item) => item.value === role) || legacyImageRoleOptions[role] || null;
  if (role !== 'custom_reference' || !option) return option;
  const label = customLabel?.trim() || option.label;
  return { ...option, label };
}

export function getImageRoleLabel(role: ImageRole | null | undefined, customLabel?: string) {
  return getImageRoleOption(role, customLabel)?.label || i18n.t('imageNode.undefinedUsage');
}

export function getImageRoleColor(role: ImageRole | null | undefined) {
  return roleColorMap[role ?? 'null'] || roleColorMap.null;
}
