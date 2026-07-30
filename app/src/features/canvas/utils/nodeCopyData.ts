import type { Node } from '@xyflow/react';
import type { ExteriorRenderNodeData } from '../nodes/ExteriorRenderNode/exteriorRender.types';
import { createIdleExteriorRenderTask } from '../nodes/ExteriorRenderNode/exteriorRenderRequest';

export function prepareCanvasNodeDataForCopy(nodeType: string, data: Node['data']): Node['data'] {
  if (nodeType !== 'exteriorRender') return { ...data };

  const copyableData: ExteriorRenderNodeData = { ...(data as ExteriorRenderNodeData) };
  delete copyableData.generationTask;
  delete copyableData.lastResult;
  return {
    ...copyableData,
    generationTask: createIdleExteriorRenderTask(),
  };
}
