import { useCallback, useState } from 'react';

export type CanvasContextMenuState = {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
} | null;

export type CanvasNodeContextMenuState = {
  x: number;
  y: number;
  nodeId: string;
} | null;

export function useCanvasUiPanels() {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [snapGrid, setSnapGrid] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<CanvasNodeContextMenuState>(null);
  const [historyPanelNodeId, setHistoryPanelNodeId] = useState<string | null>(null);

  const toggleHelp = useCallback(() => setShowHelp((value) => !value), []);
  const closeHelp = useCallback(() => setShowHelp(false), []);
  const toggleMinimap = useCallback(() => setShowMinimap((value) => !value), []);
  const toggleSnapGrid = useCallback(() => setSnapGrid((value) => !value), []);

  const openContextMenu = useCallback((x: number, y: number, flowPos: { x: number; y: number }) => {
    setContextMenu({ x, y, flowPos });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const openNodeContextMenu = useCallback((x: number, y: number, nodeId: string) => {
    setNodeContextMenu({ x, y, nodeId });
  }, []);

  const closeNodeContextMenu = useCallback(() => setNodeContextMenu(null), []);

  const openHistoryPanel = useCallback((nodeId: string) => setHistoryPanelNodeId(nodeId), []);
  const closeHistoryPanel = useCallback(() => setHistoryPanelNodeId(null), []);

  return {
    activePanel,
    setActivePanel,
    showHelp,
    closeHelp,
    toggleHelp,
    showMinimap,
    toggleMinimap,
    snapGrid,
    toggleSnapGrid,
    contextMenu,
    openContextMenu,
    closeContextMenu,
    nodeContextMenu,
    openNodeContextMenu,
    closeNodeContextMenu,
    historyPanelNodeId,
    openHistoryPanel,
    closeHistoryPanel,
  };
}
