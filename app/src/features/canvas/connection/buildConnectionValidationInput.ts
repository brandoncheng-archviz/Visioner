import type { ImageRole } from '../types/imageNode.types';
import {
  isComposeTextNode,
  isComposeTextOutputTarget,
  isTextWorkflowConnection,
} from '../utils/textNodeUtils';
import type {
  ConnectionRuleEdge,
  ConnectionRuleNode,
} from './connectionTypes';
import type {
  ConnectionRuleMessages,
  ValidateConnectionRulesInput,
} from './connectionRules';

type ConnectionHandleSnapshot = {
  id: string;
  type: 'source' | 'target' | null;
  dataType: string | null;
};

export type BuildConnectionValidationInputParams = {
  nodes: ConnectionRuleNode[];
  edges: ConnectionRuleEdge[];
  sourceNodeId: string;
  targetNodeId: string;
  sourceHandle: ConnectionHandleSnapshot;
  targetHandle: ConnectionHandleSnapshot;
  messages: ConnectionRuleMessages;
};

function getNodeRole(node: ConnectionRuleNode | undefined): ImageRole | null {
  return (node?.data?.role as ImageRole | null | undefined) ?? null;
}

export function buildConnectionValidationInput({
  nodes,
  edges,
  sourceNodeId,
  targetNodeId,
  sourceHandle,
  targetHandle,
  messages,
}: BuildConnectionValidationInputParams): ValidateConnectionRulesInput {
  const sourceNode = nodes.find((node) => node.id === sourceNodeId);
  const targetNode = nodes.find((node) => node.id === targetNodeId);
  const sourceRole = getNodeRole(sourceNode);
  const targetRole = getNodeRole(targetNode);
  const targetIncomingEdges = edges.filter((edge) => edge.target === targetNodeId);
  const currentReferenceCount = targetIncomingEdges.filter((edge) =>
    nodes.find((node) => node.id === edge.source)?.type === 'image',
  ).length;
  const isComposeTextSource =
    sourceNode?.type === 'text' && isComposeTextNode(sourceNode.data);
  const isComposeTextOutputConnection =
    isComposeTextSource && isComposeTextOutputTarget(targetNode?.type);

  return {
    nodes,
    edges,
    sourceNodeId,
    targetNodeId,
    sourceHandle: sourceHandle.id,
    targetHandle: targetHandle.id,
    sourceHandleType: sourceHandle.type,
    targetHandleType: targetHandle.type,
    sourceDataType: sourceHandle.dataType,
    targetDataType: targetHandle.dataType,
    sourceNodeType: sourceNode?.type,
    targetNodeType: targetNode?.type,
    sourceRole,
    targetRole,
    targetIncomingEdges,
    currentReferenceCount,
    isTextWorkflowConnection: isTextWorkflowConnection(sourceNode?.type, targetNode?.type)
      || isComposeTextOutputConnection,
    isComposeTextTargetInput: targetNode?.type === 'text' && isComposeTextNode(targetNode.data),
    isComposeTextSourceInvalidTarget: isComposeTextSource && !isComposeTextOutputConnection,
    messages,
  };
}
