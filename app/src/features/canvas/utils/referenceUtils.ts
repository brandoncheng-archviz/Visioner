import type { ImageRole, ReferenceInfo, LocalReferenceType } from '../types/imageNode.types';
import { normalizeLocalReferenceType } from '../constants/imageUsages';

const UNDEFINED_USAGE_VALUES = new Set(['', 'unknown', 'unassigned', 'undefined', 'null', '未设置参考用途', '未定义用途']);
const LEGACY_CUSTOM_REFERENCE_LABEL = ['自定义', '用途...'].join('');

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
