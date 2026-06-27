import type { ImageRole } from '../types/imageNode.types';
import { UNIQUE_USAGES } from '../constants/imageUsages';
import { formatReferenceLimitIssue, getReferenceLimitIssueForAdd } from '../utils/referenceLimits';
import { wouldCreateCycle } from '../utils/canvasGraphUtils';
import type {
  ConnectionRejectCode,
  ConnectionRuleEdge,
  ConnectionRuleNode,
  ConnectionValidationResult,
} from './connectionTypes';

export type ConnectionRuleMessages = {
  wrongPortDirection: string;
  selfConnect: string;
  cannotConnect: string;
  portTypeMismatch: string;
  cycleDetected: string;
  alreadyConnected: string;
  relightMaxOneImage: string;
  upscaleMaxOneImage: string;
  compareMaxTwoImages: string;
  usageConflict: (role: ImageRole) => string;
};

export type ValidateConnectionRulesInput = {
  nodes: ConnectionRuleNode[];
  edges: ConnectionRuleEdge[];
  sourceNodeId?: string | null;
  targetNodeId?: string | null;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  sourceHandleType?: 'source' | 'target' | null;
  targetHandleType?: 'source' | 'target' | null;
  sourceDataType?: string | null;
  targetDataType?: string | null;
  sourceNodeType?: string;
  targetNodeType?: string;
  sourceRole?: ImageRole | null;
  targetRole?: ImageRole | null;
  targetIncomingEdges?: ConnectionRuleEdge[];
  currentReferenceCount?: number;
  isTextWorkflowConnection?: boolean;
  isComposeTextTargetInput?: boolean;
  isComposeTextSourceInvalidTarget?: boolean;
  messages: ConnectionRuleMessages;
};

function reject(
  code: ConnectionRejectCode,
  reason: string,
  meta?: Record<string, unknown>,
): ConnectionValidationResult {
  return { valid: false, code, reason, meta };
}

export function validateConnectionRules(input: ValidateConnectionRulesInput): ConnectionValidationResult {
  const {
    nodes,
    edges,
    sourceNodeId,
    targetNodeId,
    sourceHandle,
    targetHandle,
    sourceHandleType,
    targetHandleType,
    sourceDataType,
    targetDataType,
    sourceNodeType,
    targetNodeType,
    sourceRole,
    targetIncomingEdges,
    currentReferenceCount,
    isTextWorkflowConnection = false,
    isComposeTextTargetInput = false,
    isComposeTextSourceInvalidTarget = false,
    messages,
  } = input;

  if (!sourceNodeId || !targetNodeId || !sourceHandle || !targetHandle) {
    return reject('same_handle_side', messages.wrongPortDirection);
  }

  if (sourceHandleType && targetHandleType && sourceHandleType === targetHandleType) {
    return reject('same_handle_side', messages.wrongPortDirection, {
      sourceHandleType,
      targetHandleType,
    });
  }

  if (sourceNodeId === targetNodeId) {
    return reject('same_node', messages.selfConnect);
  }

  if (isComposeTextTargetInput || isComposeTextSourceInvalidTarget) {
    return reject('invalid_text_mode', messages.cannotConnect);
  }

  if (sourceDataType !== targetDataType && !isTextWorkflowConnection) {
    return reject('data_type_mismatch', messages.portTypeMismatch, {
      sourceDataType,
      targetDataType,
    });
  }

  if (wouldCreateCycle(sourceNodeId, targetNodeId, edges)) {
    return reject('cycle', messages.cycleDetected);
  }

  const alreadyConnected = edges.some((edge) => edge.source === sourceNodeId && edge.target === targetNodeId);
  if (alreadyConnected) {
    return reject('duplicate', messages.alreadyConnected);
  }

  if (targetNodeType === 'relight' || targetNodeType === 'upscale' || targetNodeType === 'compare') {
    const targetInputEdges = targetIncomingEdges ?? edges.filter((edge) => edge.target === targetNodeId);
    const inputLimit = targetNodeType === 'compare' ? 2 : 1;
    if (targetInputEdges.length >= inputLimit) {
      const code = targetNodeType === 'relight'
        ? 'relight_input_limit'
        : targetNodeType === 'upscale'
          ? 'upscale_input_limit'
          : 'compare_input_limit';
      const reason = targetNodeType === 'relight'
        ? messages.relightMaxOneImage
        : targetNodeType === 'upscale'
          ? messages.upscaleMaxOneImage
          : messages.compareMaxTwoImages;
      return reject(code, reason, {
        currentInputCount: targetInputEdges.length,
        maxInputCount: inputLimit,
      });
    }
  }

  if (targetNodeType === 'image' && sourceNodeType === 'image') {
    const targetInputEdges = targetIncomingEdges ?? edges.filter((edge) => edge.target === targetNodeId);
    const targetImageInputEdges = targetInputEdges.filter((edge) => {
      return nodes.find((node) => node.id === edge.source)?.type === 'image';
    });
    const targetReferences = targetImageInputEdges.map((edge) => {
      const refNode = nodes.find((node) => node.id === edge.source);
      return {
        nodeId: edge.source,
        role: edge.data?.role ?? refNode?.data?.role ?? null,
      };
    });
    const limitIssue = getReferenceLimitIssueForAdd(targetReferences, sourceRole);
    if (limitIssue) {
      return reject('reference_limit', formatReferenceLimitIssue(limitIssue), {
        limitIssue,
        currentReferenceCount: currentReferenceCount ?? targetReferences.length,
      });
    }
  }

  if (sourceRole && UNIQUE_USAGES.includes(sourceRole)) {
    const targetInputEdges = targetIncomingEdges ?? edges.filter((edge) => edge.target === targetNodeId);
    const hasSameRole = targetInputEdges.some((edge) => {
      const refNode = nodes.find((node) => node.id === edge.source);
      const effectiveRole = edge.data?.role ?? refNode?.data?.role ?? null;
      return effectiveRole === sourceRole;
    });
    if (hasSameRole) {
      return reject('unique_reference_role_conflict', messages.usageConflict(sourceRole), {
        role: sourceRole,
      });
    }
  }

  return { valid: true };
}
