import { useCallback, useLayoutEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';
import { DEFAULT_MODEL_PARAMS } from '../constants/canvasConstants';

type CanvasHistorySnapshot = {
  nodes: Node[];
  edges: Edge[];
};

type ImageDataDiff = {
  nodeId: string;
  keys: string[];
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

function getSnapshotKey(snapshot: CanvasHistorySnapshot) {
  return createSnapshotKey(snapshot.nodes, snapshot.edges);
}

function getSnapshotKeyHash(snapshot: CanvasHistorySnapshot) {
  const key = getSnapshotKey(snapshot);
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) {
    hash = ((hash << 5) - hash + key.charCodeAt(index)) | 0;
  }
  return hash.toString(16);
}

function createSnapshotKey(nodes: Node[], edges: Edge[]) {
  return JSON.stringify({
    nodes: nodes.map(normalizeNodeForHistory),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      type: edge.type,
      data: edge.data,
      hidden: edge.hidden,
    })),
  });
}

function normalizeNodeDataForHistory(node: Node) {
  const data = { ...(node.data || {}) };

  delete data.onStartLineDraw;
  delete data.onRemoveReferenceEdge;
  delete data.onAssignReferenceEdgeRole;
  delete data.onCreateUpscaleNode;
  delete data.onCreateSunSkyNode;
  delete data.onCreateCompareNode;
  delete data.onCreateRelightNode;
  delete data.onTextAction;
  delete data.onOpenHistoryPanel;
  delete data.onRegisterObjectUrl;

  if (node.type === 'image') {
    const generationTask = data.generationTask as Record<string, unknown> | null | undefined;
    if (generationTask) {
      const stableGenerationTask = { ...generationTask };
      delete stableGenerationTask.updatedAt;
      data.generationTask = stableGenerationTask;
    }

    removeEmptyImageDefaults(data);
  }

  return data;
}

function removeEmptyImageDefaults(data: Record<string, unknown>) {
  removeEmptyString(data, 'prompt');
  removeEmptyArray(data, 'promptContent');
  removeEmptyArray(data, 'selectedPresets');
  removeEmptyArray(data, 'generatedImages');
  removeEmptyArray(data, 'references');
  removeEmptyArray(data, 'referenceImages');
  removeEmptyArray(data, 'referenceOrder');
  removeNullish(data, 'lightPreview');
  removeNullish(data, 'selectedStyleId');
  removeNullish(data, 'generationTask');
  removeNullish(data, 'currentResultSet');
  removeNullish(data, 'currentResultId');

  if (data.referencesSignature === '[]') {
    delete data.referencesSignature;
  }

  if (isDefaultModelParams(data.modelParams)) {
    delete data.modelParams;
  }
}

function removeEmptyString(data: Record<string, unknown>, key: string) {
  if (data[key] === '') {
    delete data[key];
  }
}

function removeEmptyArray(data: Record<string, unknown>, key: string) {
  if (Array.isArray(data[key]) && data[key].length === 0) {
    delete data[key];
  }
}

function removeNullish(data: Record<string, unknown>, key: string) {
  if (data[key] === null || data[key] === undefined) {
    delete data[key];
  }
}

function isDefaultModelParams(value: unknown) {
  if (!value || typeof value !== 'object') return false;
  return JSON.stringify(value) === JSON.stringify(DEFAULT_MODEL_PARAMS);
}

function normalizeNodeForHistory(node: Node) {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: normalizeNodeDataForHistory(node),
    parentId: node.parentId,
    hidden: node.hidden,
  };
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

function applyDraggedNodePositions(nodes: Node[], draggedNodes?: Node[]) {
  if (!draggedNodes?.length) return nodes;
  const draggedPositions = new Map(
    draggedNodes.map((node) => [node.id, node.position]),
  );
  return nodes.map((node) => {
    const position = draggedPositions.get(node.id);
    return position ? { ...node, position } : node;
  });
}

function haveNodePositionsChanged(previous: CanvasHistorySnapshot, nextNodes: Node[]) {
  const previousPositions = new Map(
    previous.nodes.map((node) => [node.id, node.position]),
  );
  return nextNodes.some((node) => {
    const previousPosition = previousPositions.get(node.id);
    return Boolean(
      previousPosition &&
      (previousPosition.x !== node.position.x || previousPosition.y !== node.position.y),
    );
  });
}

function getChangedPositionNodeIds(previous: CanvasHistorySnapshot | undefined, next: CanvasHistorySnapshot) {
  if (!previous) return next.nodes.map((node) => node.id);
  const previousPositions = new Map(
    previous.nodes.map((node) => [node.id, node.position]),
  );
  return next.nodes
    .filter((node) => {
      const previousPosition = previousPositions.get(node.id);
      return !previousPosition ||
        previousPosition.x !== node.position.x ||
        previousPosition.y !== node.position.y;
    })
    .map((node) => node.id);
}

function getChangedNodeSummaries(previous: CanvasHistorySnapshot | undefined, next: CanvasHistorySnapshot) {
  if (!previous) {
    return next.nodes.map((node) => ({ id: node.id, type: node.type ?? 'unknown' }));
  }

  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]));
  return next.nodes
    .filter((node) => {
      const previousNode = previousNodes.get(node.id);
      return !previousNode ||
        getSnapshotKey({ nodes: [previousNode], edges: [] }) !== getSnapshotKey({ nodes: [node], edges: [] });
    })
    .map((node) => ({ id: node.id, type: node.type ?? 'unknown' }));
}

function getChangedImageNodeDataDiffs(
  previous: CanvasHistorySnapshot | undefined,
  next: CanvasHistorySnapshot,
): ImageDataDiff[] {
  if (!previous) {
    return next.nodes
      .filter((node) => node.type === 'image')
      .map((node) => ({ nodeId: node.id, keys: ['created'] }));
  }

  const previousImages = new Map(
    previous.nodes
      .filter((node) => node.type === 'image')
      .map((node) => [node.id, normalizeNodeDataForHistory(node)]),
  );

  return next.nodes
    .filter((node) => node.type === 'image')
    .flatMap((node) => {
      const previousData = previousImages.get(node.id);
      const nextData = normalizeNodeDataForHistory(node);
      if (!previousData) return [{ nodeId: node.id, keys: ['created'] }];

      const keys = Array.from(new Set([
        ...Object.keys(previousData),
        ...Object.keys(nextData),
      ])).filter((key) => JSON.stringify(previousData[key]) !== JSON.stringify(nextData[key]));

      return keys.length > 0 ? [{ nodeId: node.id, keys }] : [];
    });
}

function findPreviousDistinctSnapshot(
  history: CanvasHistorySnapshot[],
  fromIndex: number,
  currentKey: string,
) {
  let targetIndex = fromIndex - 1;
  let skipped = 0;
  while (
    targetIndex > 0 &&
    history[targetIndex] &&
    getSnapshotKey(history[targetIndex]) === currentKey
  ) {
    targetIndex -= 1;
    skipped += 1;
  }
  return { targetIndex, skipped };
}

function findNextDistinctSnapshot(
  history: CanvasHistorySnapshot[],
  fromIndex: number,
  currentKey: string,
) {
  let targetIndex = fromIndex + 1;
  let skipped = 0;
  while (
    targetIndex < history.length - 1 &&
    history[targetIndex] &&
    getSnapshotKey(history[targetIndex]) === currentKey
  ) {
    targetIndex += 1;
    skipped += 1;
  }
  return { targetIndex, skipped };
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
  const lastSnapshotKeyRef = useRef(getSnapshotKey(historyRef.current[0]));

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
      lastSnapshotKeyRef.current = getSnapshotKey(initialSnapshot);
      isNodeDraggingRef.current = false;
      nodeDragStartSnapshotRef.current = null;
      nodeDragStartHistoryIndexRef.current = null;
      resetKeyRef.current = resetKey;
      if (import.meta.env.DEV) {
        console.debug('[history] initial snapshot reset', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
          nodesCount: initialSnapshot.nodes.length,
          edgesCount: initialSnapshot.edges.length,
          snapshotKeyHash: getSnapshotKeyHash(initialSnapshot),
        });
      }
      return;
    }

    const normalizedEdges = normalizeEdges(edges, nodes);
    const currentSnapshot = {
      nodes,
      edges: normalizedEdges,
    };
    const pendingRestore = pendingRestoreRef.current;
    if (skipHistoryRef.current || pendingRestore) {
      const restoreMatched = pendingRestore
        ? areSnapshotsEqual(pendingRestore, nodes, normalizedEdges)
        : false;
      latestNodesRef.current = pendingRestore?.nodes ?? nodes;
      latestEdgesRef.current = pendingRestore?.edges ?? normalizedEdges;
      lastSnapshotKeyRef.current = pendingRestore
        ? getSnapshotKey(pendingRestore)
        : getSnapshotKey(currentSnapshot);
      pendingRestoreRef.current = null;
      skipHistoryRef.current = false;
      if (import.meta.env.DEV) {
        console.debug('[restore] applied', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
          nodesCount: latestNodesRef.current.length,
          edgesCount: latestEdgesRef.current.length,
          snapshotKeyHash: pendingRestore
            ? getSnapshotKeyHash(pendingRestore)
            : getSnapshotKeyHash(currentSnapshot),
          restoreMatched,
          pendingRestoreCleared: pendingRestoreRef.current === null,
          latestNodesSynced: latestNodesRef.current.length,
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
    const snapshot = historyRef.current[historyIndexRef.current];
    lastSnapshotKeyRef.current = getSnapshotKey(snapshot);
    if (historyRef.current.length > maxHistoryLength) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
    if (import.meta.env.DEV) {
      console.debug('[history] snapshot recorded', {
        reason: 'auto',
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        previousSnapshotNodesCount: last?.nodes.length ?? 0,
        currentSnapshotNodesCount: snapshot.nodes.length,
        previousSnapshotEdgesCount: last?.edges.length ?? 0,
        currentSnapshotEdgesCount: snapshot.edges.length,
        previousNodesCount,
        latestNodesCount: nodes.length,
        edgesCount: normalizedEdges.length,
        snapshotKeyHash: getSnapshotKeyHash(snapshot),
        changedNodeIds: getChangedPositionNodeIds(last, snapshot),
        changedNodeTypes: getChangedNodeSummaries(last, snapshot).map((node) => node.type),
        changedNodes: getChangedNodeSummaries(last, snapshot),
        changedImageNodeIds: getChangedImageNodeDataDiffs(last, snapshot).map((diff) => diff.nodeId),
        imageNodeDataDiffs: getChangedImageNodeDataDiffs(last, snapshot),
        skipHistory: skipHistoryRef.current,
      });
    }
  }, [edges, enabled, maxHistoryLength, nodes, normalizeEdges, resetKey]);

  const undo = useCallback(() => {
    const fromIndex = historyIndexRef.current;
    const currentSnapshot = historyRef.current[fromIndex];
    const currentKey = currentSnapshot ? getSnapshotKey(currentSnapshot) : '';
    if (import.meta.env.DEV) {
      console.debug('[undo] called', {
        historyLength: historyRef.current.length,
        historyIndex: fromIndex,
        currentNodesCount: currentSnapshot?.nodes.length ?? 0,
        currentEdgesCount: currentSnapshot?.edges.length ?? 0,
        currentKeyHash: currentSnapshot ? getSnapshotKeyHash(currentSnapshot) : null,
        latestNodesCount: latestNodesRef.current.length,
        latestEdgesCount: latestEdgesRef.current.length,
        pendingRestore: Boolean(pendingRestoreRef.current),
        skipHistory: skipHistoryRef.current,
      });
    }
    if (historyIndexRef.current <= 0) return;
    if (!currentSnapshot) return;
    const { targetIndex, skipped } = findPreviousDistinctSnapshot(
      historyRef.current,
      fromIndex,
      currentKey,
    );
    historyIndexRef.current = targetIndex;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    const restoredSnapshot = {
      nodes: state.nodes,
      edges: normalizeEdges(state.edges, state.nodes),
    };
    const targetNodeIds = new Set(restoredSnapshot.nodes.map((node) => node.id));
    const createdImageNodeId = currentSnapshot.nodes
      .filter((node) => node.type === 'image')
      .map((node) => node.id)
      .find((nodeId) => !targetNodeIds.has(nodeId)) ?? null;
    latestNodesRef.current = restoredSnapshot.nodes;
    latestEdgesRef.current = restoredSnapshot.edges;
    lastSnapshotKeyRef.current = getSnapshotKey(restoredSnapshot);
    skipHistoryRef.current = true;
    pendingRestoreRef.current = restoredSnapshot;
    if (import.meta.env.DEV) {
      console.debug('[undo] applying snapshot', {
        fromIndex,
        targetIndex,
        skippedSameSemanticSnapshots: skipped,
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        targetNodesCount: restoredSnapshot.nodes.length,
        targetEdgesCount: restoredSnapshot.edges.length,
        targetContainsCurrentImageNodes: currentSnapshot.nodes
          .filter((node) => node.type === 'image')
          .map((node) => ({
            id: node.id,
            inTarget: restoredSnapshot.nodes.some((targetNode) => targetNode.id === node.id),
          })),
        currentKeyHash: getSnapshotKeyHash(currentSnapshot),
        targetKeyHash: getSnapshotKeyHash(restoredSnapshot),
        latestNodesCount: latestNodesRef.current.length,
        latestEdgesCount: latestEdgesRef.current.length,
        pendingRestore: Boolean(pendingRestoreRef.current),
        skipHistory: skipHistoryRef.current,
      });
      console.debug('[undo-image-debug]', {
        phase: 'before-apply',
        createdImageNodeId,
        currentContains: createdImageNodeId
          ? currentSnapshot.nodes.some((node) => node.id === createdImageNodeId)
          : false,
        targetContains: createdImageNodeId
          ? restoredSnapshot.nodes.some((node) => node.id === createdImageNodeId)
          : false,
        currentNodesCount: currentSnapshot.nodes.length,
        targetNodesCount: restoredSnapshot.nodes.length,
        setNodesInputNodesCount: restoredSnapshot.nodes.length,
        afterApplyNodesCount: latestNodesRef.current.length,
      });
    }
    setNodes(() => restoredSnapshot.nodes);
    setEdges(() => restoredSnapshot.edges);
    if (import.meta.env.DEV && createdImageNodeId && typeof window !== 'undefined') {
      window.requestAnimationFrame(() => {
        const afterApplyContains = latestNodesRef.current.some((node) => node.id === createdImageNodeId);
        console.debug('[undo-image-debug]', {
          phase: 'after-frame',
          createdImageNodeId,
          targetContains: restoredSnapshot.nodes.some((node) => node.id === createdImageNodeId),
          afterApplyContains,
          afterApplyNodesCount: latestNodesRef.current.length,
          possibleResurrectedByExternalSetNodes:
            !restoredSnapshot.nodes.some((node) => node.id === createdImageNodeId) && afterApplyContains,
        });
      });
    }
  }, [normalizeEdges, setEdges, setNodes]);

  const redo = useCallback(() => {
    const fromIndex = historyIndexRef.current;
    const currentSnapshot = historyRef.current[fromIndex];
    const currentKey = currentSnapshot ? getSnapshotKey(currentSnapshot) : '';
    if (import.meta.env.DEV) {
      console.debug('[redo] called', {
        historyLength: historyRef.current.length,
        historyIndex: fromIndex,
        currentNodesCount: currentSnapshot?.nodes.length ?? 0,
        currentEdgesCount: currentSnapshot?.edges.length ?? 0,
        currentKeyHash: currentSnapshot ? getSnapshotKeyHash(currentSnapshot) : null,
        latestNodesCount: latestNodesRef.current.length,
        latestEdgesCount: latestEdgesRef.current.length,
        pendingRestore: Boolean(pendingRestoreRef.current),
        skipHistory: skipHistoryRef.current,
      });
    }
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    if (!currentSnapshot) return;
    const { targetIndex, skipped } = findNextDistinctSnapshot(
      historyRef.current,
      fromIndex,
      currentKey,
    );
    historyIndexRef.current = targetIndex;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    const restoredSnapshot = {
      nodes: state.nodes,
      edges: normalizeEdges(state.edges, state.nodes),
    };
    latestNodesRef.current = restoredSnapshot.nodes;
    latestEdgesRef.current = restoredSnapshot.edges;
    lastSnapshotKeyRef.current = getSnapshotKey(restoredSnapshot);
    skipHistoryRef.current = true;
    pendingRestoreRef.current = restoredSnapshot;
    if (import.meta.env.DEV) {
      console.debug('[redo] applying snapshot', {
        fromIndex,
        targetIndex,
        skippedSameSemanticSnapshots: skipped,
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        targetNodesCount: restoredSnapshot.nodes.length,
        targetEdgesCount: restoredSnapshot.edges.length,
        currentKeyHash: getSnapshotKeyHash(currentSnapshot),
        targetKeyHash: getSnapshotKeyHash(restoredSnapshot),
        latestNodesCount: latestNodesRef.current.length,
        latestEdgesCount: latestEdgesRef.current.length,
        pendingRestore: Boolean(pendingRestoreRef.current),
        skipHistory: skipHistoryRef.current,
      });
    }
    setNodes(() => restoredSnapshot.nodes);
    setEdges(() => restoredSnapshot.edges);
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

  const endNodeDrag = useCallback((draggedNodes?: Node[]) => {
    if (!enabled) return;
    const startSnapshot = nodeDragStartSnapshotRef.current;
    isNodeDraggingRef.current = false;
    nodeDragStartSnapshotRef.current = null;
    nodeDragStartHistoryIndexRef.current = null;
    if (!startSnapshot) return;

    const nextNodes = applyDraggedNodePositions(latestNodesRef.current, draggedNodes);
    const nextEdges = latestEdgesRef.current;
    const nextSnapshot = createSnapshot(nextNodes, nextEdges, normalizeEdges);
    if (!haveNodePositionsChanged(startSnapshot, nextSnapshot.nodes)) {
      if (import.meta.env.DEV) {
        console.debug('[history] node drag ignored without movement', {
          historyLength: historyRef.current.length,
          historyIndex: historyIndexRef.current,
        });
      }
      return;
    }

    const last = historyRef.current[historyIndexRef.current];
    if (areSnapshotsEqual(last, nextSnapshot.nodes, nextSnapshot.edges)) return;

    historyIndexRef.current += 1;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
    historyRef.current.push(nextSnapshot);
    lastSnapshotKeyRef.current = getSnapshotKey(nextSnapshot);
    if (historyRef.current.length > maxHistoryLength) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
    if (import.meta.env.DEV) {
      console.debug('[history] node drag transaction recorded', {
        reason: 'move-node',
        historyLength: historyRef.current.length,
        historyIndex: historyIndexRef.current,
        previousNodesCount: startSnapshot.nodes.length,
        latestNodesCount: nextSnapshot.nodes.length,
        edgesCount: nextSnapshot.edges.length,
        snapshotKeyHash: getSnapshotKeyHash(nextSnapshot),
        changedNodeIds: getChangedPositionNodeIds(startSnapshot, nextSnapshot),
        changedImageNodeIds: getChangedImageNodeDataDiffs(startSnapshot, nextSnapshot).map((diff) => diff.nodeId),
        imageNodeDataDiffs: getChangedImageNodeDataDiffs(startSnapshot, nextSnapshot),
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
