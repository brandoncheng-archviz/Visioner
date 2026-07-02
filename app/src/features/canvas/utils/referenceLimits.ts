import type { ImageRole, ReferenceInfo } from '../types/imageNode.types';
import { MAX_REFERENCE_IMAGES_PER_NODE } from '../constants/canvasConstants';

export type ReferenceLimitIssue = {
  title: string;
  message: string;
};

export const REFERENCE_LIMIT_MESSAGES = {
  maxReferences: {
    title: '参考图已达上限',
    message: `当前节点最多接入 ${MAX_REFERENCE_IMAGES_PER_NODE} 张图片，请删除部分引用后再添加。`,
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
  return role === 'local_reference' || role === 'custom_reference' || role === 'vegetation_reference' || role === 'plant_reference' || role === 'people_reference' || role === 'sky_reference';
}

export function countLocalReferences(references: Array<Pick<ReferenceInfo, 'role'>>): number {
  return references.filter((reference) => isLocalReferenceRole(reference.role)).length;
}

export function getReferenceLimitIssueForAdd(
  references: Array<Pick<ReferenceInfo, 'nodeId' | 'role'>>,
  _nextRole?: ImageRole | null,
  replacingNodeId?: string,
): ReferenceLimitIssue | null {
  const currentReferences = references.filter((reference) => reference.nodeId !== replacingNodeId);

  if (!replacingNodeId && currentReferences.length >= MAX_REFERENCE_IMAGES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxReferences;
  }

  return null;
}

export function getReferenceLimitIssueForGenerate(
  references: Array<Pick<ReferenceInfo, 'role'>>,
): ReferenceLimitIssue | null {
  if (references.length > MAX_REFERENCE_IMAGES_PER_NODE) {
    return REFERENCE_LIMIT_MESSAGES.maxReferencesForGenerate;
  }

  return null;
}
