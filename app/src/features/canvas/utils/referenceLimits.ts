import type { ImageRole, ReferenceInfo } from '../types/imageNode.types';
import { MAX_REFERENCE_IMAGES_PER_NODE } from '../constants/canvasConstants';

export type ReferenceLimitIssue = {
  titleKey: string;
  messageKey: string;
  values: Readonly<Record<string, number>>;
};

export const REFERENCE_LIMIT_MESSAGES = {
  maxReferences: {
    titleKey: 'reference.validation.limitReachedTitle',
    messageKey: 'reference.validation.limitReachedMessage',
    values: { max: MAX_REFERENCE_IMAGES_PER_NODE },
  },
  maxReferencesForGenerate: {
    titleKey: 'reference.validation.generateLimitTitle',
    messageKey: 'reference.validation.generateLimitMessage',
    values: { max: MAX_REFERENCE_IMAGES_PER_NODE },
  },
} satisfies Record<string, ReferenceLimitIssue>;

export function formatReferenceLimitIssue(
  issue: ReferenceLimitIssue,
  translate: (key: string, values: Readonly<Record<string, number>>) => string,
): string {
  return `${translate(issue.titleKey, issue.values)}\n${translate(issue.messageKey, issue.values)}`;
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
