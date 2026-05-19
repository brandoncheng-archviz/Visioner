import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Navbar from '../components/Navbar';
import { getProjectCanvasData, recentProjects } from '../data/siteData';
import { useToast } from '../features/canvas/hooks/useToast';
import type { ImageRole } from '../features/canvas/types/imageNode.types';
import { UNIQUE_USAGES, getImageRoleLabel } from '../features/canvas/constants/imageUsages';
import { getRoleData } from '../features/canvas/utils/referenceUtils';
import { GlobalDropForwarder } from '../features/canvas/components/GlobalDropForwarder';
import { CanvasStage } from '../features/canvas/components/CanvasStage';
import { CanvasSidebar } from '../features/canvas/components/CanvasSidebar';
import { CanvasContextMenus } from '../features/canvas/components/CanvasContextMenus';
import { CanvasToolbar } from '../features/canvas/components/CanvasToolbar';

/* ─── Flow Inner ─── */

function FlowCanvas() {
  const { projectId } = useParams<{ projectId?: string }>();
  const projectName = useMemo(() => {
    if (!projectId || projectId === 'new') return '未命名项目';
    return recentProjects.find((p) => p.id === projectId)?.name || '未命名项目';
  }, [projectId]);

  const defaultData = useMemo(() => {
    if (!projectId || projectId === 'new') return getProjectCanvasData('new');
    return getProjectCanvasData(projectId);
  }, [projectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultData.nodes as Node[]);
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();
  const { msg: toastMsg } = useToast();

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // ─── Line Drawing State ───
  const [edges, setEdges] = useState<Edge[]>([]);
  const [tempLine, setTempLine] = useState<{ sourceNodeId: string; currentX: number; currentY: number } | null>(null);
  const [createMenu, setCreateMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number }; sourceNodeId: string } | null>(null);
  const [rejectTooltip, setRejectTooltip] = useState<{ x: number; y: number; message: string } | null>(null);
  const isDrawingRef = useRef(false);

  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Detect if adding an edge from source → target would create a cycle
  const wouldCreateCycle = useCallback((sourceId: string, targetId: string, currentEdges: Edge[]): boolean => {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    currentEdges.forEach((e) => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });
    // Add the hypothetical new edge
    if (!adj.has(sourceId)) adj.set(sourceId, []);
    adj.get(sourceId)!.push(targetId);

    // BFS from target: can we reach source?
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
  }, []);

  const startLineDraw = useCallback((nodeId: string, screenX: number, screenY: number) => {
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;
    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => posMap.set(n.id, { ...n.position }));
    nodePositionsRef.current = posMap;
    setTempLine({ sourceNodeId: nodeId, currentX: screenX, currentY: screenY });

    const clearHoverClasses = () => {
      document.querySelectorAll('.react-flow__node').forEach((n) => {
        n.classList.remove('can-connect', 'cannot-connect');
      });
    };

    const validateTarget = (targetId: string | null | undefined, inputHandle: Element | null | undefined): string | null => {
      if (!targetId) return '未找到目标节点';
      if (targetId === nodeId) return '不能将节点连接到自身';

      const effectiveInputHandle = inputHandle ?? document.querySelector(`.react-flow__node[data-id="${targetId}"] .image-node-handle.input-port`);
      const targetPortType = effectiveInputHandle?.getAttribute('data-port-type');
      if (targetPortType !== 'input') return '只能从输出端口连接到输入端口';

      const sourceDataType = (document.querySelector(`.react-flow__node[data-id="${nodeId}"] .output-port`) as HTMLElement | null)?.getAttribute('data-data-type');
      const targetDataType = (effectiveInputHandle as HTMLElement | null)?.getAttribute('data-data-type');
      if (sourceDataType !== targetDataType) return '只能连接相同类型的端口';

      if (wouldCreateCycle(nodeId, targetId, edges)) return '连接会形成环路';

      const alreadyConnected = edges.some((e) => e.source === nodeId && e.target === targetId);
      if (alreadyConnected) return '两个节点之间已存在连接';

      // 唯一用途检查
      const sourceNode = nodes.find((n) => n.id === nodeId);
      const sourceRole = sourceNode?.data?.role as ImageRole | null;
      if (sourceRole && UNIQUE_USAGES.includes(sourceRole)) {
        const targetInputEdges = edges.filter((e) => e.target === targetId);
        const hasSameRole = targetInputEdges.some((edge) => {
          const refNode = nodes.find((n) => n.id === edge.source);
          const effectiveRole = (edge.data?.role as ImageRole | null | undefined) ?? ((refNode?.data?.role as ImageRole | null | undefined) ?? null);
          return effectiveRole === sourceRole;
        });
        if (hasSameRole) {
          return `该节点已存在【${getImageRoleLabel(sourceRole)}】引用，请先删除现有引用。`;
        }
      }

      return null;
    };

    const handleMouseMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      setTempLine((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      // 恢复所有节点位置，阻止 React Flow 移动它们
      setNodes((nds) => nds.map((n) => {
        const original = nodePositionsRef.current.get(n.id);
        return original ? { ...n, position: original } : n;
      }));

      // 清除之前的 hover 状态
      clearHoverClasses();

      // 检测当前鼠标下方的节点，实时显示可连接/不可连接反馈
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');
      if (targetId && nodeEl) {
        const error = validateTarget(targetId, null);
        if (error) {
          nodeEl.classList.add('cannot-connect');
          setRejectTooltip({ x: e.clientX, y: e.clientY, message: '无法连接' });
        } else {
          nodeEl.classList.add('can-connect');
          setRejectTooltip(null);
        }
      } else {
        setRejectTooltip(null);
      }
    };

    const handleMouseUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
      clearHoverClasses();

      // 检测落点是否落在某个节点上（不限于 input port）
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const inputHandle = el?.closest('.image-node-handle');
      const nodeEl = inputHandle?.closest('.react-flow__node') ?? el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');

      // ─── Connection validation ───
      const fail = () => {
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: '无法连接' });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 500);
        setTempLine(null);
      };

      if (!targetId) {
        setCreateMenu({ x: e.clientX, y: e.clientY, flowPos: screenToFlowPosition({ x: e.clientX, y: e.clientY }), sourceNodeId: nodeId });
        setTempLine(null);
        return;
      }

      // 如果没有直接落在 input port 上，从目标节点中自动查找 input port
      if (!nodeEl) { fail(); return; }
      const effectiveInputHandle = inputHandle ?? nodeEl.querySelector('.image-node-handle.input-port');
      const error = validateTarget(targetId, effectiveInputHandle);
      if (error) {
        fail();
        return;
      }

      // All checks passed — create edge
      setEdges((eds) => [...eds, { id: `e-${Date.now()}`, source: nodeId, target: targetId, sourceHandle: 'right-source', targetHandle: 'left-target', style: { stroke: '#555', strokeWidth: 1 } }]);
      setTempLine(null);
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
  }, [screenToFlowPosition, nodes, edges, wouldCreateCycle]);

  // Update edge styles when node selection changes (connected edges turn cyan)
  const selectedIdsRef = useRef('');
  useEffect(() => {
    const ids = nodes.filter((n) => n.selected).map((n) => n.id).sort().join(',');
    if (ids === selectedIdsRef.current) return;
    selectedIdsRef.current = ids;

    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setEdges((eds) => eds.map((edge) => {
      const isConnected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      return {
        ...edge,
        selected: isConnected,
        style: isConnected ? { stroke: '#00d4ff', strokeWidth: 1 } : { stroke: '#555', strokeWidth: 1 },
      };
    }));
  }, [nodes]);

  const removeReferenceEdge = useCallback((targetNodeId: string, sourceNodeId: string) => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === targetNodeId)));
  }, []);

  const assignReferenceEdgeRole = useCallback((targetNodeId: string, sourceNodeId: string, role: ImageRole, customRoleLabel?: string) => {
    const roleData = getRoleData(role, customRoleLabel);
    setEdges((eds) =>
      eds.map((edge) =>
        edge.source === sourceNodeId && edge.target === targetNodeId
          ? { ...edge, data: { ...edge.data, ...roleData } }
          : edge,
      ),
    );
    setNodes((nds) => nds.map((node) => (node.id === sourceNodeId ? { ...node, data: { ...node.data, ...roleData } } : node)));
  }, []);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        onStartLineDraw: startLineDraw,
        onRemoveReferenceEdge: removeReferenceEdge,
        onAssignReferenceEdgeRole: assignReferenceEdgeRole,
      },
    }));
  }, [nodes, startLineDraw, removeReferenceEdge, assignReferenceEdgeRole]);

  // ─── Copy / Paste / Delete ───
  const clipboardRef = useRef<{ type: string; data: Record<string, unknown>; position: { x: number; y: number } }[]>([]);
  const pasteOffsetRef = useRef(0);

  const copyNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    clipboardRef.current = selected.map((n) => ({
      type: n.type!,
      data: { ...n.data },
      position: { ...n.position },
    }));
    pasteOffsetRef.current = 0;
  }, [nodes]);

  const pasteNodes = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    pasteOffsetRef.current += 40;
    const offset = pasteOffsetRef.current;
    const pasted = clipboardRef.current.map((n, i) => ({
      id: `${n.type}-${Date.now()}-${i}`,
      type: n.type,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      data: { ...n.data },
      selected: true,
    }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pasted]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    const hasSelectedNodes = nodes.some((n) => n.selected);
    const hasSelectedEdges = edges.some((e) => e.selected);
    if (!hasSelectedNodes && !hasSelectedEdges) return;
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [nodes, edges, setNodes, setEdges]);

  // ─── History (Undo / Redo) ───
  const historyRef = useRef<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);

  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    const last = historyRef.current[historyIndexRef.current];
    if (
      last &&
      JSON.stringify(last.nodes) === JSON.stringify(nodes) &&
      JSON.stringify(last.edges) === JSON.stringify(edges)
    ) {
      return;
    }
    historyIndexRef.current += 1;
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current);
    historyRef.current.push({ nodes: [...nodes], edges: [...edges] });
    if (historyRef.current.length > 50) {
      historyRef.current.shift();
      historyIndexRef.current -= 1;
    }
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      skipHistoryRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      skipHistoryRef.current = true;
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [setNodes, setEdges]);

  const selectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
  }, [setNodes]);

  const deselectAll = useCallback(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
  }, [setNodes, setEdges]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: true,
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setNodeContextMenu(null);
  }, [nodes, setNodes]);

  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu(null);
    setNodeContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  // ─── Selection Marquee Pre-highlight ───
  const isSelectingRef = useRef(false);
  const rAFIdRef = useRef<number | null>(null);

  const clearPreselection = useCallback(() => {
    document.querySelectorAll('.react-flow__node.preselected').forEach((el) => {
      el.classList.remove('preselected');
    });
  }, []);

  const updatePreselection = useCallback(() => {
    if (!isSelectingRef.current) return;
    const selectionEl = document.querySelector('.react-flow__selection') as HTMLElement | null;
    if (!selectionEl) {
      clearPreselection();
      rAFIdRef.current = requestAnimationFrame(updatePreselection);
      return;
    }
    const selRect = selectionEl.getBoundingClientRect();
    const preselected = new Set<string>();

    document.querySelectorAll('.react-flow__node').forEach((el) => {
      const nodeRect = el.getBoundingClientRect();
      const intersects = !(
        selRect.right < nodeRect.left ||
        selRect.left > nodeRect.right ||
        selRect.bottom < nodeRect.top ||
        selRect.top > nodeRect.bottom
      );
      const id = (el as HTMLElement).dataset.id;
      if (intersects && id) {
        preselected.add(id);
        el.classList.add('preselected');
      } else {
        el.classList.remove('preselected');
      }
    });

    rAFIdRef.current = requestAnimationFrame(updatePreselection);
  }, [clearPreselection]);

  const onSelectionStart = useCallback(() => {
    isSelectingRef.current = true;
    if (rAFIdRef.current) cancelAnimationFrame(rAFIdRef.current);
    rAFIdRef.current = requestAnimationFrame(updatePreselection);
  }, [updatePreselection]);

  const onSelectionEnd = useCallback(() => {
    isSelectingRef.current = false;
    if (rAFIdRef.current) {
      cancelAnimationFrame(rAFIdRef.current);
      rAFIdRef.current = null;
    }
    clearPreselection();
  }, [clearPreselection]);

  // ─── Toolbar State (showHelp used in keyboard shortcuts) ───
  const [showHelp, setShowHelp] = useState(false);

  // ─── Keyboard Shortcuts ───
  const copyRef = useRef(copyNodes);
  const pasteRef = useRef(pasteNodes);
  const deleteRef = useRef(deleteSelected);
  const undoRef = useRef(undo);
  const redoRef = useRef(redo);
  const selectAllRef = useRef(selectAll);
  const deselectAllRef = useRef(deselectAll);
  useEffect(() => { copyRef.current = copyNodes; }, [copyNodes]);
  useEffect(() => { pasteRef.current = pasteNodes; }, [pasteNodes]);
  useEffect(() => { deleteRef.current = deleteSelected; }, [deleteSelected]);
  useEffect(() => { undoRef.current = undo; }, [undo]);
  useEffect(() => { redoRef.current = redo; }, [redo]);
  useEffect(() => { selectAllRef.current = selectAll; }, [selectAll]);
  useEffect(() => { deselectAllRef.current = deselectAll; }, [deselectAll]);

  // Prevent browser context menu on canvas area
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__pane') || target.closest('.react-flow__renderer')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler, true);
    return () => document.removeEventListener('contextmenu', handler, true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.isComposing) return;

      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const isEditing = tag === 'input' || tag === 'textarea' || target.isContentEditable;

      // Copy / Paste (global)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteRef.current();
        return;
      }

      // Esc closes help panel first, then deselects
      if (e.key === 'Escape') {
        if (showHelp) {
          e.preventDefault();
          setShowHelp(false);
          return;
        }
      }

      // Canvas shortcuts (skip when editing text)
      if (isEditing) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteRef.current();
        return;
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redoRef.current();
        } else {
          undoRef.current();
        }
        return;
      }

      // Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        selectAllRef.current();
        return;
      }

      // Escape deselects
      if (e.key === 'Escape') {
        e.preventDefault();
        deselectAllRef.current();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = 40 / zoomRef.current;
        const current = getViewport();
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = step;
        if (e.key === 'ArrowDown') dy = -step;
        if (e.key === 'ArrowLeft') dx = step;
        if (e.key === 'ArrowRight') dx = -step;
        setViewport({ x: current.x + dx, y: current.y + dy, zoom: current.zoom }, { duration: 0 });
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        const current = getViewport();
        setViewport({ ...current, zoom: Math.min(current.zoom * 1.15, 4) }, { duration: 0 });
        return;
      }

      if (e.key === '-') {
        e.preventDefault();
        const current = getViewport();
        setViewport({ ...current, zoom: Math.max(current.zoom / 1.15, 0.2) }, { duration: 0 });
        return;
      }

      if (e.key === '0' || e.key === 'f' || e.key === 'F' || e.key === '1') {
        e.preventDefault();
        fitView({ duration: 400 });
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getViewport, setViewport, fitView, showHelp]);

  // ─── Drag & Drop State ───
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadToast, setUploadToast] = useState<{ msg: string; type: 'loading' | 'success' } | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Toolbar State ───
  const [showMinimap, setShowMinimap] = useState(false);
  const [snapGrid, setSnapGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  const onViewportChange = useCallback((v: { x: number; y: number; zoom: number }) => {
    setZoom(v.zoom);
  }, []);

  const handleReset = useCallback(() => {
    fitView({ duration: 400 });
  }, [fitView]);

  const addNode = useCallback(
    (type: string, pos?: { x: number; y: number }, customLabel?: string) => {
      const position = pos || { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 };
      const labels: Record<string, string> = {
        text: '文本节点',
        image: '图片生成',
        upscale: '高清放大',
        video: '视频生成',
        audio: '音频节点',
        script: '脚本节点',
        'video-merge': '视频合成',
      };
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: customLabel || labels[type] || type, ...(type === 'image' ? getRoleData(null) : {}) },
      };
      setNodes((nds) => [...nds, newNode]);
      setContextMenu(null);
    },
    [setNodes],
  );

  const handleDropFiles = useCallback(
    (files: FileList, screenX: number, screenY: number) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const basePos = screenToFlowPosition({ x: screenX, y: screenY });
      setUploadToast({ msg: '上传中...', type: 'loading' });

      Promise.all(
        imageFiles.map((file, index) => {
          return new Promise<void>((resolve) => {
            const url = URL.createObjectURL(file);
            const imgEl = new window.Image();
            imgEl.onload = () => {
              const offsetX = index * 40;
              const offsetY = index * 40;
              const position = { x: basePos.x + offsetX, y: basePos.y + offsetY };
              const newNode: Node = {
                id: `image-${Date.now()}-${index}`,
                type: 'image',
                position,
                data: {
                  label: file.name.replace(/\.[^/.]+$/, ''),
                  image: url,
                  width: imgEl.width,
                  height: imgEl.height,
                  ...getRoleData(null),
                },
                selected: index === 0,
              };
              setNodes((nds) => [
                ...nds.map((n) => ({ ...n, selected: false })),
                newNode,
              ]);
              resolve();
            };
            imgEl.src = url;
          });
        }),
      ).then(() => {
        setUploadToast({ msg: '上传并成功创建节点', type: 'success' });
        setTimeout(() => setUploadToast(null), 2500);
      });
    },
    [screenToFlowPosition, setNodes],
  );

  // ─── Canvas Stage Handlers ───
  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    if (isDrawingRef.current) { e.preventDefault(); return; }
    const target = e.target as HTMLElement;
    if (target.closest('.react-flow__node')) return;
    e.preventDefault();
    setNodeContextMenu(null);
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setContextMenu({ x: e.clientX, y: e.clientY, flowPos: pos });
  }, [screenToFlowPosition]);

  const handleCanvasDragOver = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-visioner-reference-reorder') ||
      !e.dataTransfer.types.includes('Files')
    ) {
      return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setIsDragOver(true);
  }, []);

  const handleCanvasDragLeave = useCallback(() => {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    dragLeaveTimer.current = setTimeout(() => setIsDragOver(false), 50);
  }, []);

  const handleCanvasDrop = useCallback((e: React.DragEvent) => {
    if (
      e.dataTransfer.types.includes('application/x-visioner-reference-reorder') ||
      !e.dataTransfer.types.includes('Files')
    ) {
      setIsDragOver(false);
      return;
    }
    e.preventDefault();
    setIsDragOver(false);
    handleDropFiles(e.dataTransfer.files, e.clientX, e.clientY);
  }, [handleDropFiles]);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === edge.id })));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setEdges, setNodes]);

  const handlePaneClick = useCallback(() => {
    setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [setEdges, setNodes]);

  const handleDragOverCapture = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/x-visioner-reference-reorder')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleDropCapture = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/x-visioner-reference-reorder')) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  // ─── Context Menu Handlers ───
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCloseCreateMenu = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
    setCreateMenu(null);
  }, []);

  const handleCloseNodeContextMenu = useCallback(() => {
    setContextMenu(null);
    setNodeContextMenu(null);
  }, []);

  const handleContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    const pos = screenToFlowPosition({ x: clientX, y: clientY });
    setContextMenu({ x: clientX, y: clientY, flowPos: pos });
  }, [screenToFlowPosition]);

  const handleNodeContextMenuReopen = useCallback((clientX: number, clientY: number) => {
    if (!nodeContextMenu) return;
    setNodeContextMenu({ x: clientX, y: clientY, nodeId: nodeContextMenu.nodeId });
  }, [nodeContextMenu]);

  const handleContextMenuAddNode = useCallback((type: string, label: string) => {
    if (!contextMenu) return;
    addNode(type, contextMenu.flowPos, label);
  }, [contextMenu, addNode]);

  const handleCreateAndConnect = useCallback((type: string) => {
    if (!createMenu) return;
    const newNodeId = `${type}-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type,
      position: createMenu.flowPos,
      data: { label: type === 'image' ? '图片节点' : '高清放大', ...(type === 'image' ? getRoleData(null) : {}) },
    };
    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, { id: `e-${Date.now()}`, source: createMenu.sourceNodeId, target: newNodeId }]);
    setCreateMenu(null);
  }, [createMenu, setNodes, setEdges]);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
  }, [setNodes]);

  // ─── Toolbar Handlers ───
  const handleZoomChange = useCallback((value: number) => {
    const current = getViewport();
    setViewport({ x: current.x, y: current.y, zoom: value }, { duration: 0 });
  }, [getViewport, setViewport]);

  return (
    <div className="h-screen relative" style={{ background: '#000' }}>
      <GlobalDropForwarder />
      <Navbar variant="canvas" projectName={projectName} />

      {/* Global style overrides */}
      <style>{`
        .react-flow__node {
          transition: box-shadow 200ms ease;
        }
        .react-flow__attribution {
          display: none !important;
        }
        /* Image node handles — hidden by default, shown on hover or when selected */
        .image-node-handle {
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: auto;
          cursor: crosshair;
        }
        .react-flow__node:hover .image-node-handle,
        .react-flow__node.selected .image-node-handle,
        .image-node-handle:hover {
          opacity: 1;
        }
        .image-role-tag-button:hover {
          border-color: rgba(0,212,255,0.62) !important;
          color: #ffffff !important;
        }
        /* Edge colors — gray by default, cyan when selected */
        .react-flow__edge-path {
          stroke: #555;
          stroke-width: 1;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #00d4ff !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 6px rgba(0,212,255,0.6));
        }
        /* Hide default edge markers if any */
        .react-flow__edge .react-flow__edge-interaction {
          stroke: transparent;
        }
        /* Hide the persistent selection rect around selected nodes after box selection */
        .react-flow__nodesselection-rect {
          border: none !important;
          background: transparent !important;
        }
        /* Connection hover feedback on nodes */
        .react-flow__node.can-connect {
          box-shadow: none !important;
        }
        .react-flow__node.can-connect .node-preview-card {
          border-color: #00d4ff !important;
          box-shadow: 0 0 0 2px #00d4ff, 0 0 16px rgba(0, 212, 255, 0.5) !important;
        }
        .react-flow__node.cannot-connect {
          box-shadow: none !important;
        }
        .react-flow__node.cannot-connect .node-preview-card {
          border-color: #ff4444 !important;
          box-shadow: 0 0 0 2px #ff4444, 0 0 20px rgba(255, 68, 68, 0.6) !important;
        }
      `}</style>

      <CanvasStage
        tempLine={tempLine}
        isDragOver={isDragOver}
        rejectTooltip={rejectTooltip}
        uploadToast={uploadToast}
        nodesWithCallbacks={nodesWithCallbacks}
        edges={edges}
        snapGrid={snapGrid}
        showMinimap={showMinimap}
        onContextMenu={handleCanvasContextMenu}
        onDragOver={handleCanvasDragOver}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
        onNodesChange={onNodesChange}
        onNodeContextMenu={onNodeContextMenu}
        onViewportChange={onViewportChange}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onDragOverCapture={handleDragOverCapture}
        onDropCapture={handleDropCapture}
      />

      <CanvasSidebar
        activePanel={activePanel}
        onSetActivePanel={setActivePanel}
        onAddNode={addNode}
      />

      <CanvasContextMenus
        contextMenu={contextMenu}
        onCloseContextMenu={handleCloseContextMenu}
        onContextMenuAddNode={handleContextMenuAddNode}
        onContextMenuReopen={handleContextMenuReopen}
        createMenu={createMenu}
        onCloseCreateMenu={handleCloseCreateMenu}
        onCreateAndConnect={handleCreateAndConnect}
        nodeContextMenu={nodeContextMenu}
        onCloseNodeContextMenu={handleCloseNodeContextMenu}
        onNodeContextMenuReopen={handleNodeContextMenuReopen}
        onNodeDuplicate={duplicateNode}
        onNodePaste={pasteNodes}
        onNodeDelete={handleNodeDelete}
        onNodeCopy={copyNodes}
      />

      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {toastMsg}
        </div>
      )}

      <CanvasToolbar
        showMinimap={showMinimap}
        onToggleMinimap={() => setShowMinimap((v) => !v)}
        snapGrid={snapGrid}
        onToggleSnapGrid={() => setSnapGrid((v) => !v)}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onReset={handleReset}
        showHelp={showHelp}
        onToggleHelp={() => setShowHelp((v) => !v)}
      />
    </div>
  );
}

/* ─── Wrapper ─── */

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
