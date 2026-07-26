import type { Node } from '@xyflow/react';
import type { QuickRenderExteriorNodeData } from '../nodes/QuickRenderExteriorNode/quickRenderExterior.types';
import { createIdleQuickRenderTask } from '../nodes/QuickRenderExteriorNode/quickRenderRequest';

export function prepareCanvasNodeDataForCopy(nodeType: string, data: Node['data']): Node['data'] {
  if (nodeType !== 'quickRenderExterior') return { ...data };

  const copyableData: QuickRenderExteriorNodeData = { ...(data as QuickRenderExteriorNodeData) };
  delete copyableData.generationTask;
  delete copyableData.lastResult;
  return {
    ...copyableData,
    generationTask: createIdleQuickRenderTask(),
  };
}
