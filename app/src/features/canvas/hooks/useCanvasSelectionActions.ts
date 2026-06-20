import { useCallback } from 'react';
import type { Dispatch, MouseEvent, SetStateAction } from 'react';
import type { Edge, Node } from '@xyflow/react';

type SetNodes = Dispatch<SetStateAction<Node[]>>;
type SetEdges = Dispatch<SetStateAction<Edge[]>>;

type UseCanvasSelectionActionsParams = {
  nodes: Node[];
  edges: Edge[];
  setNodes: SetNodes;
  setEdges: SetEdges;
  getAllNodeLabels: () => string[];
  getCopiedNodeTitle: (existingLabels: string[], currentLabel: string, fallbackBaseTitle: string) => string;
  getNodeBaseTitle: (type: string) => string;
  onCloseNodeContextMenu?: () => void;
  onCloseCreateMenu?: () => void;
};

export function hasSelectedNodes(nodes: Node[]) {
  return nodes.some((node) => node.selected);
}

export function hasSelectedEdges(edges: Edge[]) {
  return edges.some((edge) => edge.selected);
}

export function useCanvasSelectionActions({
  nodes,
  edges,
  setNodes,
  setEdges,
  getAllNodeLabels,
  getCopiedNodeTitle,
  getNodeBaseTitle,
  onCloseNodeContextMenu,
  onCloseCreateMenu,
}: UseCanvasSelectionActionsParams) {
  const deleteSelected = useCallback(() => {
    if (!hasSelectedNodes(nodes) && !hasSelectedEdges(edges)) return;
    setNodes((currentNodes) => currentNodes.filter((node) => !node.selected));
    setEdges((currentEdges) => currentEdges.filter((edge) => !edge.selected));
  }, [edges, nodes, setEdges, setNodes]);

  const selectAll = useCallback(() => {
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: true })));
  }, [setNodes]);

  const deselectAll = useCallback(() => {
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
    setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: false })));
  }, [setEdges, setNodes]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((currentNode) => currentNode.id === id);
    if (!node) return;
    const nodeType = node.type || '';
    const fallbackBaseTitle = getNodeBaseTitle(nodeType);
    const label = getCopiedNodeTitle(
      getAllNodeLabels(),
      (node.data?.label as string | undefined) || '',
      fallbackBaseTitle,
    );
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      data: { ...node.data, label },
      selected: true,
    };
    setNodes((currentNodes) => [
      ...currentNodes.map((currentNode) => ({ ...currentNode, selected: false })),
      newNode,
    ]);
    onCloseNodeContextMenu?.();
  }, [getAllNodeLabels, getCopiedNodeTitle, getNodeBaseTitle, nodes, onCloseNodeContextMenu, setNodes]);

  const handleEdgeClick = useCallback((_event: MouseEvent, edge: Edge) => {
    setEdges((currentEdges) => currentEdges.map((currentEdge) => ({ ...currentEdge, selected: currentEdge.id === edge.id })));
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
  }, [setEdges, setNodes]);

  const handlePaneClick = useCallback(() => {
    onCloseCreateMenu?.();
    setEdges((currentEdges) => currentEdges.map((edge) => ({ ...edge, selected: false })));
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: false })));
  }, [onCloseCreateMenu, setEdges, setNodes]);

  return {
    deleteSelected,
    selectAll,
    deselectAll,
    duplicateNode,
    handleEdgeClick,
    handlePaneClick,
  };
}
