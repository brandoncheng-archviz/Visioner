import type { Node } from '@xyflow/react';
import type { GenerationTask } from '../types/generation.types';
import { resolveNodeImage } from './resolveNodeImage';

export function isSelectableCanvasImageReferenceNode(node: Node | undefined, targetNodeId: string): node is Node {
  if (!node || node.id === targetNodeId || node.type !== 'image') return false;
  if (!resolveNodeImage(node.data)?.imageUrl) return false;
  const task = node.data.generationTask as GenerationTask | null | undefined;
  return task?.status !== 'running' && !node.data.isGenerating && !node.data.isProcessing;
}
