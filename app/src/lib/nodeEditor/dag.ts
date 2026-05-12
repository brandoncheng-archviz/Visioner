import type { EditorNode, EditorEdge } from './types';
export { canConnect } from './types';

type NodeId = string;
interface EdgeRef { source: NodeId; target: NodeId; sourceHandle: string; targetHandle: string }

/* ─── Cycle Detection (DFS) ─── */

export function hasCycle(nodeIds: NodeId[], edges: EdgeRef[]): boolean {
  const adj = new Map<NodeId, NodeId[]>();
  nodeIds.forEach((id) => adj.set(id, []));
  edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
  });

  const visited = new Set<NodeId>();
  const recStack = new Set<NodeId>();

  function dfs(node: NodeId): boolean {
    visited.add(node);
    recStack.add(node);
    for (const neighbor of adj.get(node) || []) {
      if (!visited.has(neighbor) && dfs(neighbor)) return true;
      if (recStack.has(neighbor)) return true;
    }
    recStack.delete(node);
    return false;
  }

  for (const id of nodeIds) {
    if (!visited.has(id) && dfs(id)) return true;
  }
  return false;
}

export function wouldFormCycle(sourceNodeId: string, targetNodeId: string, edges: EditorEdge[]): boolean {
  const nodeIds = Array.from(new Set(edges.flatMap((e) => [e.sourceNodeId, e.targetNodeId])));
  if (!nodeIds.includes(sourceNodeId)) nodeIds.push(sourceNodeId);
  if (!nodeIds.includes(targetNodeId)) nodeIds.push(targetNodeId);

  const edgeRefs: EdgeRef[] = edges.map((e) => ({
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourcePortId,
    targetHandle: e.targetPortId,
  }));
  edgeRefs.push({ source: sourceNodeId, target: targetNodeId, sourceHandle: '', targetHandle: '' });

  return hasCycle(nodeIds, edgeRefs);
}

/* ─── Topological Sort (Kahn) ─── */

export function topologicalSort(nodeIds: NodeId[], edges: EdgeRef[]): NodeId[] | null {
  const inDegree = new Map<NodeId, number>();
  const adj = new Map<NodeId, NodeId[]>();

  nodeIds.forEach((id) => inDegree.set(id, 0));
  edges.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: NodeId[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const result: NodeId[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.push(curr);
    for (const n of adj.get(curr) || []) {
      const newDeg = (inDegree.get(n) || 0) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  return result.length === nodeIds.length ? result : null;
}

/* ─── Execution Batches by Depth ─── */

export function getExecutionBatches(nodes: EditorNode[], edges: EditorEdge[]): NodeId[][] {
  const nodeIds = nodes.map((n) => n.id);
  const edgeRefs: EdgeRef[] = edges.map((e) => ({
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourcePortId,
    targetHandle: e.targetPortId,
  }));

  const depth = new Map<NodeId, number>();
  const adj = new Map<NodeId, NodeId[]>();
  const inDegree = new Map<NodeId, number>();

  nodeIds.forEach((id) => {
    depth.set(id, 0);
    inDegree.set(id, 0);
  });

  edgeRefs.forEach((e) => {
    const list = adj.get(e.source) || [];
    list.push(e.target);
    adj.set(e.source, list);
    inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
  });

  const queue: NodeId[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDepth = depth.get(curr) || 0;
    for (const n of adj.get(curr) || []) {
      depth.set(n, Math.max(depth.get(n) || 0, currDepth + 1));
      const newDeg = (inDegree.get(n) || 0) - 1;
      inDegree.set(n, newDeg);
      if (newDeg === 0) queue.push(n);
    }
  }

  const maxDepth = Math.max(0, ...Array.from(depth.values()));
  const batches: NodeId[][] = [];
  for (let d = 0; d <= maxDepth; d++) {
    const batch: NodeId[] = [];
    depth.forEach((dep, id) => { if (dep === d) batch.push(id); });
    if (batch.length > 0) batches.push(batch);
  }
  return batches;
}

/* ─── Build Node Inputs from Upstream ─── */

export function buildNodeInputs(
  nodeId: string,
  nodes: EditorNode[],
  edges: EditorEdge[],
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {};
  const incoming = edges.filter((e) => e.targetNodeId === nodeId);

  for (const edge of incoming) {
    const sourceNode = nodes.find((n) => n.id === edge.sourceNodeId);
    if (sourceNode?.outputData !== undefined) {
      inputs[edge.targetPortId] = sourceNode.outputData;
    }
  }

  const node = nodes.find((n) => n.id === nodeId);
  if (node?.params) {
    Object.entries(node.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        inputs[k] = v;
      }
    });
  }

  return inputs;
}

/* ─── Hash for Cache ─── */

export function hashInput(inputs: Record<string, unknown>): string {
  try {
    return JSON.stringify(inputs);
  } catch {
    return String(Date.now());
  }
}
