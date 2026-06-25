import { Image, Video, Download, Copy, ClipboardPaste, Trash2, Bug, Sun, Sparkles, Columns2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  BASIC_NODE_DEFINITIONS,
  BASIC_NODE_GROUPS,
  CREATE_NODE_MENU_WIDTH,
  type BasicNodeType,
} from '../constants/basicNodes';
import type { CreateConnectionMenuState } from '../types/canvas.types';
import { stopCanvasWheelPropagation } from '../utils/canvasEvents';
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

const basicNodeIcons: Record<BasicNodeType, typeof Image> = {
  text: TextNodeIcon as unknown as typeof Image,
  image: Image,
  video: Video,
  relight: Sun,
  upscale: Sparkles,
  compare: Columns2,
};

function BasicNodeMenuItems({
  onSelect,
}: {
  onSelect: (type: BasicNodeType, label: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <>
      {BASIC_NODE_GROUPS.map((group, groupIndex) => {
        const items = BASIC_NODE_DEFINITIONS.filter((item) => item.group === group.id);
        if (items.length === 0) return null;

        return (
          <div key={group.id} className={groupIndex > 0 ? 'mt-2 border-t border-white/[0.06] pt-2' : undefined}>
            <div className="px-5 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-white/[0.42]">
              {t(group.labelKey)}
            </div>
            {items.map((item) => {
              const ItemIcon = basicNodeIcons[item.type];
              const label = t(item.labelKey);
              return (
                <button
                  key={item.type}
                  onClick={() => onSelect(item.type, label)}
                  className="w-full flex items-center gap-3 px-5 py-3 text-left text-[15px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
                  style={{ color: 'rgba(255,255,255,0.78)' }}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.035]"
                    style={{ color: 'rgba(255,255,255,0.72)' }}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0 truncate">{label}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </>
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
        onWheelCapture={stopCanvasWheelPropagation}
      >
        <div className="px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white/[0.42]">{t('contextMenu.addNodeTitle')}</div>
        <BasicNodeMenuItems onSelect={(type, label) => onAddNode(type, label)} />
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
        onWheelCapture={stopCanvasWheelPropagation}
      >
        <div className="px-5 py-2.5 text-[12px] font-medium uppercase tracking-wider text-white/[0.42]">{t('contextMenu.addNodeTitle')}</div>
        <BasicNodeMenuItems onSelect={(type) => onCreateAndConnect(type)} />
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
  canCreateImageTools?: boolean;
  onCreateImageToolNode?: (nodeId: string, type: 'relight' | 'upscale' | 'compare') => void;
  onDuplicate: (nodeId: string) => void;
  onPaste: () => void;
  onDelete: (nodeId: string) => void;
  onCopy: () => void;
}

export function NodeContextMenu({
  menu,
  onClose,
  onReopen,
  canCreateImageTools = false,
  onCreateImageToolNode,
  onDuplicate,
  onPaste,
  onDelete,
  onCopy,
}: NodeContextMenuProps) {
  const { t } = useTranslation();
  const shortcuts = getPlatformShortcutLabels();
  if (!menu) return null;

  const imageToolItems = [
    { type: 'relight' as const, label: t('canvas.createMenuRelightNode'), Icon: Sun },
    { type: 'upscale' as const, label: t('canvas.createMenuUpscaleNode'), Icon: Sparkles },
    { type: 'compare' as const, label: t('canvas.createMenuCompareNode'), Icon: Columns2 },
  ];

  return (
    <>
      <div
        className="fixed z-50 py-1.5 rounded-xl"
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
        }}
        onWheelCapture={stopCanvasWheelPropagation}
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
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <Download className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('contextMenu.saveToLibrary')}
        </button>
        {onCreateImageToolNode && (
          <>
            <div className="mx-3 my-1 h-px bg-white/5" />
            <div className="px-4 pb-1 pt-1 text-[11px] uppercase tracking-wider text-white/[0.42]">{t('contextMenu.continueProcessing', { defaultValue: '继续处理' })}</div>
            {imageToolItems.map(({ type, label, Icon }) => (
              <button
                key={type}
                disabled={!canCreateImageTools}
                onClick={() => {
                  if (!canCreateImageTools) return;
                  onCreateImageToolNode(menu.nodeId, type);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-[0.38] disabled:hover:bg-transparent"
                style={{ color: 'rgba(255,255,255,0.78)' }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {label}
              </button>
            ))}
          </>
        )}
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('common.copy')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{formatShortcut(shortcuts.copy)}</span>
        </button>
        <button
          onClick={() => { onPaste(); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <span className="flex items-center gap-2"><ClipboardPaste className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('common.paste')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{formatShortcut(shortcuts.paste)}</span>
        </button>
        <button
          onClick={() => { onDuplicate(menu.nodeId); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('common.duplicate')}
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onDelete(menu.nodeId); onClose(); }}
          className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('common.delete')}</span>
          <span className="text-[11px] text-[#6a6a7a]">{t('contextMenu.deleteShortcut')}</span>
        </button>
        <div className="mx-3 my-1 h-px bg-white/5" />
        <button
          onClick={() => { onCopy(); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <Copy className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('contextMenu.copyToClipboard')}
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-white/[0.06] active:bg-white/[0.08]"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          <Bug className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.72)' }} /> {t('contextMenu.feedback')}
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
  canCreateImageTools?: boolean;
  onCreateImageToolNode?: (nodeId: string, type: 'relight' | 'upscale' | 'compare') => void;
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
  canCreateImageTools,
  onCreateImageToolNode,
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
        canCreateImageTools={canCreateImageTools}
        onCreateImageToolNode={onCreateImageToolNode}
        onDuplicate={onNodeDuplicate}
        onPaste={onNodePaste}
        onDelete={onNodeDelete}
        onCopy={onNodeCopy}
      />
    </>
  );
}
