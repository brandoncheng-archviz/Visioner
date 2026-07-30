import { Armchair, Building2, LampCeiling, Layers, Mountain, SwatchBook } from 'lucide-react';
import type { ImageRole, ImageRoleOption, LocalReferenceType } from '../types/imageNode.types';

export type ReferenceRole = 'primaryBuilding' | 'atmosphere' | 'local' | 'unassigned';
export type ReferenceLocalType = 'vegetation' | 'people' | 'sky' | 'water' | 'city' | 'fog';

export const REFERENCE_ROLE_OPTIONS: ReadonlyArray<{
  value: ReferenceRole;
  labelKey: string;
  descriptionKey: string;
}> = [
  { value: 'primaryBuilding', labelKey: 'reference.roles.primaryBuilding', descriptionKey: 'reference.descriptions.primaryBuilding' },
  { value: 'atmosphere', labelKey: 'reference.roles.atmosphere', descriptionKey: 'reference.descriptions.atmosphere' },
  { value: 'local', labelKey: 'reference.roles.local', descriptionKey: 'reference.descriptions.local' },
  { value: 'unassigned', labelKey: 'reference.roles.unassigned', descriptionKey: 'reference.descriptions.unassigned' },
];

export const LOCAL_REFERENCE_TYPE_OPTIONS: ReadonlyArray<{
  value: ReferenceLocalType;
  storageValue: LocalReferenceType;
  labelKey: string;
}> = [
  { value: 'vegetation', storageValue: 'vegetation', labelKey: 'reference.localTypes.vegetation' },
  { value: 'people', storageValue: 'people', labelKey: 'reference.localTypes.people' },
  { value: 'sky', storageValue: 'sky', labelKey: 'reference.localTypes.sky' },
  { value: 'water', storageValue: 'seawater', labelKey: 'reference.localTypes.water' },
  { value: 'city', storageValue: 'city', labelKey: 'reference.localTypes.city' },
  { value: 'fog', storageValue: 'mist', labelKey: 'reference.localTypes.fog' },
];

const SYSTEM_USAGE_LABELS_BY_ID = {
  roles: {
    primaryBuilding: { zhCN: '主体建筑', enUS: 'Primary Building' },
    atmosphere: { zhCN: '氛围参考', enUS: 'Atmosphere Reference' },
    material: { zhCN: '材质参考', enUS: 'Material Reference' },
    landscape: { zhCN: '景观参考', enUS: 'Landscape Reference' },
    lighting: { zhCN: '照明参考', enUS: 'Lighting Reference' },
    interior: { zhCN: '室内参考', enUS: 'Interior Reference' },
    local: { zhCN: '局部参考', enUS: 'Local Reference' },
    unassigned: { zhCN: '未设置参考用途', enUS: 'No Role Assigned' },
    undefined: { zhCN: '未定义用途', enUS: 'Undefined Role' },
  },
  localTypes: {
    vegetation: { zhCN: '植物', enUS: 'Vegetation' },
    people: { zhCN: '人物', enUS: 'People' },
    sky: { zhCN: '天空', enUS: 'Sky' },
    water: { zhCN: '海水', enUS: 'Water' },
    city: { zhCN: '城市', enUS: 'City' },
    fog: { zhCN: '雾气', enUS: 'Fog' },
    glass: { zhCN: '玻璃', enUS: 'Glass' },
    paving: { zhCN: '铺装', enUS: 'Paving' },
  },
  actions: {
    manualInput: { zhCN: '手动输入其他元素', enUS: 'Enter another element manually' },
  },
} as const;

/* Reserved labels that cannot be used as custom local-reference names, in either locale. */
export const SYSTEM_USAGE_LABELS = new Set(
  Object.values(SYSTEM_USAGE_LABELS_BY_ID)
    .flatMap((group) => Object.values(group))
    .flatMap((labels) => [labels.zhCN, labels.enUS])
    .map(normalizeUsageNameForCompare),
);

/* ─── Primary role options (shown in creation UI) ─── */
export const imageRoleOptions: ImageRoleOption[] = [
  {
    value: 'primary_building',
    label: '主体建筑',
    labelKey: 'reference.roles.primaryBuilding',
    description: '主体建筑',
    descriptionKey: 'reference.roles.primaryBuilding',
    detail: '作为主体建筑参考，AI 将优先参考建筑体块、轮廓比例、立面关系、建筑特征，以及外立面的主要材质与纹理表达。',
    detailKey: 'reference.descriptions.primaryBuilding',
    constraints: ['buildingMass', 'outlineRatio', 'facadeLanguage', 'windowRhythm', 'buildingFeature', 'mainMaterialTexture'],
    Icon: Building2,
    color: '#3B82F6',
  },
  {
    value: 'atmosphere_reference',
    label: '氛围参考',
    labelKey: 'reference.roles.atmosphere',
    description: '氛围参考',
    descriptionKey: 'reference.roles.atmosphere',
    detail: '作为氛围参考，AI 将主要参考整体时间段、天气状态、色调、光影情绪、曝光关系、对比度和真实度，不复制具体建筑内容。',
    detailKey: 'reference.descriptions.atmosphere',
    constraints: ['timeOfDay', 'weather', 'colorTone', 'lightShadowMood', 'exposure', 'contrast', 'realism', 'overallQuality'],
    Icon: Layers,
    color: '#8B5CF6',
  },
  {
    value: 'material_reference',
    label: '材质参考',
    labelKey: 'reference.roles.material',
    description: '材质参考',
    descriptionKey: 'reference.roles.material',
    detail: '作为材质参考，AI 将主要参考材质类型、表面纹理、反射关系、粗糙度和细节质感，不复制整体建筑体块。',
    detailKey: 'reference.descriptions.material',
    constraints: ['materialTexture', 'surfaceFinish', 'reflection', 'detailQuality'],
    Icon: SwatchBook,
    color: '#94A3B8',
  },
  {
    value: 'landscape_reference',
    label: '景观参考',
    labelKey: 'reference.roles.landscape',
    description: '景观参考',
    descriptionKey: 'reference.roles.landscape',
    detail: '作为景观参考，AI 将主要参考景观布局、植物配置、地形关系、铺装和室外空间氛围。',
    detailKey: 'reference.descriptions.landscape',
    constraints: ['landscapeLayout', 'planting', 'terrain', 'outdoorAtmosphere'],
    Icon: Mountain,
    color: '#22C55E',
  },
  {
    value: 'lighting_reference',
    label: '照明参考',
    labelKey: 'reference.roles.lighting',
    description: '照明参考',
    descriptionKey: 'reference.roles.lighting',
    detail: '作为照明参考，AI 将主要参考灯具语言、光色、照明强度、明暗层次和光线分布。',
    detailKey: 'reference.descriptions.lighting',
    constraints: ['fixtureLanguage', 'lightColor', 'lightIntensity', 'lightDistribution'],
    Icon: LampCeiling,
    color: '#F59E0B',
  },
  {
    value: 'interior_reference',
    label: '室内参考',
    labelKey: 'reference.roles.interior',
    description: '室内参考',
    descriptionKey: 'reference.roles.interior',
    detail: '作为室内参考，AI 将主要参考室内空间布局、家具陈设、室内材质和整体氛围。',
    detailKey: 'reference.descriptions.interior',
    constraints: ['interiorLayout', 'furniture', 'interiorMaterial', 'interiorMood'],
    Icon: Armchair,
    color: '#F97316',
  },
];

/* ─── Local reference sub-types ─── */
export interface LocalReferenceOption {
  value: LocalReferenceType;
  label: string;
  labelKey?: string;
  promptText: string;
  color: string;
}

export const localReferenceOptions: LocalReferenceOption[] = [
  {
    value: 'vegetation',
    label: '植物',
    labelKey: 'reference.localTypes.vegetation',
    promptText: '只参考该图中的植物类型、种植密度、景观层次和绿化氛围，不复制整体建筑体块与构图。',
    color: '#22C55E',
  },
  {
    value: 'people',
    label: '人物',
    labelKey: 'reference.localTypes.people',
    promptText: '只参考该图中的人物尺度、活动状态、人群密度和生活氛围，不复制整体建筑体块与构图。',
    color: '#F97316',
  },
  {
    value: 'sky',
    label: '天空',
    labelKey: 'reference.localTypes.sky',
    promptText: '只参考该图中的天空状态、云量、天气感和时间段氛围，不复制整体建筑体块与构图。',
    color: '#7DD3FC',
  },
  {
    value: 'seawater',
    label: '海水',
    labelKey: 'reference.localTypes.water',
    promptText: '只参考该图中的海水状态、反射关系、湿润感和滨海氛围，不复制整体建筑体块与构图。',
    color: '#06B6D4',
  },
  {
    value: 'city',
    label: '城市',
    labelKey: 'reference.localTypes.city',
    promptText: '只参考该图中的城市界面、街道关系、建筑背景和都市氛围，不复制整体建筑体块与构图。',
    color: '#64748B',
  },
  {
    value: 'glass',
    label: '玻璃',
    labelKey: 'reference.localTypes.glass',
    promptText: '参考该图中玻璃的通透度、反射、室内可见度、材质质感、光影关系和高级感，并自然融合到目标建筑画面中。',
    color: '#67E8F9',
  },
];

const legacyLocalReferenceOptions: LocalReferenceOption[] = [
  {
    value: 'mist',
    label: '雾气',
    labelKey: 'reference.localTypes.fog',
    promptText: '只参考该图中的雾气浓度、空气透视、远近虚实和朦胧氛围，不复制整体建筑体块与构图。',
    color: '#A78BFA',
  },
  {
    value: 'paving',
    label: '铺装',
    labelKey: 'reference.localTypes.paving',
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
  material_reference: '#94A3B8',
  landscape_reference: '#22C55E',
  lighting_reference: '#F59E0B',
  interior_reference: '#F97316',
  local_reference: '#14B8A6',
  custom_reference: '#EF4444',
  undefined_usage: '#9CA3AF',
  overall_reference: '#8B5CF6',
  plant_reference: '#22C55E',
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
  if (role === 'overall_reference') return 'atmosphere_reference';
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
  translate?: (key: string) => string,
): string | undefined {
  if (localRefLabel) return localRefLabel;
  if (role === 'custom_reference' && customRoleLabel) return customRoleLabel;
  const normalized = normalizeLocalReferenceType(localRefType);
  if (normalized && normalized !== 'custom') {
    const option = getLocalReferenceOption(normalized);
    return option?.labelKey && translate ? translate(option.labelKey) : option?.label;
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
  if (!label) return { ok: false as const, message: 'reference_custom_empty' as const };
  const normalized = normalizeUsageNameForCompare(label);
  if (SYSTEM_USAGE_LABELS.has(normalized)) {
    return { ok: false as const, message: 'reference_custom_reserved' as const };
  }
  if (existingLabels.some((existing) => normalizeUsageNameForCompare(existing) === normalized)) {
    return { ok: false as const, message: 'reference_custom_duplicate' as const };
  }
  return { ok: true as const, label };
}

type TranslationResolver = (key: string) => string;

export function getImageRoleOption(
  role: ImageRole | null | undefined,
  customLabel?: string,
  translate?: TranslationResolver,
) {
  if (!role) return null;
  const normalizedRole = getNormalizedRole(role) || role;
  let option = imageRoleOptions.find((item) => item.value === normalizedRole) || null;
  if (!option) {
    option = legacyImageRoleOptions[role] || null;
  }
  if (!option) return null;
  const label = normalizedRole === 'custom_reference' && customLabel?.trim()
    ? customLabel.trim()
    : option.labelKey && translate
      ? translate(option.labelKey)
      : option.label;
  return {
    ...option,
    label,
    description: option.descriptionKey && translate ? translate(option.descriptionKey) : option.description,
    detail: option.detailKey && translate ? translate(option.detailKey) : option.detail,
  };
}

export function getImageRoleLabel(
  role: ImageRole | null | undefined,
  customLabel?: string,
  localRefType?: LocalReferenceType,
  localRefLabel?: string,
  translate?: TranslationResolver,
): string {
  const normalizedRole = getNormalizedRole(role) || role;
  if (!normalizedRole) {
    return translate ? translate('reference.roles.unassigned') : '未设置参考用途';
  }
  const option = getImageRoleOption(normalizedRole, customLabel, translate);
  const baseLabel = normalizedRole === 'local_reference'
    ? translate
      ? translate('reference.roles.local')
      : '局部参考'
    : option?.label || (translate ? translate('reference.roles.unassigned') : '未设置参考用途');
  if (normalizedRole === 'local_reference') {
    const subLabel = getLocalReferenceLabel(role, localRefType, localRefLabel, customLabel, translate);
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
  translate?: TranslationResolver,
) {
  const normalizedRole = getNormalizedRole(role);
  const resolvedLocalReferenceType = normalizeLocalReferenceType(localRefType) ?? getLocalReferenceTypeFromRole(role);
  const resolvedLocalReferenceLabel = getLocalReferenceLabel(
    role,
    resolvedLocalReferenceType,
    localRefLabel,
    customLabel,
    translate,
  );

  return {
    normalizedRole,
    localReferenceType: resolvedLocalReferenceType,
    localReferenceLabel: resolvedLocalReferenceLabel,
    label: getImageRoleLabel(role, customLabel, resolvedLocalReferenceType, resolvedLocalReferenceLabel, translate),
    color: getImageRoleColor(role, resolvedLocalReferenceType),
  };
}
