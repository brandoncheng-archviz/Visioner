/* ─── Node Editor Type System & DAG Execution Engine ─── */

import type { Edge } from '@xyflow/react';

/* ─── Port Types & Colors ─── */

export type PortType = 'IMAGE' | 'PROMPT' | 'LATENT' | 'MODEL' | 'NUMBER';

export const PORT_COLORS: Record<PortType, string> = {
  IMAGE: '#22d3ee',
  PROMPT: '#a855f7',
  LATENT: '#f59e0b',
  MODEL: '#3b82f6',
  NUMBER: '#22c55e',
};

export const PORT_LABELS: Record<PortType, string> = {
  IMAGE: '图片',
  PROMPT: '提示词',
  LATENT: '潜空间',
  MODEL: '模型',
  NUMBER: '数值',
};

/* ─── Node Port Configuration ───
 * Each node type declares its input / output ports.
 * Currently single-port per side, but structured for multi-port expansion.
 */

export interface PortDef {
  id: string;
  type: PortType;
  label: string;
}

export interface NodePortConfig {
  inputs: PortDef[];
  outputs: PortDef[];
}

export const NODE_PORT_CONFIG: Record<string, NodePortConfig> = {
  text: {
    inputs: [{ id: 'input-1', type: 'PROMPT', label: '提示词' }],
    outputs: [{ id: 'output-1', type: 'PROMPT', label: '文本' }],
  },
  image: {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '图片' }],
    outputs: [{ id: 'output-1', type: 'IMAGE', label: '图片' }],
  },
  video: {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '图片' }],
    outputs: [{ id: 'output-1', type: 'IMAGE', label: '视频' }],
  },
  audio: {
    inputs: [{ id: 'input-1', type: 'MODEL', label: '音频' }],
    outputs: [{ id: 'output-1', type: 'MODEL', label: '音频' }],
  },
  script: {
    inputs: [{ id: 'input-1', type: 'NUMBER', label: '脚本' }],
    outputs: [{ id: 'output-1', type: 'NUMBER', label: '脚本' }],
  },
  'video-merge': {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '视频' }],
    outputs: [{ id: 'output-1', type: 'IMAGE', label: '合成视频' }],
  },
  compare: {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '图片' }],
    outputs: [],
  },
  sunSky: {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '图片' }],
    outputs: [{ id: 'output-1', type: 'IMAGE', label: '光照结果' }],
  },
  quickRenderExterior: {
    inputs: [{ id: 'input-1', type: 'IMAGE', label: '图片' }],
    outputs: [{ id: 'output-1', type: 'IMAGE', label: '渲染结果' }],
  },
};

/** Infer port type from node type + handle position. */
export function getNodePortType(
  nodeType: string | undefined,
  handleId: string | null | undefined,
  handlePos: 'source' | 'target'
): PortType | null {
  if (!nodeType) return null;
  const cfg = NODE_PORT_CONFIG[nodeType];
  if (!cfg) return null;

  const ports = handlePos === 'source' ? cfg.outputs : cfg.inputs;
  const port = ports.find((p) => p.id === (handleId || (handlePos === 'source' ? 'output-1' : 'input-1')));
  return port?.type ?? null;
}

/** Get the default (first) port definition for a node side. */
export function getDefaultPort(nodeType: string | undefined, handlePos: 'source' | 'target'): PortDef | null {
  if (!nodeType) return null;
  const cfg = NODE_PORT_CONFIG[nodeType];
  if (!cfg) return null;
  const ports = handlePos === 'source' ? cfg.outputs : cfg.inputs;
  return ports[0] ?? null;
}

/* ─── Cycle Detection ───
 * Returns true if adding an edge source→target would create a directed cycle.
 */

export function wouldFormCycle(source: string, target: string, edges: Edge[]): boolean {
  // DFS from target — can we reach source?
  const adj = new Map<string, string[]>();
  edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  });

  const visited = new Set<string>();
  const stack = [target];

  while (stack.length > 0) {
    const curr = stack.pop()!;
    if (curr === source) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      if (!visited.has(n)) stack.push(n);
    }
  }
  return false;
}

/* ─── DAG Topological Sort ───
 * Returns node IDs in topological order.
 */

export function topologicalSort(nodes: Array<{ id: string }>, edges: Edge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach((n) => inDegree.set(n.id, 0));
  edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const result: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.push(curr);
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      const newDeg = (inDegree.get(n) || 0) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  return result;
}

/* ─── Execution Batches ───
 * Groups node IDs by dependency depth so each batch can run in parallel.
 */

export function getExecutionBatches(nodes: Array<{ id: string }>, edges: Edge[]): string[][] {
  const depth = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  nodes.forEach((n) => {
    depth.set(n.id, 0);
    inDegree.set(n.id, 0);
  });

  edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  // Kahn's algorithm with depth tracking
  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth.get(curr) || 0;
    const neighbors = adj.get(curr) || [];
    for (const n of neighbors) {
      depth.set(n, Math.max(depth.get(n) || 0, currDepth + 1));
      const newDeg = (inDegree.get(n) || 0) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const batches: string[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const batch: string[] = [];
    depth.forEach((dep, id) => { if (dep === d) batch.push(id); });
    if (batch.length > 0) batches.push(batch);
  }
  return batches;
}

/* ─── Build Node Inputs ───
 * Collects all upstream outputData for a given node.
 * Returns a map: { sourcePortId -> upstreamOutput }
 */

export function buildNodeInputs(
  nodeId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  nodes: Array<{ id: string; data?: any }>,
  edges: Edge[],
  executionState: Record<string, NodeExecutionState>,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  const incoming = edges.filter((e) => e.target === nodeId);

  for (const edge of incoming) {
    const sourceState = executionState[edge.source];
    if (sourceState?.outputData !== undefined) {
      const key = edge.targetHandle || 'input-1';
      inputs[key] = sourceState.outputData;
    }
  }

  // Merge with node's own user parameters (user params take priority)
  const node = nodes.find((n) => n.id === nodeId);
  if (node?.data) {
    Object.entries(node.data).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        inputs[k] = v;
      }
    });
  }

  return inputs;
}

/* ─── Execution State ─── */

export interface NodeExecutionState {
  status: 'idle' | 'running' | 'success' | 'error';
  outputData?: unknown;
  cachedInputHash?: string;
  error?: string;
}

/* ─── Hash Input for Caching ─── */

export function hashInput(inputs: Record<string, unknown>): string {
  try {
    return JSON.stringify(inputs);
  } catch {
    return String(Date.now());
  }
}

/* ─── Simulate Node Execution ───
 * Stub that mimics execution based on node type.
 * In production this dispatches to actual AI/model inference.
 */

export async function simulateNodeExecution(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  node: { id: string; type?: string; data?: any },
  inputs: Record<string, unknown>,
): Promise<unknown> {
  // Simulate async work
  await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

  const type = node.type || 'unknown';

  switch (type) {
    case 'text':
      return inputs.text || inputs['input-1'] || `Generated text from ${node.id}`;
    case 'image':
      return {
        url: node.data?.image || '/assets/mock/generation-results/show-cover-1.jpg',
        prompt: inputs.prompt || node.data?.prompt || '',
        seed: Math.floor(Math.random() * 100000),
      };
    case 'video':
      return {
        frames: 120,
        duration: node.data?.duration || '5s',
        fps: node.data?.fps || 30,
      };
    case 'audio':
      return { duration: node.data?.duration || '00:03', waveform: [] };
    case 'script':
      return { items: node.data?.items || [], generated: true };
    case 'video-merge':
      return { merged: true, sources: Object.keys(inputs).length };
    default:
      return { nodeId: node.id, inputs };
  }
}

/* ─── Toast Message Throttling ─── */

const toastLastShown = new Map<string, number>();
const TOAST_THROTTLE_MS = 1200;

export function shouldShowToast(message: string): boolean {
  const now = Date.now();
  const last = toastLastShown.get(message) || 0;
  if (now - last > TOAST_THROTTLE_MS) {
    toastLastShown.set(message, now);
    return true;
  }
  return false;
}
