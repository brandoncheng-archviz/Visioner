import type { ImageRole, ReferenceInfo, LocalReferenceType } from '../types/imageNode.types';
import { normalizeLocalReferenceType } from '../constants/imageUsages';

const UNDEFINED_USAGE_VALUES = new Set(['', 'unknown', 'unassigned', 'undefined', 'null', '未设置参考用途', '未定义用途']);
const LEGACY_CUSTOM_REFERENCE_LABEL = ['自定义', '用途...'].join('');
const LOCAL_REFERENCE_SORT_ORDER: LocalReferenceType[] = [
  'vegetation',
  'people',
  'sky',
  'seawater',
  'city',
  'mist',
  'custom',
];

function isDefinedUsageValue(value: unknown) {
  if (typeof value !== 'string') return value !== undefined && value !== null;
  return !UNDEFINED_USAGE_VALUES.has(value.trim().toLowerCase());
}

export function hasDefinedUsage(reference: ReferenceInfo) {
  if (reference.role === 'undefined_usage') return true;
  if (!isDefinedUsageValue(reference.role)) return false;
  if (reference.role === 'local_reference') {
    return isDefinedUsageValue(reference.localReferenceType) || isDefinedUsageValue(reference.localReferenceLabel);
  }
  if (reference.role === 'custom_reference') {
    return isDefinedUsageValue(reference.customRoleLabel) && reference.customRoleLabel !== LEGACY_CUSTOM_REFERENCE_LABEL;
  }
  return isDefinedUsageValue(reference.roleLabel);
}

export function areReferencesEqual(a: ReferenceInfo, b: ReferenceInfo) {
  return (
    a.nodeId === b.nodeId &&
    a.index === b.index &&
    a.role === b.role &&
    a.roleLabel === b.roleLabel &&
    a.customRoleLabel === b.customRoleLabel &&
    a.localReferenceType === b.localReferenceType &&
    a.localReferenceLabel === b.localReferenceLabel &&
    a.imageUrl === b.imageUrl &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function areReferenceListsEqual(a: ReferenceInfo[], b: ReferenceInfo[]) {
  return a.length === b.length && a.every((reference, index) => areReferencesEqual(reference, b[index]));
}

export function getReferenceUsageSortRank(reference: Pick<ReferenceInfo, 'role' | 'roleLabel' | 'localReferenceType' | 'localReferenceLabel' | 'customRoleLabel'>) {
  const normalizedLocalReferenceType = normalizeLocalReferenceType(reference.localReferenceType);
  const roleLabel = reference.roleLabel || '';

  if (reference.role === 'primary_building' || roleLabel.includes('主体建筑')) {
    return { group: 0, local: 0 };
  }
  if (reference.role === 'atmosphere_reference' || reference.role === 'overall_reference' || roleLabel.includes('氛围')) {
    return { group: 1, local: 0 };
  }
  if (
    reference.role === 'local_reference' ||
    reference.role === 'custom_reference' ||
    reference.role === 'vegetation_reference' ||
    reference.role === 'plant_reference' ||
    reference.role === 'people_reference' ||
    reference.role === 'sky_reference' ||
    reference.role === 'material_reference' ||
    reference.role === 'lighting_reference' ||
    normalizedLocalReferenceType ||
    reference.localReferenceLabel ||
    reference.customRoleLabel
  ) {
    const localIndex = normalizedLocalReferenceType
      ? LOCAL_REFERENCE_SORT_ORDER.indexOf(normalizedLocalReferenceType)
      : LOCAL_REFERENCE_SORT_ORDER.length;
    return { group: 2, local: localIndex >= 0 ? localIndex : LOCAL_REFERENCE_SORT_ORDER.length };
  }
  return { group: 3, local: 0 };
}

export function sortReferencesByUsage(references: ReferenceInfo[], preferredOrder?: string[]) {
  const orderIndex = new Map((preferredOrder ?? references.map((reference) => reference.nodeId)).map((nodeId, index) => [nodeId, index]));
  return [...references].sort((a, b) => {
    const aRank = getReferenceUsageSortRank(a);
    const bRank = getReferenceUsageSortRank(b);
    if (aRank.group !== bRank.group) return aRank.group - bRank.group;
    if (aRank.local !== bRank.local) return aRank.local - bRank.local;
    return (orderIndex.get(a.nodeId) ?? 0) - (orderIndex.get(b.nodeId) ?? 0);
  });
}

export function getRoleData(role: ImageRole | null, customRoleLabel?: string, localReferenceType?: LocalReferenceType, localReferenceLabel?: string) {
  const isPrimary = role === 'primary_building';
  const normalizedLocalReferenceType = normalizeLocalReferenceType(localReferenceType);
  return {
    role,
    customRoleLabel: role === 'custom_reference' ? customRoleLabel : undefined,
    localReferenceType: role === 'local_reference' ? normalizedLocalReferenceType : undefined,
    localReferenceLabel: role === 'local_reference' ? localReferenceLabel : undefined,
    preserveStructure: isPrimary,
    preserveCamera: isPrimary,
    preserveComposition: isPrimary,
  };
}
