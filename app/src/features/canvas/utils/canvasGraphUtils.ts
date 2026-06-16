import type { Edge } from '@xyflow/react';

export function wouldCreateCycle(sourceId: string, targetId: string, currentEdges: Edge[]): boolean {
  const adj = new Map<string, string[]>();
  currentEdges.forEach((edge) => {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  });

  if (!adj.has(sourceId)) adj.set(sourceId, []);
  adj.get(sourceId)!.push(targetId);

  const visited = new Set<string>();
  const queue = [targetId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === sourceId) return true;
    if (visited.has(curr)) continue;
    visited.add(curr);
    (adj.get(curr) || []).forEach((next) => {
      if (!visited.has(next)) queue.push(next);
    });
  }
  return false;
}
