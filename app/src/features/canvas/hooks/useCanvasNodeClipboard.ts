import { useCallback, useEffect, useRef } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Node } from '@xyflow/react';

type CanvasPosition = {
  x: number;
  y: number;
};

type UseCanvasNodeClipboardParams = {
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  getNodes: () => Node[];
  getAllNodeLabels: () => string[];
  getCopiedNodeTitle: (existingLabels: string[], currentLabel: string, fallbackBaseTitle: string) => string;
  getNodeBaseTitle: (type: string) => string;
  lastPointerPositionRef: RefObject<CanvasPosition | null>;
  screenToFlowPosition: (position: CanvasPosition) => CanvasPosition;
};

export function useCanvasNodeClipboard({
  nodes,
  setNodes,
  getNodes,
  getAllNodeLabels,
  getCopiedNodeTitle,
  getNodeBaseTitle,
  lastPointerPositionRef,
  screenToFlowPosition,
}: UseCanvasNodeClipboardParams) {
  const clipboardRef = useRef<Node[]>([]);
  const pasteOffsetRef = useRef(0);

  const hasCopiedNodes = useCallback(() => clipboardRef.current.length > 0, []);

  const getKeyboardPasteAnchor = useCallback(() => {
    const pastePoint = lastPointerPositionRef.current || {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    return screenToFlowPosition(pastePoint);
  }, [lastPointerPositionRef, screenToFlowPosition]);

  const clearCopiedNodes = useCallback(() => {
    clipboardRef.current = [];
    pasteOffsetRef.current = 0;
  }, []);

  const copyNodes = useCallback(() => {
    const latestNodes = getNodes();
    const selectedFlowNodes = latestNodes.filter((node) => node.selected);
    const selected = selectedFlowNodes.length > 0
      ? selectedFlowNodes.map((flowNode) => {
          const sourceNode = nodes.find((node) => node.id === flowNode.id) || flowNode;
          return {
            ...sourceNode,
            position: { ...flowNode.position },
            measured: flowNode.measured || sourceNode.measured,
            width: flowNode.width ?? sourceNode.width,
            height: flowNode.height ?? sourceNode.height,
            selected: true,
          };
        })
      : nodes.filter((node) => node.selected);
    if (selected.length === 0) return 0;
    clipboardRef.current = selected.map((node) => ({
      ...node,
      position: { ...node.position },
      data: { ...node.data },
      style: node.style ? { ...node.style } : undefined,
      measured: node.measured ? { ...node.measured } : undefined,
      selected: false,
      dragging: false,
    }));
    pasteOffsetRef.current = 0;
    if (import.meta.env.DEV) {
      console.debug('[CanvasShortcuts] copy selected count', selected.length);
    }
    return selected.length;
  }, [getNodes, nodes]);

  useEffect(() => {
    window.addEventListener('blur', clearCopiedNodes);
    return () => window.removeEventListener('blur', clearCopiedNodes);
  }, [clearCopiedNodes]);

  const pasteNodes = useCallback((anchorPosition?: CanvasPosition) => {
    const clipboardCount = clipboardRef.current.length;
    if (clipboardCount === 0) return 0;
    pasteOffsetRef.current += 40;
    const offset = pasteOffsetRef.current;
    const existingLabels = getAllNodeLabels();
    const assignedLabels: string[] = [];
    const sourceCenter = anchorPosition
      ? clipboardRef.current.reduce(
          (center, node) => ({
            x: center.x + node.position.x / clipboardCount,
            y: center.y + node.position.y / clipboardCount,
          }),
          { x: 0, y: 0 },
        )
      : null;
    const pasted = clipboardRef.current.map((node, index) => {
      const nodeType = node.type || '';
      const fallbackBaseTitle = getNodeBaseTitle(nodeType);
      const nextLabel = getCopiedNodeTitle(
        [...existingLabels, ...assignedLabels],
        (node.data.label as string | undefined) || '',
        fallbackBaseTitle,
      );
      assignedLabels.push(nextLabel);
      const nextData = {
        ...node.data,
        label: nextLabel,
        title: typeof node.data.title === 'string' ? nextLabel : node.data.title,
      };
      return {
        ...node,
        id: `${node.type}-${Date.now()}-${index}`,
        position: anchorPosition && sourceCenter
          ? {
              x: anchorPosition.x + (node.position.x - sourceCenter.x) + offset,
              y: anchorPosition.y + (node.position.y - sourceCenter.y) + offset,
            }
          : { x: node.position.x + offset, y: node.position.y + offset },
        data: nextData,
        selected: true,
        dragging: false,
      };
    });
    setNodes((currentNodes) => [
      ...currentNodes.map((node) => ({ ...node, selected: false })),
      ...pasted,
    ]);
    if (import.meta.env.DEV) {
      console.debug('[CanvasShortcuts] paste clipboard count', clipboardCount);
      console.debug('[CanvasShortcuts] pasted created count', pasted.length);
    }
    return pasted.length;
  }, [getAllNodeLabels, getCopiedNodeTitle, getNodeBaseTitle, setNodes]);

  const pasteNodesFromKeyboard = useCallback(() => {
    if (!hasCopiedNodes()) return 0;
    const anchorPosition = getKeyboardPasteAnchor();
    return pasteNodes(anchorPosition);
  }, [getKeyboardPasteAnchor, hasCopiedNodes, pasteNodes]);

  return {
    copyNodes,
    pasteNodes,
    pasteNodesFromKeyboard,
    hasCopiedNodes,
    clearCopiedNodes,
    clipboardRef,
  };
}
