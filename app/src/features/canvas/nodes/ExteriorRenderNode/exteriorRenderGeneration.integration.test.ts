import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { mockExteriorRender } from './mockExteriorRender';
import { runExteriorRenderGeneration } from './exteriorRenderGeneration';
import {
  buildExteriorRenderCompletedOutput,
  buildExteriorRenderFailedOutput,
  buildExteriorRenderProcessingOutput,
} from './exteriorRenderResultGraph';
import {
  buildExteriorRenderRequest,
  deriveExteriorRenderViewState,
  getExteriorRenderInteractionLocks,
} from './exteriorRenderRequest';
import type {
  ExteriorRenderConnectedImage,
  ExteriorRenderNodeData,
  ExteriorRenderGenerationTask,
  ExteriorRenderRequest,
  ExteriorRenderResult,
} from './exteriorRender.types';

const inputImage: ExteriorRenderConnectedImage = {
  id: 'input-1',
  sourceType: 'upload',
  imageUrl: '/assets/mock/generation-results/result-01.png',
  width: 1280,
  height: 720,
  role: 'primary_building',
  roleLabel: '主体建筑',
};

function createReadyData(): ExteriorRenderNodeData {
  return {
    connectedImages: [inputImage],
    renderChannels: { channels: [] },
    atmosphere: {},
    prompt: '',
    modelParams: { model: 'Nano Banana 2', aspectRatio: '16:9', resolution: '2K', count: 1 },
    generationTask: { taskId: null, status: 'idle', errorCode: null, startedAt: null, completedAt: null },
  };
}

function createProcessingOutput(
  sourceNode: Node,
  request: ExteriorRenderRequest,
  taskId: string,
  nodes: Node[],
) {
  return buildExteriorRenderProcessingOutput({
    sourceNode,
    request,
    taskId,
    timestamp: 100,
    label: `图片 ${String(nodes.length).padStart(2, '0')}`,
    existingNodes: nodes,
  });
}

function completeOutput(
  outputNode: Node,
  sourceNodeId: string,
  request: ExteriorRenderRequest,
  result: ExteriorRenderResult,
) {
  return buildExteriorRenderCompletedOutput({
    outputNode,
    sourceNodeId,
    request,
    result,
    timestamp: 200,
    createImageNodeData: (image, batch) => ({
      image: image.imageUrl,
      currentImage: image.imageUrl,
      generatedImages: [{ resultId: image.resultId }],
      generationTask: { taskId: batch.batchId, status: 'success' },
    }),
  });
}

describe('exterior render generation entry', () => {
  it('creates a processing image and system edge before completing that same output node', async () => {
    let data = createReadyData();
    const sourceNode: Node = {
      id: 'exterior-render-1',
      type: 'exteriorRender',
      position: { x: 100, y: 100 },
      data: { label: '室外渲染 01' },
    };
    let nodes: Node[] = [sourceNode];
    let edges: Edge[] = [];
    const statuses: ExteriorRenderGenerationTask['status'][] = [];
    const taskId = 'task-success';
    const request = buildExteriorRenderRequest(data);
    const output = createProcessingOutput(sourceNode, request, taskId, nodes);
    nodes = [...nodes, output.node];
    edges = [...edges, output.edge];

    expect(output.node.position).toEqual({ x: 690, y: 100 });
    expect(output.node.data).toEqual(expect.objectContaining({
      isProcessing: true,
      resolutionTier: '2K',
      requestedSize: { width: 2048, height: 1152 },
      sourceWorkflow: expect.objectContaining({
        type: 'exteriorRender',
        sourceNodeId: sourceNode.id,
        snapshot: expect.objectContaining({
          model: 'Nano Banana 2',
          aspectRatio: '16:9',
          resolution: '2K',
          hasPrompt: false,
        }),
      }),
      generationTask: expect.objectContaining({ taskId, status: 'running' }),
    }));
    expect(output.edge.data).toEqual({
      kind: 'exteriorRenderOutput',
      sourceNodeType: 'exteriorRender',
    });

    const outcome = await runExteriorRenderGeneration({
      request,
      taskId,
      execute: (nextRequest) => mockExteriorRender(nextRequest, { taskId, delayMs: 0 }),
      isTaskActive: (completedTaskId) => completedTaskId === taskId,
      onTaskUpdate: (generationTask, lastResult) => {
        statuses.push(generationTask.status);
        data = { ...data, generationTask, ...(lastResult ? { lastResult } : {}) };
        if (generationTask.status === 'processing') {
          expect(deriveExteriorRenderViewState(data)).toBe('PROCESSING');
          expect(Object.values(getExteriorRenderInteractionLocks('PROCESSING')).every(Boolean)).toBe(true);
        }
      },
      onResult: (nextRequest, result) => {
        const completed = completeOutput(output.node, sourceNode.id, nextRequest, result);
        if (!completed) return false;
        nodes = nodes.map((node) => node.id === output.node.id ? completed : node);
        return true;
      },
    });

    expect(outcome).toBe('success');
    expect(statuses).toEqual(['processing', 'success', 'idle']);
    expect(nodes).toHaveLength(2);
    expect(nodes[1]?.id).toBe(output.node.id);
    expect(nodes[1]?.data).toEqual(expect.objectContaining({
      isProcessing: false,
      assetSource: 'generated',
      currentResultSource: 'exteriorRender',
      currentImage: inputImage.imageUrl,
    }));
    expect(edges).toEqual([expect.objectContaining({
      source: sourceNode.id,
      target: output.node.id,
      data: {
        kind: 'exteriorRenderOutput',
        sourceNodeType: 'exteriorRender',
      },
    })]);
  });

  it('stores a 5000+ returned image as actualSize without replacing the 4K request size', () => {
    const sourceNode: Node = {
      id: 'exterior-render-4k',
      type: 'exteriorRender',
      position: { x: 0, y: 0 },
      data: { label: '室外渲染 4K' },
    };
    const request = buildExteriorRenderRequest({
      ...createReadyData(),
      modelParams: {
        model: 'Nano Banana 2',
        aspectRatio: '16:9',
        resolution: '4K',
        count: 1,
      },
    });
    const output = createProcessingOutput(sourceNode, request, 'task-4k', [sourceNode]);
    const completed = completeOutput(output.node, sourceNode.id, request, {
      taskId: 'task-4k',
      status: 'success',
      images: [{
        id: 'result-4k',
        imageUrl: '/original-5120.png',
        width: 5120,
        height: 2880,
        seed: 42,
      }],
      metadata: {
        model: 'Nano Banana 2',
        aspectRatio: '16:9',
        resolution: '4K',
      },
    });

    expect(output.node.data).toEqual(expect.objectContaining({
      requestedSize: { width: 3840, height: 2160 },
      resolutionTier: '4K',
    }));
    expect(completed?.data).toEqual(expect.objectContaining({
      requestedSize: { width: 3840, height: 2160 },
      actualSize: { width: 5120, height: 2880 },
      currentImage: '/original-5120.png',
    }));
  });

  it('keeps failed output and creates a new offset output for a later retry', async () => {
    let data = createReadyData();
    const sourceNode: Node = {
      id: 'exterior-render-2',
      type: 'exteriorRender',
      position: { x: 0, y: 0 },
      data: { label: '室外渲染 02' },
    };
    let nodes: Node[] = [sourceNode];
    let edges: Edge[] = [];
    const failedTaskId = 'task-failed';
    const failedRequest = buildExteriorRenderRequest(data);
    const failedOutput = createProcessingOutput(sourceNode, failedRequest, failedTaskId, nodes);
    nodes = [...nodes, failedOutput.node];
    edges = [...edges, failedOutput.edge];

    const failedOutcome = await runExteriorRenderGeneration({
      request: failedRequest,
      taskId: failedTaskId,
      execute: (request) => mockExteriorRender(request, { taskId: failedTaskId, delayMs: 0, outcome: 'failed' }),
      isTaskActive: (taskId) => taskId === failedTaskId,
      onTaskUpdate: (generationTask) => {
        data = { ...data, generationTask };
        if (generationTask.status !== 'failed') return;
        nodes = nodes.map((node) => node.id === failedOutput.node.id
          ? buildExteriorRenderFailedOutput({
            outputNode: node,
            taskId: failedTaskId,
            errorMessage: 'failed',
            timestamp: 200,
          })
          : node);
      },
      onResult: () => false,
    });

    expect(failedOutcome).toBe('failed');
    expect(nodes[1]?.data).toEqual(expect.objectContaining({
      isProcessing: false,
      generationTask: expect.objectContaining({ status: 'failed' }),
    }));

    data = { ...data, prompt: 'retry with latest prompt' };
    const retryTaskId = 'task-retry';
    const retryRequest = buildExteriorRenderRequest(data);
    const retryOutput = createProcessingOutput(sourceNode, retryRequest, retryTaskId, nodes);
    nodes = [...nodes, retryOutput.node];
    edges = [...edges, retryOutput.edge];
    expect(retryOutput.node.position).toEqual({ x: 590, y: 96 });

    const retryOutcome = await runExteriorRenderGeneration({
      request: retryRequest,
      taskId: retryTaskId,
      execute: (request) => mockExteriorRender(request, { taskId: retryTaskId, delayMs: 0 }),
      isTaskActive: (taskId) => taskId === retryTaskId,
      onTaskUpdate: (generationTask, lastResult) => {
        data = { ...data, generationTask, ...(lastResult ? { lastResult } : {}) };
      },
      onResult: (request, result) => {
        const completed = completeOutput(retryOutput.node, sourceNode.id, request, result);
        if (!completed) return false;
        nodes = nodes.map((node) => node.id === retryOutput.node.id ? completed : node);
        return true;
      },
    });

    expect(retryOutcome).toBe('success');
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(2);
    expect(nodes[1]?.data.generationTask).toEqual(expect.objectContaining({ status: 'failed' }));
    expect(nodes[2]?.data).toEqual(expect.objectContaining({
      isProcessing: false,
      currentImage: inputImage.imageUrl,
    }));
  });
});
