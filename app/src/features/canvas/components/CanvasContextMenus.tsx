import { Image, Download, Copy, ClipboardPaste, Trash2, Bug } from 'lucide-react';
import type { Node } from '@xyflow/react';

/* ─── Canvas Context Menu (right-click on empty canvas) ─── */

export interface CanvasContextMenuData {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
}

export interface CanvasContextMenuProps {
  menu: CanvasContextMenuData | null;
  onClose: () => void;
  onAddNode: (type: string, label: string) => void;
  onReopen: (clientX: number, clientY: number) => void;
}

export function CanvasContextMenu({ menu, onClose, onAddNode, onReopen }: CanvasContextMenuProps) {
  if (!menu) return null;

  const items = [
    { type: 'image', label: '图片节点', icon: Image, color: '#22d3ee' },
    { type: 'upscale', label: '高清放大', icon: Image, color: '#a855f7' },
  ];

  return (
    <>
      <div
        className="fixed z-50 py-2 rounded-xl"
        style={{
          left: menu.x,
          top: menu.y,
          background: '#252526',
          border: '1px solid #2a2a35',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          minWidth: 280,
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
        }}
      >
        <div className="px-5 py-2.5 text-[13px] text-[#6a6a7a] uppercase tracking-wider">添加节点</div>
        {items.map((item, index) => (
          <button
            key={`${item.type}-${index}`}
            onClick={() => onAddNode(item.type, item.label)}
            className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-[16px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
          >
            <item.icon className="w-5 h-5" style={{ color: item.color }} />
            {item.label}
          </button>
        ))}
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    </>
  );
}

/* ─── Create Node Menu (drop on empty canvas during connection) ─── */

export interface CreateNodeMenuData {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
  sourceNodeId: string;
}

export interface CreateNodeMenuProps {
  menu: CreateNodeMenuData | null;
  onClose: () => void;
  onCreateAndConnect: (type: string) => void;
}

export function CreateNodeMenu({ menu, onClose, onCreateAndConnect }: CreateNodeMenuProps) {
  if (!menu) return null;

  return (
    <>
      <div
        className="fixed z-50 py-2 rounded-xl"
        style={{
          left: menu.x,
          top: menu.y,
          background: '#252526',
          border: '1px solid #2a2a35',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          minWidth: 200,
        }}
      >
        <div className="px-4 py-2 text-[13px] text-[#6a6a7a] uppercase tracking-wider">创建节点并连接</div>
        <button
          onClick={() => onCreateAndConnect('image')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Image className="w-4 h-4" style={{ color: '#22d3ee' }} /> 图片节点
        </button>
        <button
          onClick={() => onCreateAndConnect('upscale')}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Image className="w-4 h-4" style={{ color: '#a855f7' }} /> 高清放大
        </button>
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    </>
  );
}

/* ─── Node Context Menu (right-click on a node) ─── */

export interface NodeContextMenuData {
  x: number;
  y: number;
  nodeId: string;
}

export interface NodeContextMenuProps {
  menu: NodeContextMenuData | null;
  onClose: () => void;
  onReopen: (clientX: number, clientY: number) => void;
  onDuplicate: (nodeId: string) => void;
  onPaste: () => void;
  onDelete: (nodeId: string) => void;
  onCopy: () => void;
}

export function NodeContextMenu({
  menu,
  onClose,
  onReopen,
  onDuplicate,
  onPaste,
  onDelete,
  onCopy,
}: NodeContextMenuProps) {
  if (!menu) return null;

  return (
    <>
      <div
        className="fixed z-50 py-1.5 rounded-xl"
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
        }}
        style={{
          left: menu.x,
          top: menu.y,
          background: '#252526',
          border: '1px solid #2a2a35',
          boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
          minWidth: 200,
        }}
      >
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> 保存到素材库
        </button>
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> 复制</span>
          <span className="text-[11px] text-[#6a6a7a]">Ctrl+C</span>
        </button>
        <button
          onClick={() => { onPaste(); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><ClipboardPaste className="w-3.5 h-3.5" /> 粘贴</span>
          <span className="text-[11px] text-[#6a6a7a]">Ctrl+V</span>
        </button>
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> 副本
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onDelete(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
        >
          <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> 删除</span>
          <span className="text-[11px] text-[#6a6a7a]">⌫,del</span>
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> 复制到剪贴板
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Bug className="w-3.5 h-3.5" /> 问题反馈
        </button>
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    </>
  );
}

/* ─── Aggregate component ─── */

export interface CanvasContextMenusProps {
  contextMenu: CanvasContextMenuData | null;
  onCloseContextMenu: () => void;
  onContextMenuAddNode: (type: string, label: string) => void;
  onContextMenuReopen: (clientX: number, clientY: number) => void;

  createMenu: CreateNodeMenuData | null;
  onCloseCreateMenu: () => void;
  onCreateAndConnect: (type: string) => void;

  nodeContextMenu: NodeContextMenuData | null;
  onCloseNodeContextMenu: () => void;
  onNodeContextMenuReopen: (clientX: number, clientY: number) => void;
  onNodeDuplicate: (nodeId: string) => void;
  onNodePaste: () => void;
  onNodeDelete: (nodeId: string) => void;
  onNodeCopy: () => void;
}

export function CanvasContextMenus({
  contextMenu,
  onCloseContextMenu,
  onContextMenuAddNode,
  onContextMenuReopen,
  createMenu,
  onCloseCreateMenu,
  onCreateAndConnect,
  nodeContextMenu,
  onCloseNodeContextMenu,
  onNodeContextMenuReopen,
  onNodeDuplicate,
  onNodePaste,
  onNodeDelete,
  onNodeCopy,
}: CanvasContextMenusProps) {
  return (
    <>
      <CanvasContextMenu
        menu={contextMenu}
        onClose={onCloseContextMenu}
        onAddNode={onContextMenuAddNode}
        onReopen={onContextMenuReopen}
      />
      <CreateNodeMenu
        menu={createMenu}
        onClose={onCloseCreateMenu}
        onCreateAndConnect={onCreateAndConnect}
      />
      <NodeContextMenu
        menu={nodeContextMenu}
        onClose={onCloseNodeContextMenu}
        onReopen={onNodeContextMenuReopen}
        onDuplicate={onNodeDuplicate}
        onPaste={onNodePaste}
        onDelete={onNodeDelete}
        onCopy={onNodeCopy}
      />
    </>
  );
}
