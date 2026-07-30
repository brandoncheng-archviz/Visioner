import type { Edge, Node } from '@xyflow/react';
import { DEFAULT_MODEL_PARAMS } from '../../constants/canvasConstants';
import type { GenerationTask } from '../../types/generation.types';
import type { GeneratedImage, ResultSetBatch } from '../../types/history.types';
import { getRoleData } from '../../utils/referenceUtils';
import type { ExteriorRenderRequest, ExteriorRenderResult } from './exteriorRender.types';

const EXTERIOR_RENDER_OUTPUT_HORIZONTAL_GAP = 120;
const EXTERIOR_RENDER_OUTPUT_FALLBACK_WIDTH = 470;
const EXTERIOR_RENDER_OUTPUT_VERTICAL_OFFSET = 96;
const EXTERIOR_RENDER_OUTPUT_COLLISION_TOLERANCE = 80;

type BuildExteriorRenderProcessingOutputOptions = {
  sourceNode: Node;
  request: ExteriorRenderRequest;
  taskId: string;
  timestamp: number;
  label: string;
  existingNodes: Node[];
};

type BuildExteriorRenderCompletedOutputOptions = {
  outputNode: Node;
  sourceNodeId: string;
  request: ExteriorRenderRequest;
  result: ExteriorRenderResult;
  timestamp: number;
  createImageNodeData: (image: GeneratedImage, batch: ResultSetBatch) => Node['data'];
};

type BuildExteriorRenderFailedOutputOptions = {
  outputNode: Node;
  taskId: string;
  errorMessage: string;
  timestamp: number;
};

function createExteriorRenderInputRefs(request: ExteriorRenderRequest) {
  return request.inputImages.map((image) => ({
    imageId: image.id,
    imageUrl: image.imageUrl,
    usageKey: image.usage.key,
    usageLabel: image.usage.label,
    promptText: '',
  }));
}

function createExteriorRenderModelParams(request: ExteriorRenderRequest) {
  return {
    ...DEFAULT_MODEL_PARAMS,
    model: request.modelParams.model,
    ratio: request.modelParams.aspectRatio,
    resolution: request.modelParams.resolution,
    resolutionTier: request.modelParams.resolutionTier,
    requestedSize: request.modelParams.requestedSize,
    count: String(request.modelParams.count),
  };
}

function createExteriorRenderWorkflowSnapshot(sourceNode: Node, request: ExteriorRenderRequest) {
  return {
    sourceNodeTitle: String(sourceNode.data.label || sourceNode.data.title || ''),
    model: request.modelParams.model,
    aspectRatio: request.modelParams.aspectRatio,
    resolution: request.modelParams.resolution,
    requestedSize: request.modelParams.requestedSize,
    atmosphere: { ...request.atmosphere },
    renderChannels: Object.entries(request.renderChannels)
      .filter(([, channel]) => Boolean(channel))
      .map(([channelType]) => channelType),
    hasPrompt: request.prompt.trim().length > 0,
  };
}

function resolveExteriorRenderOutputPosition(sourceNode: Node, existingNodes: Node[]) {
  const sourceWidth = sourceNode.measured?.width || sourceNode.width || EXTERIOR_RENDER_OUTPUT_FALLBACK_WIDTH;
  const x = sourceNode.position.x + sourceWidth + EXTERIOR_RENDER_OUTPUT_HORIZONTAL_GAP;
  let y = sourceNode.position.y;

  while (existingNodes.some((node) => (
    Math.abs(node.position.x - x) < EXTERIOR_RENDER_OUTPUT_COLLISION_TOLERANCE
    && Math.abs(node.position.y - y) < EXTERIOR_RENDER_OUTPUT_COLLISION_TOLERANCE
  ))) {
    y += EXTERIOR_RENDER_OUTPUT_VERTICAL_OFFSET;
  }

  return { x, y };
}

export function buildExteriorRenderProcessingOutput({
  sourceNode,
  request,
  taskId,
  timestamp,
  label,
  existingNodes,
}: BuildExteriorRenderProcessingOutputOptions): { node: Node; edge: Edge } {
  const outputNodeId = `image-exterior-render-${taskId}`;
  const inputRefs = createExteriorRenderInputRefs(request);
  const modelParams = createExteriorRenderModelParams(request);
  const generationTask: GenerationTask = {
    taskId,
    sourceNodeId: sourceNode.id,
    status: 'running',
    progress: 0,
    prompt: request.prompt,
    inputRefs,
    result: null,
    errorMessage: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const node: Node = {
    id: outputNodeId,
    type: 'image',
    position: resolveExteriorRenderOutputPosition(sourceNode, existingNodes),
    data: {
      label,
      title: label,
      ...getRoleData(null),
      prompt: request.prompt,
      promptContent: [],
      lightPreview: null,
      selectedPresets: [],
      selectedStyleId: null,
      modelParams,
      resolutionTier: request.modelParams.resolutionTier,
      requestedSize: request.modelParams.requestedSize,
      generatedImages: [],
      generationTask,
      currentResultSet: null,
      currentResultId: null,
      references: [],
      referenceImages: [],
      referencesSignature: '[]',
      isProcessing: true,
      sourceWorkflow: {
        type: 'exteriorRender',
        sourceNodeId: sourceNode.id,
        snapshot: createExteriorRenderWorkflowSnapshot(sourceNode, request),
      },
    },
    selected: true,
  };
  const edge: Edge = {
    id: `exterior-render-output-${sourceNode.id}-${outputNodeId}`,
    source: sourceNode.id,
    target: outputNodeId,
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    data: {
      kind: 'exteriorRenderOutput',
      sourceNodeType: 'exteriorRender',
    },
    style: { stroke: '#555', strokeWidth: 1 },
  };

  return { node, edge };
}

export function buildExteriorRenderCompletedOutput({
  outputNode,
  sourceNodeId,
  request,
  result,
  timestamp,
  createImageNodeData,
}: BuildExteriorRenderCompletedOutputOptions): Node | null {
  const resultImage = result.images[0];
  if (!resultImage) return null;

  const image: GeneratedImage = {
    resultId: resultImage.id,
    imageUrl: resultImage.imageUrl,
    width: resultImage.width,
    height: resultImage.height,
    seed: resultImage.seed,
  };
  const batch: ResultSetBatch = {
    batchId: result.taskId,
    nodeId: sourceNodeId,
    images: result.images.map((item) => ({
      resultId: item.id,
      imageUrl: item.imageUrl,
      width: item.width,
      height: item.height,
      seed: item.seed,
    })),
    prompt: request.prompt,
    userPrompt: request.prompt,
    inputRefs: createExteriorRenderInputRefs(request),
    presetIds: [],
    styleId: null,
    modelParams: createExteriorRenderModelParams(request),
    createdAt: timestamp,
  };

  return {
    ...outputNode,
    data: {
      ...outputNode.data,
      ...createImageNodeData(image, batch),
      label: outputNode.data.label,
      title: outputNode.data.title,
      sourceWorkflow: {
        ...outputNode.data.sourceWorkflow as object,
        type: 'exteriorRender',
        sourceNodeId,
      },
      isProcessing: false,
      assetSource: 'generated',
      currentResultSource: 'exteriorRender',
      resolutionTier: request.modelParams.resolutionTier,
      requestedSize: request.modelParams.requestedSize,
      actualSize: {
        width: resultImage.width,
        height: resultImage.height,
      },
    },
  };
}

export function buildExteriorRenderFailedOutput({
  outputNode,
  taskId,
  errorMessage,
  timestamp,
}: BuildExteriorRenderFailedOutputOptions): Node {
  const currentTask = outputNode.data.generationTask as GenerationTask | null | undefined;
  const sourceWorkflow = outputNode.data.sourceWorkflow as { sourceNodeId?: string } | undefined;
  return {
    ...outputNode,
    data: {
      ...outputNode.data,
      isProcessing: false,
      generationTask: {
        ...(currentTask || {
          taskId,
          sourceNodeId: sourceWorkflow?.sourceNodeId || '',
          progress: 0,
          prompt: String(outputNode.data.prompt || ''),
          inputRefs: [],
          result: null,
          createdAt: timestamp,
        }),
        taskId,
        status: 'failed',
        errorMessage,
        updatedAt: timestamp,
      },
    },
  };
}
