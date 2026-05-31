import type { ImageRole, ReferenceInfo } from '../types/imageNode.types';
import {
  MAX_LOCAL_REFERENCES_PER_NODE,
  MAX_REFERENCE_IMAGES_PER_NODE,
} from '../constants/canvasConstants';

const LOCAL_REFERENCE_ROLES: ImageRole[] = [
  'local_reference',
  'vegetation_reference',
  'plant_reference',
  'people_reference',
  'sky_reference',
  'custom_reference',
];

export type ReferenceLimitIssue = {
  title: string;
  message: string;
};

export const REFERENCE_LIMIT_MESSAGES = {
  maxReferences: {
    title: '参考图已达上限',
    message: `当前节点最多接入 ${MAX_REFERENCE_IMAGES_PER_NODE} 张图片，请删除部分引用后再添加。`,
  },
  maxLocalReferences: {
    title: '局部参考已达上限',
    message: `当前节点最多接入 ${MAX_LOCAL_REFERENCES_PER_NODE} 张局部参考，请删除部分局部参考后再添加。`,
  },
  maxReferencesForGenerate: {
    title: '参考图数量超过上限',
    message: `当前节点最多支持 ${MAX_REFERENCE_IMAGES_PER_NODE} 张引用图，请删除部分引用后再生成。`,
  },
} satisfies Record<string, ReferenceLimitIssue>;

export function formatReferenceLimitIssue(issue: ReferenceLimitIssue): string {
  return `${issue.title}\n${issue.message}`;
}

export function isLocalReferenceRole(role: ImageRole | null | undefined): boolean {
  return Boolean(role && LOCAL_REFERENCE_ROLES.includes(role));
}

export function countLocalReferences(references: Array<Pick<ReferenceInfo, 'role'>>): number {
  return references.filter((reference) => isLocalReferenceRole(reference.role)).length;
}

export function getReferenceLimitIssueForAdd(
  references: Array<Pick<ReferenceInfo, 'nodeId' | 'role'>>,
  nextRole?: ImageRole | null,
  replacingNodeId?: string,
): ReferenceLimitIssue | null {
  const currentReferences = references.filter((reference) => reference.nodeId !== replacingNodeId);

  if (!replacingNodeId && currentReferences.length >= MAX_REFERENCE_IMAGES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxReferences;
  }

  if (isLocalReferenceRole(nextRole) && countLocalReferences(currentReferences) >= MAX_LOCAL_REFERENCES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxLocalReferences;
  }

  return null;
}

export function getReferenceLimitIssueForGenerate(
  references: Array<Pick<ReferenceInfo, 'role'>>,
): ReferenceLimitIssue | null {
  if (references.length > MAX_REFERENCE_IMAGES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxReferencesForGenerate;
  }

  if (countLocalReferences(references) > MAX_LOCAL_REFERENCES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxLocalReferences;
  }

  return null;
}
