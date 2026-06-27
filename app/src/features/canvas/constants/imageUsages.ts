import { Building2, Layers, Focus } from 'lucide-react';
import i18n from '@/i18n';
import type { ImageRole, ImageRoleOption, LocalReferenceType } from '../types/imageNode.types';

/* Reserved labels that cannot be used as custom local-reference names */
export const SYSTEM_USAGE_LABELS = [
  '主体建筑',
  '氛围参考',
  '局部参考',
  '植物',
  '人物',
  '天空',
  '海水',
  '城市',
  '雾气',
  '铺装',
  '未设置参考用途',
  '未定义用途',
  '手动输入其他元素',
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
    color: '#7DD3FC',
  },
  {
    value: 'seawater',
    label: i18n.t('reference.localReferenceWater'),
    promptText: '只参考该图中的海水状态、反射关系、湿润感和滨海氛围，不复制整体建筑体块与构图。',
    color: '#06B6D4',
  },
  {
    value: 'city',
    label: i18n.t('reference.localReferenceRetail'),
    promptText: '只参考该图中的城市界面、街道关系、建筑背景和都市氛围，不复制整体建筑体块与构图。',
    color: '#64748B',
  },
  {
    value: 'glass',
    label: i18n.t('reference.localReferenceGlass'),
    promptText: '参考该图中玻璃的通透度、反射、室内可见度、材质质感、光影关系和高级感，并自然融合到目标建筑画面中。',
    color: '#67E8F9',
  },
];

const legacyLocalReferenceOptions: LocalReferenceOption[] = [
  {
    value: 'mist',
    label: i18n.t('reference.localReferenceMist'),
    promptText: '只参考该图中的雾气浓度、空气透视、远近虚实和朦胧氛围，不复制整体建筑体块与构图。',
    color: '#A78BFA',
  },
  {
    value: 'paving',
    label: i18n.t('reference.localReferencePaving'),
    promptText: '只参考该图中的铺装材质、拼接方式、纹理尺度和地面细节，不复制整体建筑体块与构图。',
    color: '#D6A76C',
  },
];

export const CUSTOM_LOCAL_REFERENCE_COLOR = '#94A3B8';

const LOCAL_REFERENCE_TYPE_ALIASES: Partial<Record<string, LocalReferenceType>> = {
  water: 'seawater',
  retail: 'city',
};

const LOCAL_REFERENCE_TYPE_VALUES = new Set<LocalReferenceType>([
  'vegetation',
  'people',
  'sky',
  'seawater',
  'city',
  'glass',
  'mist',
  'paving',
  'custom',
]);

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
  // Legacy roles that map to local_reference
  vegetation_reference: '#22C55E',
  people_reference: '#F97316',
  sky_reference: '#FACC15',
  null: '#9CA3AF',
};

/* ─── Unique usages (max 1 per target node) ─── */
export const UNIQUE_USAGES: ImageRole[] = ['primary_building', 'atmosphere_reference'];

/* ─── Legacy options for old data compatibility ─── */
export const legacyImageRoleOptions: Partial<Record<ImageRole, ImageRoleOption>> = {};

/* ─── Legacy role normalization ─── */
export function getNormalizedRole(role: ImageRole | null | undefined): ImageRole | null {
  if (!role) return null;
  if (role === 'vegetation_reference' || role === 'plant_reference') return 'local_reference';
  if (role === 'people_reference') return 'local_reference';
  if (role === 'sky_reference') return 'local_reference';
  if (role === 'custom_reference') return 'local_reference';
  if (role === 'undefined_usage') return null;
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
  if (role === 'custom_reference') return 'custom';
  return undefined;
}

export function normalizeLocalReferenceType(
  type: LocalReferenceType | string | undefined | null,
): LocalReferenceType | undefined {
  if (!type) return undefined;
  const normalized = LOCAL_REFERENCE_TYPE_ALIASES[type] ?? type;
  return LOCAL_REFERENCE_TYPE_VALUES.has(normalized as LocalReferenceType) ? normalized as LocalReferenceType : undefined;
}

export function getLocalReferenceOption(type: LocalReferenceType | undefined): LocalReferenceOption | undefined {
  if (!type) return undefined;
  const normalized = normalizeLocalReferenceType(type);
  if (!normalized) return undefined;
  return localReferenceOptions.find((o) => o.value === normalized)
    ?? legacyLocalReferenceOptions.find((o) => o.value === normalized);
}

export function getLocalReferenceColor(type: LocalReferenceType | undefined) {
  if (type === 'custom') return CUSTOM_LOCAL_REFERENCE_COLOR;
  return getLocalReferenceOption(type)?.color;
}

export function getLocalReferenceLabel(
  role: ImageRole | null | undefined,
  localRefType?: LocalReferenceType,
  localRefLabel?: string,
  customRoleLabel?: string,
): string | undefined {
  if (localRefLabel) return localRefLabel;
  if (role === 'custom_reference' && customRoleLabel) return customRoleLabel;
  const normalized = normalizeLocalReferenceType(localRefType);
  if (normalized && normalized !== 'custom') {
    return getLocalReferenceOption(normalized)?.label;
  }
  return undefined;
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

export function getImageRoleLabel(
  role: ImageRole | null | undefined,
  customLabel?: string,
  localRefType?: LocalReferenceType,
  localRefLabel?: string,
): string {
  const normalizedRole = getNormalizedRole(role) || role;
  if (!normalizedRole) {
    return i18n.t('imageNode.undefinedUsage');
  }
  const option = getImageRoleOption(normalizedRole, customLabel);
  const baseLabel = option?.label || i18n.t('imageNode.undefinedUsage');
  if (normalizedRole === 'local_reference') {
    const subLabel = getLocalReferenceLabel(role, localRefType, localRefLabel, customLabel);
    if (subLabel) return `${baseLabel} · ${subLabel}`;
  }
  return baseLabel;
}

export function getImageRoleColor(role: ImageRole | null | undefined, localRefType?: LocalReferenceType) {
  if (role === 'local_reference' && localRefType) {
    return getLocalReferenceColor(localRefType) || roleColorMap.local_reference;
  }
  const inferredType = getLocalReferenceTypeFromRole(role);
  if (inferredType) {
    return getLocalReferenceColor(inferredType) || roleColorMap[role ?? 'null'];
  }
  return roleColorMap[role ?? 'null'] || roleColorMap.null;
}

export function getReferenceUsageInfo(
  role: ImageRole | null | undefined,
  customLabel?: string,
  localRefType?: LocalReferenceType,
  localRefLabel?: string,
) {
  const normalizedRole = getNormalizedRole(role);
  const resolvedLocalReferenceType = normalizeLocalReferenceType(localRefType) ?? getLocalReferenceTypeFromRole(role);
  const resolvedLocalReferenceLabel = getLocalReferenceLabel(role, resolvedLocalReferenceType, localRefLabel, customLabel);

  return {
    normalizedRole,
    localReferenceType: resolvedLocalReferenceType,
    localReferenceLabel: resolvedLocalReferenceLabel,
    label: getImageRoleLabel(role, customLabel, resolvedLocalReferenceType, resolvedLocalReferenceLabel),
    color: getImageRoleColor(role, resolvedLocalReferenceType),
  };
}
