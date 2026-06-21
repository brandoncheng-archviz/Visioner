import { Image, Video, Download, Copy, ClipboardPaste, Trash2, Bug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  BASIC_NODE_DEFINITIONS,
  CREATE_NODE_MENU_WIDTH,
  type BasicNodeType,
} from '../constants/basicNodes';
import type { CreateConnectionMenuState } from '../types/canvas.types';
import { formatShortcut, getPlatformShortcutLabels } from '../utils/shortcutLabels';

function TextNodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="5.5" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="9" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="12.5" width="7" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

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
  const { t } = useTranslation();
  if (!menu) return null;

  const icons: Record<BasicNodeType, typeof Image> = {
    text: TextNodeIcon as unknown as typeof Image,
    image: Image,
    video: Video,
  };

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
          width: CREATE_NODE_MENU_WIDTH,
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
        }}
      >
        <div className="px-5 py-2.5 text-[13px] text-[#6a6a7a] uppercase tracking-wider">{t('contextMenu.addNodeTitle')}</div>
        {BASIC_NODE_DEFINITIONS.map((item) => {
          const ItemIcon = icons[item.type];
          const label = t(item.labelKey);
          return (
            <button
              key={item.type}
              onClick={() => onAddNode(item.type, label)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-[16px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <ItemIcon className="w-5 h-5" style={{ color: item.color }} />
              {label}
            </button>
          );
        })}
      </div>
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
    </>
  );
}

/* ─── Create Node Menu (drop on empty canvas during connection) ─── */

export interface CreateNodeMenuProps {
  menu: CreateConnectionMenuState | null;
  onClose: () => void;
  onCreateAndConnect: (type: string) => void;
}

export function CreateNodeMenu({ menu, onClose, onCreateAndConnect }: CreateNodeMenuProps) {
  const { t } = useTranslation();
  if (!menu) return null;

  const icons: Record<BasicNodeType, typeof Image> = {
    text: TextNodeIcon as unknown as typeof Image,
    image: Image,
    video: Video,
  };

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
          width: CREATE_NODE_MENU_WIDTH,
        }}
      >
        <div className="px-5 py-2.5 text-[13px] text-[#6a6a7a] uppercase tracking-wider">{t('contextMenu.addNodeTitle')}</div>
        {BASIC_NODE_DEFINITIONS.map((item) => {
          const ItemIcon = icons[item.type];
          return (
            <button
              key={item.type}
              onClick={() => onCreateAndConnect(item.type)}
              className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-[16px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <ItemIcon className="w-5 h-5" style={{ color: item.color }} />
              {t(item.labelKey)}
            </button>
          );
        })}
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
  const { t } = useTranslation();
  const shortcuts = getPlatformShortcutLabels();
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
          <Download className="w-3.5 h-3.5" /> {t('contextMenu.saveToLibrary')}
        </button>
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> {t('common.copy')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{formatShortcut(shortcuts.copy)}</span>
        </button>
        <button
          onClick={() => { onPaste(); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2"><ClipboardPaste className="w-3.5 h-3.5" /> {t('common.paste')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{formatShortcut(shortcuts.paste)}</span>
        </button>
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> {t('common.duplicate')}
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onDelete(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
        >
          <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{t('contextMenu.deleteShortcut')}</span>
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5" /> {t('contextMenu.copyToClipboard')}
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
        >
          <Bug className="w-3.5 h-3.5" /> {t('contextMenu.feedback')}
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

  createMenu: CreateConnectionMenuState | null;
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
