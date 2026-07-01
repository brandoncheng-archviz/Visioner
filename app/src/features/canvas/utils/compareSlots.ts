import type { Edge, Node } from '@xyflow/react';

export type CompareSlot = 'left' | 'right';

const COMPARE_SLOTS: CompareSlot[] = ['left', 'right'];

export function getCompareSlot(edge: Pick<Edge, 'data'>): CompareSlot | null {
  const slot = edge.data?.compareSlot;
  return slot === 'left' || slot === 'right' ? slot : null;
}

export function getNextCompareSlot(edges: Edge[], targetNodeId: string): CompareSlot | null {
  const usedSlots = new Set(
    edges
      .filter((edge) => edge.target === targetNodeId)
      .map(getCompareSlot)
      .filter((slot): slot is CompareSlot => slot !== null),
  );
  return COMPARE_SLOTS.find((slot) => !usedSlots.has(slot)) ?? null;
}

export function getCompareEdgesBySlot(edges: Edge[], targetNodeId: string) {
  const incoming = edges
    .filter((edge) => edge.target === targetNodeId)
    .sort((a, b) => a.id.localeCompare(b.id));
  const result: Partial<Record<CompareSlot, Edge>> = {};
  const unassigned: Edge[] = [];

  incoming.forEach((edge) => {
    const slot = getCompareSlot(edge);
    if (slot && !result[slot]) result[slot] = edge;
    else unassigned.push(edge);
  });

  COMPARE_SLOTS.forEach((slot) => {
    if (!result[slot]) result[slot] = unassigned.shift();
  });

  return result;
}

export function normalizeCompareEdgeSlots(nodes: Node[], edges: Edge[]): Edge[] {
  const compareNodeIds = new Set(nodes.filter((node) => node.type === 'compare').map((node) => node.id));
  let changed = false;
  const nextEdges = [...edges];

  compareNodeIds.forEach((targetNodeId) => {
    const bySlot = getCompareEdgesBySlot(nextEdges, targetNodeId);
    COMPARE_SLOTS.forEach((slot) => {
      const edge = bySlot[slot];
      if (!edge || getCompareSlot(edge) === slot) return;
      const index = nextEdges.findIndex((candidate) => candidate.id === edge.id);
      if (index < 0) return;
      nextEdges[index] = { ...edge, data: { ...edge.data, compareSlot: slot } };
      changed = true;
    });
  });

  return changed ? nextEdges : edges;
}
