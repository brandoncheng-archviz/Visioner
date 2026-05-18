import type { ImageRole, ReferenceInfo } from '../types/imageNode.types';

export function areReferencesEqual(a: ReferenceInfo, b: ReferenceInfo) {
  return (
    a.nodeId === b.nodeId &&
    a.index === b.index &&
    a.role === b.role &&
    a.roleLabel === b.roleLabel &&
    a.customRoleLabel === b.customRoleLabel &&
    a.imageUrl === b.imageUrl &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function areReferenceListsEqual(a: ReferenceInfo[], b: ReferenceInfo[]) {
  return a.length === b.length && a.every((reference, index) => areReferencesEqual(reference, b[index]));
}

export function getRoleData(role: ImageRole | null, customRoleLabel?: string) {
  const isPrimary = role === 'primary_building';
  return {
    role,
    customRoleLabel: role === 'custom_reference' ? customRoleLabel : undefined,
    preserveStructure: isPrimary,
    preserveCamera: isPrimary,
    preserveComposition: isPrimary,
  };
}
