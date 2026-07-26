import type { Edge, Node } from '@xyflow/react';
import { DEFAULT_MODEL_PARAMS } from '../../constants/canvasConstants';
import type { GenerationTask } from '../../types/generation.types';
import type { GeneratedImage, ResultSetBatch } from '../../types/history.types';
import { getRoleData } from '../../utils/referenceUtils';
import type { QuickRenderRequest, QuickRenderResult } from './quickRenderExterior.types';

const QUICK_RENDER_OUTPUT_HORIZONTAL_GAP = 120;
const QUICK_RENDER_OUTPUT_FALLBACK_WIDTH = 470;
const QUICK_RENDER_OUTPUT_VERTICAL_OFFSET = 96;
const QUICK_RENDER_OUTPUT_COLLISION_TOLERANCE = 80;

type BuildQuickRenderProcessingOutputOptions = {
  sourceNode: Node;
  request: QuickRenderRequest;
  taskId: string;
  timestamp: number;
  label: string;
  existingNodes: Node[];
};

type BuildQuickRenderCompletedOutputOptions = {
  outputNode: Node;
  sourceNodeId: string;
  request: QuickRenderRequest;
  result: QuickRenderResult;
  timestamp: number;
  createImageNodeData: (image: GeneratedImage, batch: ResultSetBatch) => Node['data'];
};

type BuildQuickRenderFailedOutputOptions = {
  outputNode: Node;
  taskId: string;
  errorMessage: string;
  timestamp: number;
};

function createQuickRenderInputRefs(request: QuickRenderRequest) {
  return request.inputImages.map((image) => ({
    imageId: image.id,
    imageUrl: image.imageUrl,
    usageKey: image.usage.key,
    usageLabel: image.usage.label,
    promptText: '',
  }));
}

function createQuickRenderModelParams(request: QuickRenderRequest) {
  return {
    ...DEFAULT_MODEL_PARAMS,
    model: request.modelParams.model,
    ratio: request.modelParams.aspectRatio,
    resolution: request.modelParams.resolution,
    count: String(request.modelParams.count),
  };
}

function resolveQuickRenderOutputPosition(sourceNode: Node, existingNodes: Node[]) {
  const sourceWidth = sourceNode.measured?.width || sourceNode.width || QUICK_RENDER_OUTPUT_FALLBACK_WIDTH;
  const x = sourceNode.position.x + sourceWidth + QUICK_RENDER_OUTPUT_HORIZONTAL_GAP;
  let y = sourceNode.position.y;

  while (existingNodes.some((node) => (
    Math.abs(node.position.x - x) < QUICK_RENDER_OUTPUT_COLLISION_TOLERANCE
    && Math.abs(node.position.y - y) < QUICK_RENDER_OUTPUT_COLLISION_TOLERANCE
  ))) {
    y += QUICK_RENDER_OUTPUT_VERTICAL_OFFSET;
  }

  return { x, y };
}

export function buildQuickRenderProcessingOutput({
  sourceNode,
  request,
  taskId,
  timestamp,
  label,
  existingNodes,
}: BuildQuickRenderProcessingOutputOptions): { node: Node; edge: Edge } {
  const outputNodeId = `image-quick-render-${taskId}`;
  const inputRefs = createQuickRenderInputRefs(request);
  const modelParams = createQuickRenderModelParams(request);
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
    position: resolveQuickRenderOutputPosition(sourceNode, existingNodes),
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
      generatedImages: [],
      generationTask,
      currentResultSet: null,
      currentResultId: null,
      references: [],
      referenceImages: [],
      referencesSignature: '[]',
      isProcessing: true,
      sourceWorkflow: {
        type: 'quickRenderExterior',
        sourceNodeId: sourceNode.id,
      },
    },
    selected: true,
  };
  const edge: Edge = {
    id: `quick-render-output-${sourceNode.id}-${outputNodeId}`,
    source: sourceNode.id,
    target: outputNodeId,
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    data: {
      kind: 'quickRenderOutput',
      sourceNodeType: 'quickRenderExterior',
    },
    style: { stroke: '#555', strokeWidth: 1 },
  };

  return { node, edge };
}

export function buildQuickRenderCompletedOutput({
  outputNode,
  sourceNodeId,
  request,
  result,
  timestamp,
  createImageNodeData,
}: BuildQuickRenderCompletedOutputOptions): Node | null {
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
    inputRefs: createQuickRenderInputRefs(request),
    presetIds: [],
    styleId: null,
    modelParams: createQuickRenderModelParams(request),
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
        type: 'quickRenderExterior',
        sourceNodeId,
      },
      isProcessing: false,
      assetSource: 'generated',
      currentResultSource: 'quickRender',
    },
  };
}

export function buildQuickRenderFailedOutput({
  outputNode,
  taskId,
  errorMessage,
  timestamp,
}: BuildQuickRenderFailedOutputOptions): Node {
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
