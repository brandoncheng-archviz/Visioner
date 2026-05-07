import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { EditorNode, EditorEdge, Camera, SelectionBox, ConnectionPreview } from '@/lib/nodeEditor/types';
import { PORT_TYPE_META } from '@/lib/nodeEditor/types';
import {
  canConnect,
  wouldFormCycle,
  getExecutionBatches,
  buildNodeInputs,
  hashInput,
} from '@/lib/nodeEditor/dag';
import { NODE_TEMPLATES, NODE_CATEGORIES, createNodeFromTemplate } from './NodeRegistry';

/* ─── Constants ─── */

const PORT_RADIUS = 6;
const PORT_HOVER_RADIUS = 20;
const HEADER_H = 36;
const NODE_RADIUS = 12;
const BG_COLOR = '#09090b';
const GRID_COLOR = 'rgba(255,255,255,0.03)';
const GRID_SIZE = 40;
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 3.0;

/* ─── Helpers ─── */

function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

function screenToWorld(sx: number, sy: number, cam: Camera) {
  return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
}

function dist(x1: number, y1: number, x2: number, y2: number) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function bezierPath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function hitTestNode(mx: number, my: number, n: EditorNode): boolean {
  return mx >= n.x && mx <= n.x + n.width && my >= n.y && my <= n.y + n.height;
}

function getPortPos(node: EditorNode, portId: string, isInput: boolean) {
  const ports = isInput ? node.inputs : node.outputs;
  const idx = ports.findIndex((p) => p.id === portId);
  if (idx < 0) return null;
  const total = ports.length;
  const spacing = node.height > HEADER_H + 20 ? (node.height - HEADER_H - 20) / Math.max(total, 1) : 20;
  const y = node.y + HEADER_H + 10 + spacing * idx + spacing / 2;
  const x = isInput ? node.x : node.x + node.width;
  return { x, y };
}

function findPortAt(nodes: EditorNode[], mx: number, my: number, wantInput: boolean) {
  for (const n of nodes) {
    const ports = wantInput ? n.inputs : n.outputs;
    for (const p of ports) {
      const pos = getPortPos(n, p.id, wantInput);
      if (!pos) continue;
      if (dist(mx, my, pos.x, pos.y) <= PORT_HOVER_RADIUS) {
        return { node: n, port: p, pos };
      }
    }
  }
  return null;
}

/* ─── Main Component ─── */

export default function NodeEditorCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [nodes, setNodes] = useState<EditorNode[]>([
    createNodeFromTemplate('PromptInput', uid(), 100, 150),
    createNodeFromTemplate('LoadModel', uid(), 100, 300),
    createNodeFromTemplate('TextEncode', uid(), 400, 150),
    createNodeFromTemplate('EmptyLatent', uid(), 400, 350),
    createNodeFromTemplate('KSampler', uid(), 700, 200),
    createNodeFromTemplate('VAEDecode', uid(), 1000, 200),
    createNodeFromTemplate('PreviewImage', uid(), 1300, 200),
  ]);
  const [edges, setEdges] = useState<EditorEdge[]>([]);

  const cameraRef = useRef<Camera>({ x: 100, y: 50, zoom: 1 });
  const [camera, setCamera] = useState<Camera>(cameraRef.current);

  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [connPreview, setConnPreview] = useState<ConnectionPreview | null>(null);
  const [draggingNodes, setDraggingNodes] = useState(false);
  const [panning, setPanning] = useState(false);

  const [showSearch, setShowSearch] = useState(false);
  const [searchPos, setSearchPos] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'node' | 'canvas' | 'edge'; targetId?: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; color: string } | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, color = '#ef4444') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, color });
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const [executing, setExecuting] = useState(false);

  // ─── Drawing ───
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cam = cameraRef.current;
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const offsetX = cam.x % (GRID_SIZE * cam.zoom);
    const offsetY = cam.y % (GRID_SIZE * cam.zoom);
    for (let x = offsetX; x < w; x += GRID_SIZE * cam.zoom) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = offsetY; y < h; y += GRID_SIZE * cam.zoom) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // Edges
    for (const edge of edges) {
      const sNode = nodes.find((n) => n.id === edge.sourceNodeId);
      const tNode = nodes.find((n) => n.id === edge.targetNodeId);
      if (!sNode || !tNode) continue;
      const sPos = getPortPos(sNode, edge.sourcePortId, false);
      const tPos = getPortPos(tNode, edge.targetPortId, true);
      if (!sPos || !tPos) continue;

      const sPort = sNode.outputs.find((p) => p.id === edge.sourcePortId);
      const color = sPort ? PORT_TYPE_META[sPort.type].color : '#5a5a6a';

      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.globalAlpha = edge.selected ? 1 : 0.6;
      ctx.lineWidth = edge.selected ? 3 : 2;
      if (edge.selected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
      }
      const path = new Path2D(bezierPath(sPos.x, sPos.y, tPos.x, tPos.y));
      ctx.stroke(path);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      // Hit area for edge (invisible thicker line)
      if (edge.selected) {
        ctx.beginPath();
        ctx.strokeStyle = 'transparent';
        ctx.lineWidth = 12;
        ctx.stroke(path);
      }
    }

    // Connection preview
    if (connPreview) {
      const sNode = nodes.find((n) => n.id === connPreview.sourceNodeId);
      if (sNode) {
        const sPos = getPortPos(sNode, connPreview.sourcePortId, false);
        if (sPos) {
          const sPort = sNode.outputs.find((p) => p.id === connPreview.sourcePortId);
          const color = connPreview.valid
            ? (sPort ? PORT_TYPE_META[sPort.type].color : '#22d3ee')
            : '#ef4444';

          const { x: mx, y: my } = screenToWorld(connPreview.mouseX, connPreview.mouseY, cam);

          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash(connPreview.valid ? [] : [6, 4]);
          ctx.globalAlpha = connPreview.valid ? 0.8 : 0.6;
          ctx.stroke(new Path2D(bezierPath(sPos.x, sPos.y, mx, my)));
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Nodes
    for (const n of nodes) {
      drawNode(ctx, n);
    }

    // Selection box
    if (selectionBox) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(59,130,246,0.1)';
      ctx.setLineDash([4, 4]);
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, [nodes, edges, connPreview, selectionBox]);

  // ─── Animation Loop ───
  useEffect(() => {
    let raf: number;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // ─── Resize ───
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Mouse Interaction ───
  const mouseDownRef = useRef<{ x: number; y: number; button: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; nodeIds: string[] } | null>(null);
  const panStartRef = useRef<{ x: number; y: number; camX: number; camY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy, cameraRef.current);

    mouseDownRef.current = { x: sx, y: sy, button: e.button };

    // Right click -> context menu
    if (e.button === 2) {
      const hitNode = nodes.find((n) => hitTestNode(wx, wy, n));
      if (hitNode) {
        setContextMenu({ x: e.clientX, y: e.clientY, type: 'node', targetId: hitNode.id });
      } else {
        const hitEdge = findEdgeAt(nodes, edges, wx, wy);
        if (hitEdge) {
          setContextMenu({ x: e.clientX, y: e.clientY, type: 'edge', targetId: hitEdge.id });
        } else {
          setContextMenu({ x: e.clientX, y: e.clientY, type: 'canvas' });
        }
      }
      return;
    }

    // Middle click -> pan
    if (e.button === 1) {
      panStartRef.current = { x: sx, y: sy, camX: cameraRef.current.x, camY: cameraRef.current.y };
      setPanning(true);
      return;
    }

    // Check port hit (start connection)
    const outPort = findPortAt(nodes, wx, wy, false);
    if (outPort) {
      setConnPreview({
        sourceNodeId: outPort.node.id,
        sourcePortId: outPort.port.id,
        mouseX: sx,
        mouseY: sy,
        valid: true,
      });
      return;
    }

    // Check node hit (start drag)
    const hitNode = nodes.find((n) => hitTestNode(wx, wy, n));
    if (hitNode) {
      const wasSelected = hitNode.selected;
      let selectedIds: string[];

      if (e.shiftKey) {
        setNodes((prev) => prev.map((n) =>
          n.id === hitNode.id ? { ...n, selected: !n.selected } : n
        ));
        selectedIds = nodes
          .filter((n) => (n.id === hitNode.id ? !wasSelected : n.selected))
          .map((n) => n.id);
      } else if (!wasSelected) {
        setNodes((prev) => prev.map((n) => ({ ...n, selected: n.id === hitNode.id })));
        selectedIds = [hitNode.id];
      } else {
        selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);
      }

      dragStartRef.current = { x: wx, y: wy, nodeIds: selectedIds };
      setDraggingNodes(true);
      return;
    }

    // Empty space -> start box selection or deselect
    if (!e.shiftKey) {
      setNodes((prev) => prev.map((n) => ({ ...n, selected: false })));
      setEdges((prev) => prev.map((e) => ({ ...e, selected: false })));
    }
    setSelectionBox({ x: wx, y: wy, w: 0, h: 0 });
  }, [nodes, edges]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy, cameraRef.current);

    // Panning
    if (panning && panStartRef.current) {
      const dx = sx - panStartRef.current.x;
      const dy = sy - panStartRef.current.y;
      cameraRef.current = {
        ...cameraRef.current,
        x: panStartRef.current.camX + dx,
        y: panStartRef.current.camY + dy,
      };
      setCamera({ ...cameraRef.current });
      return;
    }

    // Connection preview
    if (connPreview) {
      const sNode = nodes.find((n) => n.id === connPreview.sourceNodeId);
      const sPort = sNode?.outputs.find((p) => p.id === connPreview.sourcePortId);
      const target = findPortAt(nodes, wx, wy, true);

      let valid = true;
      if (target) {
        if (target.node.id === connPreview.sourceNodeId) {
          valid = false;
        } else {
          const typeCheck = canConnect(sPort?.type || 'ANY', target.port.type);
          if (!typeCheck.valid) valid = false;
          else if (wouldFormCycle(connPreview.sourceNodeId, target.node.id, edges)) valid = false;
        }
      }

      setConnPreview({
        ...connPreview,
        mouseX: sx,
        mouseY: sy,
        valid,
        targetNodeId: target?.node.id,
        targetPortId: target?.port.id,
      });
      return;
    }

    // Node dragging
    if (draggingNodes && dragStartRef.current) {
      const dx = wx - dragStartRef.current.x;
      const dy = wy - dragStartRef.current.y;
      dragStartRef.current.x = wx;
      dragStartRef.current.y = wy;
      setNodes((prev) => prev.map((n) =>
        dragStartRef.current!.nodeIds.includes(n.id)
          ? { ...n, x: n.x + dx, y: n.y + dy }
          : n
      ));
      return;
    }

    // Box selection
    if (selectionBox) {
      const w = wx - selectionBox.x;
      const h = wy - selectionBox.y;
      setSelectionBox({ x: selectionBox.x, y: selectionBox.y, w, h });

      const boxX = Math.min(selectionBox.x, wx);
      const boxY = Math.min(selectionBox.y, wy);
      const boxW = Math.abs(w);
      const boxH = Math.abs(h);

      setNodes((prev) => prev.map((n) => {
        const inside = n.x + n.width > boxX && n.x < boxX + boxW && n.y + n.height > boxY && n.y < boxY + boxH;
        return { ...n, selected: inside };
      }));
      return;
    }
  }, [panning, connPreview, draggingNodes, selectionBox, nodes, edges]);

  const handleMouseUp = useCallback((_e: React.MouseEvent) => {
    // Connection complete
    if (connPreview) {
      if (connPreview.valid && connPreview.targetNodeId && connPreview.targetPortId) {
        setEdges((prev) => {
          const filtered = prev.filter(
            (ed) => !(ed.targetNodeId === connPreview.targetNodeId && ed.targetPortId === connPreview.targetPortId)
          );
          const sNode = nodes.find((n) => n.id === connPreview.sourceNodeId);
          const sPort = sNode?.outputs.find((p) => p.id === connPreview.sourcePortId);
          return [...filtered, {
            id: uid(),
            sourceNodeId: connPreview.sourceNodeId,
            sourcePortId: connPreview.sourcePortId,
            targetNodeId: connPreview.targetNodeId!,
            targetPortId: connPreview.targetPortId!,
            selected: false,
            transmittedType: sPort?.type,
          }];
        });
      } else if (connPreview.targetNodeId) {
        const sNode = nodes.find((n) => n.id === connPreview.sourceNodeId);
        const sPort = sNode?.outputs.find((p) => p.id === connPreview.sourcePortId);
        const tNode = nodes.find((n) => n.id === connPreview.targetNodeId);
        const tPort = tNode?.inputs.find((p) => p.id === connPreview.targetPortId);
        if (sPort && tPort) {
          const check = canConnect(sPort.type, tPort.type);
          if (!check.valid) showToast(check.reason || '类型不匹配');
          else if (wouldFormCycle(connPreview.sourceNodeId, connPreview.targetNodeId, edges)) {
            showToast('不能形成循环依赖');
          }
        }
      }
      setConnPreview(null);
      return;
    }

    setDraggingNodes(false);
    setPanning(false);
    setSelectionBox(null);
    dragStartRef.current = null;
    panStartRef.current = null;
  }, [connPreview, nodes, edges, showToast]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const cam = cameraRef.current;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.zoom * zoomFactor));

    // Zoom towards mouse pointer
    const worldBefore = screenToWorld(sx, sy, cam);
    cameraRef.current = {
      x: sx - worldBefore.x * newZoom,
      y: sy - worldBefore.y * newZoom,
      zoom: newZoom,
    };
    setCamera({ ...cameraRef.current });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      setNodes((prev) => prev.filter((n) => !n.selected));
      setEdges((prev) => prev.filter((e) => !e.selected));
    }
    if (e.key === '/') {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const center = screenToWorld(rect.width / 2, rect.height / 2, cameraRef.current);
        setSearchPos({ x: center.x, y: center.y });
        setShowSearch(true);
        setSearchQuery('');
      }
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      // Undo placeholder
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ─── Execution ───
  const handleExecute = useCallback(async () => {
    if (executing) return;
    setExecuting(true);
    showToast('开始执行工作流...', '#22d3ee');

    setNodes((prev) => prev.map((n) => ({ ...n, status: 'idle', progress: 0 })));

    const batches = getExecutionBatches(nodes, edges);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      await Promise.all(
        batch.map(async (nodeId) => {
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return;

          const inputs = buildNodeInputs(nodeId, nodes, edges);
          const inputHash = hashInput(inputs);

          if (node.cachedInputHash === inputHash && node.status === 'success') {
            return;
          }

          setNodes((prev) => prev.map((n) =>
            n.id === nodeId ? { ...n, status: 'running', progress: 0 } : n
          ));

          await new Promise((r) => setTimeout(r, 200));
          setNodes((prev) => prev.map((n) =>
            n.id === nodeId ? { ...n, progress: 0.5 } : n
          ));

          await new Promise((r) => setTimeout(r, 200));
          setNodes((prev) => prev.map((n) =>
            n.id === nodeId ? { ...n, progress: 1.0 } : n
          ));

          const outputData: Record<string, unknown> = { result: `${node.title} output` };

          setNodes((prev) => prev.map((n) =>
            n.id === nodeId
              ? { ...n, status: 'success', progress: 1, outputData, cachedInputHash: inputHash }
              : n
          ));
        })
      );
    }

    setExecuting(false);
    showToast('工作流执行完成', '#22c55e');
  }, [nodes, edges, executing, showToast]);

  // ─── Context Menu Actions ───
  const deleteNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id));
    setContextMenu(null);
  };

  const duplicateNode = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const newNode: EditorNode = {
      ...node,
      id: uid(),
      x: node.x + 30,
      y: node.y + 30,
      selected: true,
      status: 'idle',
    };
    setNodes((prev) => [...prev.map((n) => ({ ...n, selected: false })), newNode]);
    setContextMenu(null);
  };

  const deleteEdge = (id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    setContextMenu(null);
  };

  const addNodeFromSearch = (type: string) => {
    const newNode = createNodeFromTemplate(type, uid(), searchPos.x, searchPos.y);
    setNodes((prev) => [...prev, newNode]);
    setShowSearch(false);
  };

  const exportWorkflow = () => {
    const data = {
      nodes: nodes.map((n) => ({ id: n.id, type: n.type, x: n.x, y: n.y, params: n.params })),
      edges: edges.map((e) => ({ id: e.id, fromNode: e.sourceNodeId, fromPort: e.sourcePortId, toNode: e.targetNodeId, toPort: e.targetPortId })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'workflow.json';
    a.click();
    URL.revokeObjectURL(url);
    setContextMenu(null);
  };

  const filteredTemplates = Object.entries(NODE_TEMPLATES).filter(([, tmpl]) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return tmpl.title.toLowerCase().includes(q);
  });

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ background: BG_COLOR }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* Top HUD */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-xl z-10"
        style={{ background: 'rgba(19,19,31,0.9)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
        <button
          onClick={handleExecute}
          disabled={executing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: executing ? 'rgba(245,158,11,0.15)' : 'rgba(34,211,238,0.15)', color: executing ? '#f59e0b' : '#22d3ee' }}
        >
          {executing ? '◈' : '▶'} {executing ? '执行中...' : '执行'}
        </button>
        <div className="w-px h-4 bg-white/10" />
        <button onClick={exportWorkflow} className="px-2 py-1 text-[11px] text-[#a0a0b0] hover:text-white transition-colors">导出</button>
        <button onClick={() => { setNodes([]); setEdges([]); }} className="px-2 py-1 text-[11px] text-[#a0a0b0] hover:text-white transition-colors">清空</button>
        <div className="w-px h-4 bg-white/10" />
        <span className="text-[11px] text-[#6a6a7a]">{(camera.zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Bottom hint */}
      <div className="absolute bottom-3 left-3 text-[10px] text-[#4a4a55] z-10 select-none">
        滚轮缩放 · 中键/空格拖拽平移 · 右键菜单 · / 搜索节点 · Delete 删除
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2"
          style={{ background: `${toast.color}15`, color: toast.color, border: `1px solid ${toast.color}30` }}>
          {toast.msg}
        </div>
      )}

      {/* Node Search Panel */}
      {showSearch && (
        <div className="absolute inset-0 z-40 flex items-center justify-center" onClick={() => setShowSearch(false)}>
          <div className="w-80 rounded-xl overflow-hidden" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-white/5">
              <input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索节点类型..."
                className="w-full bg-transparent text-sm text-white placeholder:text-[#4a4a55] outline-none"
              />
            </div>
            <div className="max-h-72 overflow-y-auto py-1">
              {NODE_CATEGORIES.map((cat) => {
                const items = filteredTemplates.filter(([, t]) => t.category === cat.key);
                if (items.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <div className="px-3 py-1 text-[10px] text-[#4a4a55] font-medium uppercase tracking-wider">{cat.label}</div>
                    {items.map(([type, tmpl]) => (
                      <button
                        key={type}
                        onClick={() => addNodeFromSearch(type)}
                        className="w-full text-left px-3 py-2 hover:bg-white/5 transition-colors"
                      >
                        <div className="text-[13px] text-white">{tmpl.title}</div>
                        <div className="text-[10px] text-[#6a6a7a] mt-0.5">
                          {tmpl.inputs.map((p) => `${p.name}(${p.type})`).join(', ') || '无输入'}
                          {' → '}
                          {tmpl.outputs.map((p) => `${p.name}(${p.type})`).join(', ') || '无输出'}
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })}
              {filteredTemplates.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-[#4a4a55]">无匹配节点</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 py-1.5 rounded-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#13131f',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
            minWidth: 140,
          }}
        >
          {contextMenu.type === 'node' && contextMenu.targetId && (
            <>
              <button onClick={() => duplicateNode(contextMenu.targetId!)} className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors">复制节点</button>
              <button onClick={() => deleteNode(contextMenu.targetId!)} className="w-full px-3 py-2 text-left text-[13px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors">删除节点</button>
            </>
          )}
          {contextMenu.type === 'edge' && contextMenu.targetId && (
            <button onClick={() => deleteEdge(contextMenu.targetId!)} className="w-full px-3 py-2 text-left text-[13px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors">断开连接</button>
          )}
          {contextMenu.type === 'canvas' && (
            <>
              <button onClick={() => { setSearchPos({ x: 0, y: 0 }); setShowSearch(true); setContextMenu(null); }} className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors">添加节点</button>
              <button onClick={exportWorkflow} className="w-full px-3 py-2 text-left text-[13px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors">导出工作流</button>
            </>
          )}
        </div>
      )}
      {contextMenu && <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />}
    </div>
  );
}

/* ─── Drawing Functions ─── */

function drawNode(ctx: CanvasRenderingContext2D, n: EditorNode) {
  const { x, y, width, height, title, inputs, outputs, selected, status, progress } = n;

  // Shadow
  ctx.shadowColor = selected ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = selected ? 12 : 8;
  ctx.shadowOffsetY = 4;

  // Body
  ctx.beginPath();
  roundRect(ctx, x, y, width, height, NODE_RADIUS);
  ctx.fillStyle = 'rgba(26,26,46,0.95)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Border
  ctx.lineWidth = selected ? 2 : 1;
  ctx.strokeStyle = selected ? '#3b82f6' : 'rgba(255,255,255,0.08)';
  if (status === 'running') ctx.strokeStyle = '#f59e0b';
  if (status === 'success') ctx.strokeStyle = '#22c55e';
  if (status === 'error') ctx.strokeStyle = '#ef4444';
  ctx.stroke();

  // Header
  ctx.beginPath();
  roundRectTop(ctx, x, y, width, HEADER_H, NODE_RADIUS);
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fill();

  // Header bottom line
  ctx.beginPath();
  ctx.moveTo(x, y + HEADER_H);
  ctx.lineTo(x + width, y + HEADER_H);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Title
  ctx.fillStyle = '#f4f4f5';
  ctx.font = '13px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, x + 12, y + HEADER_H / 2);

  // Status icon
  if (status === 'success') {
    ctx.fillStyle = '#22c55e';
    ctx.font = '11px sans-serif';
    ctx.fillText('✓', x + width - 20, y + HEADER_H / 2);
  } else if (status === 'error') {
    ctx.fillStyle = '#ef4444';
    ctx.font = '11px sans-serif';
    ctx.fillText('!', x + width - 18, y + HEADER_H / 2);
  }

  // Progress bar (running)
  if (status === 'running' && progress !== undefined) {
    const pw = width * progress;
    ctx.beginPath();
    roundRectTop(ctx, x, y, pw, 3, 0);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();
  }

  // Input ports
  inputs.forEach((port, i) => {
    const py = y + HEADER_H + 14 + i * 28;
    const meta = PORT_TYPE_META[port.type];
    drawPort(ctx, x, py, meta.color, port.name, true);
  });

  // Output ports
  outputs.forEach((port, i) => {
    const py = y + HEADER_H + 14 + i * 28;
    const meta = PORT_TYPE_META[port.type];
    drawPort(ctx, x + width, py, meta.color, port.name, false);
  });
}

function drawPort(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string, isLeft: boolean) {
  // Port circle
  ctx.beginPath();
  ctx.arc(x, y, PORT_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = `${color}33`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = color;
  ctx.stroke();

  // Label
  ctx.fillStyle = '#a0a0b0';
  ctx.font = '10px Inter, sans-serif';
  ctx.textBaseline = 'middle';
  if (isLeft) {
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 14, y);
  } else {
    ctx.textAlign = 'right';
    ctx.fillText(name, x - 14, y);
  }
  ctx.textAlign = 'start';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function roundRectTop(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function findEdgeAt(nodes: EditorNode[], edges: EditorEdge[], mx: number, my: number): EditorEdge | null {
  for (const edge of edges) {
    const sNode = nodes.find((n) => n.id === edge.sourceNodeId);
    const tNode = nodes.find((n) => n.id === edge.targetNodeId);
    if (!sNode || !tNode) continue;
    const sPos = getPortPos(sNode, edge.sourcePortId, false);
    const tPos = getPortPos(tNode, edge.targetPortId, true);
    if (!sPos || !tPos) continue;

    const steps = 20;
    let minDist = Infinity;
    const dx = Math.abs(tPos.x - sPos.x) * 0.5;

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ix = (1 - t) * (1 - t) * (1 - t) * sPos.x
        + 3 * (1 - t) * (1 - t) * t * (sPos.x + dx)
        + 3 * (1 - t) * t * t * (tPos.x - dx)
        + t * t * t * tPos.x;
      const iy = (1 - t) * (1 - t) * (1 - t) * sPos.y
        + 3 * (1 - t) * (1 - t) * t * sPos.y
        + 3 * (1 - t) * t * t * tPos.y
        + t * t * t * tPos.y;
      const d = dist(mx, my, ix, iy);
      if (d < minDist) minDist = d;
    }

    if (minDist < 8) return edge;
  }
  return null;
}
