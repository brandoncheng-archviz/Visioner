import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { mockQuickRender } from './mockQuickRender';
import { runQuickRenderGeneration } from './quickRenderGeneration';
import {
  buildQuickRenderCompletedOutput,
  buildQuickRenderFailedOutput,
  buildQuickRenderProcessingOutput,
} from './quickRenderResultGraph';
import {
  buildQuickRenderRequest,
  deriveQuickRenderViewState,
  getQuickRenderInteractionLocks,
} from './quickRenderRequest';
import type {
  QuickRenderConnectedImage,
  QuickRenderExteriorNodeData,
  QuickRenderGenerationTask,
  QuickRenderRequest,
  QuickRenderResult,
} from './quickRenderExterior.types';

const inputImage: QuickRenderConnectedImage = {
  id: 'input-1',
  sourceType: 'upload',
  imageUrl: '/assets/mock/generation-results/result-01.png',
  width: 1280,
  height: 720,
  role: 'primary_building',
  roleLabel: '主体建筑',
};

function createReadyData(): QuickRenderExteriorNodeData {
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
  request: QuickRenderRequest,
  taskId: string,
  nodes: Node[],
) {
  return buildQuickRenderProcessingOutput({
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
  request: QuickRenderRequest,
  result: QuickRenderResult,
) {
  return buildQuickRenderCompletedOutput({
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

describe('quick render generation entry', () => {
  it('creates a processing image and system edge before completing that same output node', async () => {
    let data = createReadyData();
    const sourceNode: Node = {
      id: 'quick-render-1',
      type: 'quickRenderExterior',
      position: { x: 100, y: 100 },
      data: { label: '快速渲染-室外 01' },
    };
    let nodes: Node[] = [sourceNode];
    let edges: Edge[] = [];
    const statuses: QuickRenderGenerationTask['status'][] = [];
    const taskId = 'task-success';
    const request = buildQuickRenderRequest(data);
    const output = createProcessingOutput(sourceNode, request, taskId, nodes);
    nodes = [...nodes, output.node];
    edges = [...edges, output.edge];

    expect(output.node.position).toEqual({ x: 690, y: 100 });
    expect(output.node.data).toEqual(expect.objectContaining({
      isProcessing: true,
      sourceWorkflow: expect.objectContaining({
        type: 'quickRenderExterior',
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
      kind: 'quickRenderOutput',
      sourceNodeType: 'quickRenderExterior',
    });

    const outcome = await runQuickRenderGeneration({
      request,
      taskId,
      execute: (nextRequest) => mockQuickRender(nextRequest, { taskId, delayMs: 0 }),
      isTaskActive: (completedTaskId) => completedTaskId === taskId,
      onTaskUpdate: (generationTask, lastResult) => {
        statuses.push(generationTask.status);
        data = { ...data, generationTask, ...(lastResult ? { lastResult } : {}) };
        if (generationTask.status === 'processing') {
          expect(deriveQuickRenderViewState(data)).toBe('PROCESSING');
          expect(Object.values(getQuickRenderInteractionLocks('PROCESSING')).every(Boolean)).toBe(true);
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
      currentResultSource: 'quickRender',
      currentImage: inputImage.imageUrl,
    }));
    expect(edges).toEqual([expect.objectContaining({
      source: sourceNode.id,
      target: output.node.id,
      data: {
        kind: 'quickRenderOutput',
        sourceNodeType: 'quickRenderExterior',
      },
    })]);
  });

  it('keeps failed output and creates a new offset output for a later retry', async () => {
    let data = createReadyData();
    const sourceNode: Node = {
      id: 'quick-render-2',
      type: 'quickRenderExterior',
      position: { x: 0, y: 0 },
      data: { label: '快速渲染-室外 02' },
    };
    let nodes: Node[] = [sourceNode];
    let edges: Edge[] = [];
    const failedTaskId = 'task-failed';
    const failedRequest = buildQuickRenderRequest(data);
    const failedOutput = createProcessingOutput(sourceNode, failedRequest, failedTaskId, nodes);
    nodes = [...nodes, failedOutput.node];
    edges = [...edges, failedOutput.edge];

    const failedOutcome = await runQuickRenderGeneration({
      request: failedRequest,
      taskId: failedTaskId,
      execute: (request) => mockQuickRender(request, { taskId: failedTaskId, delayMs: 0, outcome: 'failed' }),
      isTaskActive: (taskId) => taskId === failedTaskId,
      onTaskUpdate: (generationTask) => {
        data = { ...data, generationTask };
        if (generationTask.status !== 'failed') return;
        nodes = nodes.map((node) => node.id === failedOutput.node.id
          ? buildQuickRenderFailedOutput({
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
    const retryRequest = buildQuickRenderRequest(data);
    const retryOutput = createProcessingOutput(sourceNode, retryRequest, retryTaskId, nodes);
    nodes = [...nodes, retryOutput.node];
    edges = [...edges, retryOutput.edge];
    expect(retryOutput.node.position).toEqual({ x: 590, y: 96 });

    const retryOutcome = await runQuickRenderGeneration({
      request: retryRequest,
      taskId: retryTaskId,
      execute: (request) => mockQuickRender(request, { taskId: retryTaskId, delayMs: 0 }),
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
