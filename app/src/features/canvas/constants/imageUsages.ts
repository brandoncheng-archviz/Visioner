import { Building2, Layers, Pencil, Palette, Sun, CircleHelp, Focus } from 'lucide-react';
import i18n from '@/i18n';
import type { ImageRole, ImageRoleOption, LocalReferenceType } from '../types/imageNode.types';

export const SYSTEM_USAGE_LABELS = [
  '主体建筑',
  '氛围参考',
  '局部参考',
  '自定义用途',
  '未定义用途',
] as const;

/* ─── Primary role options (shown in creation UI) ─── */
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
    value: 'local_reference',
    label: i18n.t('reference.localReference'),
    description: i18n.t('reference.localReference'),
    detail: i18n.t('reference.localReferenceDetail'),
    constraints: ['userDefinedContent'],
    Icon: Focus,
    color: '#14B8A6',
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

/* ─── Local reference sub-types ─── */
export interface LocalReferenceOption {
  value: LocalReferenceType;
  label: string;
  promptText: string;
  color: string;
}

export const localReferenceOptions: LocalReferenceOption[] = [
  {
    value: 'vegetation',
    label: i18n.t('reference.localReferenceVegetation'),
    promptText: '只参考该图中的植物类型、种植密度、景观层次和绿化氛围，不复制整体建筑体块与构图。',
    color: '#22C55E',
  },
  {
    value: 'people',
    label: i18n.t('reference.localReferencePeople'),
    promptText: '只参考该图中的人物尺度、活动状态、人群密度和生活氛围，不复制整体建筑体块与构图。',
    color: '#F97316',
  },
  {
    value: 'sky',
    label: i18n.t('reference.localReferenceSky'),
    promptText: '只参考该图中的天空状态、云量、天气感和时间段氛围，不复制整体建筑体块与构图。',
    color: '#FACC15',
  },
  {
    value: 'water',
    label: i18n.t('reference.localReferenceWater'),
    promptText: '只参考该图中的水面状态、反射关系、湿润感和水体氛围，不复制整体建筑体块与构图。',
    color: '#3B82F6',
  },
  {
    value: 'retail',
    label: i18n.t('reference.localReferenceRetail'),
    promptText: '只参考该图中的首层商业、店铺界面、橱窗展示、招牌尺度和街道商业氛围，不复制整体建筑体块与构图。',
    color: '#EC4899',
  },
  {
    value: 'other',
    label: i18n.t('reference.localReferenceOther'),
    promptText: '只参考用户指定的局部元素，不复制整体建筑体块与构图。',
    color: '#9CA3AF',
  },
];

/* ─── Color map ─── */
export const roleColorMap: Record<ImageRole | 'null' | 'local_reference', string> = {
  primary_building: '#3B82F6',
  atmosphere_reference: '#8B5CF6',
  local_reference: '#14B8A6',
  custom_reference: '#EF4444',
  undefined_usage: '#9CA3AF',
  overall_reference: '#8B5CF6',
  plant_reference: '#22C55E',
  material_reference: '#EF4444',
  lighting_reference: '#EF4444',
  // Legacy roles that map to local_reference — their colors are handled by sub-type inference
  vegetation_reference: '#22C55E',
  people_reference: '#F97316',
  sky_reference: '#FACC15',
  null: '#9CA3AF',
};

/* ─── Unique usages (max 1 per target node) ─── */
export const UNIQUE_USAGES: ImageRole[] = ['primary_building', 'atmosphere_reference'];

/* ─── Legacy options for old data compatibility ─── */
export const legacyImageRoleOptions: Partial<Record<ImageRole, ImageRoleOption>> = {
  overall_reference: imageRoleOptions.find((option) => option.value === 'atmosphere_reference'),
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

/* ─── Legacy role normalization ─── */
export function getNormalizedRole(role: ImageRole | null | undefined): ImageRole | null {
  if (!role) return null;
  if (role === 'vegetation_reference' || role === 'plant_reference') return 'local_reference';
  if (role === 'people_reference') return 'local_reference';
  if (role === 'sky_reference') return 'local_reference';
  return role;
}

export function getLocalReferenceTypeFromRole(
  role: ImageRole | null | undefined,
  existingType?: LocalReferenceType,
): LocalReferenceType | undefined {
  if (existingType) return existingType;
  if (role === 'vegetation_reference' || role === 'plant_reference') return 'vegetation';
  if (role === 'people_reference') return 'people';
  if (role === 'sky_reference') return 'sky';
  return undefined;
}

export function getLocalReferenceOption(type: LocalReferenceType | undefined): LocalReferenceOption | undefined {
  if (!type) return undefined;
  return localReferenceOptions.find((o) => o.value === type);
}

/* ─── Helpers ─── */
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
  const normalizedRole = getNormalizedRole(role) || role;
  let option = imageRoleOptions.find((item) => item.value === normalizedRole) || null;
  if (!option) {
    option = legacyImageRoleOptions[role] || null;
  }
  if (normalizedRole !== 'custom_reference' || !option) return option;
  const label = customLabel?.trim() || option.label;
  return { ...option, label };
}

export function getImageRoleLabel(role: ImageRole | null | undefined, customLabel?: string, localRefType?: LocalReferenceType) {
  const normalizedRole = getNormalizedRole(role) || role;
  const option = getImageRoleOption(normalizedRole, customLabel);
  const baseLabel = option?.label || i18n.t('imageNode.undefinedUsage');
  if (normalizedRole === 'local_reference') {
    const type = localRefType || getLocalReferenceTypeFromRole(role);
    if (type) {
      const subLabel = getLocalReferenceOption(type)?.label;
      if (subLabel) return `${baseLabel} · ${subLabel}`;
    }
  }
  return baseLabel;
}

export function getImageRoleColor(role: ImageRole | null | undefined, localRefType?: LocalReferenceType) {
  if (role === 'local_reference' && localRefType) {
    return getLocalReferenceOption(localRefType)?.color || roleColorMap.local_reference;
  }
  const inferredType = getLocalReferenceTypeFromRole(role);
  if (inferredType) {
    return getLocalReferenceOption(inferredType)?.color || roleColorMap[role ?? 'null'];
  }
  return roleColorMap[role ?? 'null'] || roleColorMap.null;
}
