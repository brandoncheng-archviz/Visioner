import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';

type CanvasHistorySnapshot = {
  nodes: Node[];
  edges: Edge[];
};

type UseCanvasUndoRedoParams = {
  nodes: Node[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  maxHistoryLength?: number;
  enabled?: boolean;
  resetKey?: string;
  normalizeEdges?: (edges: Edge[], nodes: Node[]) => Edge[];
};

function areSnapshotsEqual(
  previous: CanvasHistorySnapshot | undefined,
  nodes: Node[],
  edges: Edge[],
) {
  return previous && createSnapshotKey(previous.nodes, previous.edges) === createSnapshotKey(nodes, edges);
}

function createSnapshotKey(nodes: Node[], edges: Edge[]) {
  return JSON.stringify({
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: node.data,
      style: node.style,
      parentId: node.parentId,
      hidden: node.hidden,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      data: edge.data,
      style: edge.style,
      hidden: edge.hidden,
    })),
  });
}

function createSnapshot(
  nodes: Node[],
  edges: Edge[],
  normalizeEdges: (edges: Edge[], nodes: Node[]) => Edge[],
): CanvasHistorySnapshot {
  return {
    nodes: [...nodes],
    edges: normalizeEdges(edges, nodes),
  };
}

export function useCanvasUndoRedo({
  nodes,
  edges,
  setNodes,
  setEdges,
  maxHistoryLength = 50,
  enabled = true,
  resetKey,
  normalizeEdges = (currentEdges) => currentEdges,
}: UseCanvasUndoRedoParams) {
  const historyRef = useRef<CanvasHistorySnapshot[]>([
    createSnapshot(nodes, edges, normalizeEdges),
  ]);
  const historyIndexRef = useRef(0);
  const skipHistoryRef = useRef(false);
  const pendingRestoreRef = useRef<CanvasHistorySnapshot | null>(null);
  const resetKeyRef = useRef(resetKey);
  const isNodeDraggingRef = useRef(false);
  const nodeDragStartSnapshotRef = useRef<CanvasHistorySnapshot | null>(null);
  const nodeDragStartHistoryIndexRef = useRef<number | null>(null);
  const latestNodesRef = useRef(nodes);
  const latestEdgesRef = useRef(edges);

  useLayoutEffect(() => {
    latestNodesRef.current = nodes;
    latestEdgesRef.current = edges;
  }, [edges, nodes]);

  useLayoutEffect(() => {
    if (!enabled) return;
    if (isNodeDraggingRef.current) return;

    if (resetKeyRef.current !== resetKey) {
      const initialSnapshot = createSnapshot(nodes, edges, normalizeEdges);
      historyRef.current = [initialSnapshot];
      historyIndexRef.current = 0;
      skipHistoryRef.current = false;
      pendingRestoreRef.current = null;
      isNodeDraggingRef.current = false;
      nodeDragStartSnapshotRef.current = null;
      nodeDragStartHistoryIndexRef.current = null;
      resetKeyRef.current = resetKey;
      if (import.meta.env.DEV) {
        console.debug('[history] initial snapshot reset', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
          nodesCount: initialSnapshot.nodes.length,
        });
      }
      return;
    }

    const normalizedEdges = normalizeEdges(edges, nodes);
    const pendingRestore = pendingRestoreRef.current;
    if (pendingRestore) {
      if (areSnapshotsEqual(pendingRestore, nodes, normalizedEdges)) {
        pendingRestoreRef.current = null;
        skipHistoryRef.current = false;
        if (import.meta.env.DEV) {
          console.debug('[history] restored snapshot observed', {
            historyLength: historyRef.current.length,
            historyIndex: historyIndexRef.current,
          });
        }
      } else if (import.meta.env.DEV) {
        console.debug('[history] skip intermediate restore state', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
        });
      }
      return;
    }

    const last = historyRef.current[historyIndexRef.current];
    if (areSnapshotsEqual(last, nodes, normalizedEdges)) return;

    const previousNodesCount = last?.nodes.length ?? 0;
    historyIndexRef.current += 1;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
    historyRef.current.push({
      nodes: [...nodes],
      edges: normalizedEdges,
    });
    if (historyRef.current.length > maxHistoryLength) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
    if (import.meta.env.DEV) {
      console.debug('[history] snapshot recorded', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        previousNodesCount,
        latestNodesCount: nodes.length,
        skipHistory: skipHistoryRef.current,
      });
    }
  }, [edges, enabled, maxHistoryLength, nodes, normalizeEdges, resetKey]);

  const undo = useCallback(() => {
    if (import.meta.env.DEV) {
      console.debug('[undo] called', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        currentNodesCount: historyRef.current[historyIndexRef.current]?.nodes.length ?? 0,
        skipHistory: skipHistoryRef.current,
      });
    }
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    skipHistoryRef.current = true;
    const restoredSnapshot = {
      nodes: state.nodes,
      edges: normalizeEdges(state.edges, state.nodes),
    };
    pendingRestoreRef.current = restoredSnapshot;
    if (import.meta.env.DEV) {
      console.debug('[undo] applying snapshot', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        targetNodesCount: restoredSnapshot.nodes.length,
      });
    }
    setNodes(state.nodes);
    setEdges(restoredSnapshot.edges);
  }, [normalizeEdges, setEdges, setNodes]);

  const redo = useCallback(() => {
    if (import.meta.env.DEV) {
      console.debug('[redo] called', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        currentNodesCount: historyRef.current[historyIndexRef.current]?.nodes.length ?? 0,
        skipHistory: skipHistoryRef.current,
      });
    }
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    skipHistoryRef.current = true;
    const restoredSnapshot = {
      nodes: state.nodes,
      edges: normalizeEdges(state.edges, state.nodes),
    };
    pendingRestoreRef.current = restoredSnapshot;
    if (import.meta.env.DEV) {
      console.debug('[redo] applying snapshot', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        targetNodesCount: restoredSnapshot.nodes.length,
      });
    }
    setNodes(state.nodes);
    setEdges(restoredSnapshot.edges);
  }, [normalizeEdges, setEdges, setNodes]);

  const beginNodeDrag = useCallback(() => {
    if (!enabled) return;
    isNodeDraggingRef.current = true;
    nodeDragStartSnapshotRef.current = createSnapshot(nodes, edges, normalizeEdges);
    nodeDragStartHistoryIndexRef.current = historyIndexRef.current;
    if (import.meta.env.DEV) {
      console.debug('[history] node drag started', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        nodesCount: nodeDragStartSnapshotRef.current.nodes.length,
      });
    }
  }, [edges, enabled, nodes, normalizeEdges]);

  const endNodeDrag = useCallback(() => {
    if (!enabled) return;
    const startSnapshot = nodeDragStartSnapshotRef.current;
    const startHistoryIndex = nodeDragStartHistoryIndexRef.current;
    isNodeDraggingRef.current = false;
    nodeDragStartSnapshotRef.current = null;
    nodeDragStartHistoryIndexRef.current = null;
    if (!startSnapshot) return;

    const nextNodes = latestNodesRef.current;
    const nextEdges = latestEdgesRef.current;
    const nextSnapshot = createSnapshot(nextNodes, nextEdges, normalizeEdges);
    if (areSnapshotsEqual(startSnapshot, nextSnapshot.nodes, nextSnapshot.edges)) {
      if (import.meta.env.DEV) {
        console.debug('[history] node drag ignored without movement', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
        });
      }
      return;
    }

    if (startHistoryIndex !== null) {
      historyRef.current = historyRef.current.slice(0, startHistoryIndex + 1);
      historyIndexRef.current = Math.min(startHistoryIndex, historyRef.current.length - 1);
    }

    const last = historyRef.current[historyIndexRef.current];
    if (!areSnapshotsEqual(last, startSnapshot.nodes, startSnapshot.edges)) {
      historyIndexRef.current += 1;
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
      historyRef.current.push(startSnapshot);
    }

    historyIndexRef.current += 1;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
    historyRef.current.push(nextSnapshot);
    if (historyRef.current.length > maxHistoryLength) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
    if (import.meta.env.DEV) {
      console.debug('[history] node drag transaction recorded', {
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        previousNodesCount: startSnapshot.nodes.length,
        latestNodesCount: nextSnapshot.nodes.length,
      });
    }
  }, [enabled, maxHistoryLength, normalizeEdges]);

  return {
    undo,
    redo,
    beginNodeDrag,
    endNodeDrag,
    canUndo: historyIndexRef.current > 0,
    canRedo: historyIndexRef.current < historyRef.current.length - 1,
    skipHistoryRef,
  };
}
