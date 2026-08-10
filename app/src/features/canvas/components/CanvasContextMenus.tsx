import { Image, Download, Copy, ClipboardPaste, Trash2, Bug, Sparkles, Columns2, Building2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  BASIC_NODE_DEFINITIONS,
  CREATE_NODE_MENU_WIDTH,
  type BasicNodeType,
} from '../constants/basicNodes';
import type { CreateConnectionMenuState } from '../types/canvas.types';
import { stopCanvasWheelPropagation } from '../utils/canvasEvents';
import { formatShortcut, getPlatformShortcutLabels } from '../utils/shortcutLabels';

const VIEWPORT_MENU_MARGIN = 16;

function clampMenuPosition(x: number, y: number, width: number, height: number) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const availableBelow = viewportHeight - y - VIEWPORT_MENU_MARGIN;
  const availableAbove = y - VIEWPORT_MENU_MARGIN;
  const openBelow = availableBelow >= Math.min(height, 240) || availableBelow >= availableAbove;
  const preferredTop = openBelow ? y : y - height;
  return {
    left: Math.max(VIEWPORT_MENU_MARGIN, Math.min(x, viewportWidth - width - VIEWPORT_MENU_MARGIN)),
    top: Math.max(VIEWPORT_MENU_MARGIN, Math.min(preferredTop, viewportHeight - height - VIEWPORT_MENU_MARGIN)),
  };
}

function ViewportMenuSurface({
  x,
  y,
  width,
  minWidth,
  estimatedHeight,
  tone = 'default',
  className,
  onContextMenu,
  children,
}: {
  x: number;
  y: number;
  width?: number;
  minWidth?: number;
  estimatedHeight: number;
  tone?: 'default' | 'add-node';
  className: string;
  onContextMenu?: (event: React.MouseEvent<HTMLDivElement>) => void;
  children: ReactNode;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const initialWidth = width ?? minWidth ?? CREATE_NODE_MENU_WIDTH;
  const initialHeight = Math.min(estimatedHeight, window.innerHeight - VIEWPORT_MENU_MARGIN * 2);
  const initialPosition = clampMenuPosition(x, y, initialWidth, initialHeight);
  const [measuredPosition, setMeasuredPosition] = useState<{
    sourceX: number;
    sourceY: number;
    left: number;
    top: number;
  } | null>(null);
  const position = measuredPosition?.sourceX === x && measuredPosition.sourceY === y
    ? measuredPosition
    : { sourceX: x, sourceY: y, ...initialPosition };

  const measureAndPlace = useCallback(() => {
    const element = elementRef.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    const availableHeight = window.innerHeight - VIEWPORT_MENU_MARGIN * 2;
    const renderedHeight = Math.min(rect.height, availableHeight);
    const next = clampMenuPosition(x, y, rect.width, renderedHeight);
    setMeasuredPosition((current) => current && current.sourceX === x && current.sourceY === y && current.left === next.left && current.top === next.top
      ? current
      : { sourceX: x, sourceY: y, ...next });
  }, [x, y]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(measureAndPlace);
    window.addEventListener('resize', measureAndPlace);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', measureAndPlace);
    };
  }, [measureAndPlace]);

  const style: CSSProperties = {
    left: position.left,
    top: position.top,
    width,
    minWidth,
    maxHeight: `calc(100vh - ${VIEWPORT_MENU_MARGIN * 2}px)`,
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    background: tone === 'add-node' ? 'rgba(32,32,34,0.97)' : '#252526',
    border: tone === 'add-node' ? '1px solid rgba(255,255,255,0.09)' : '1px solid #2a2a35',
    boxShadow: tone === 'add-node'
      ? '0 18px 46px rgba(0,0,0,0.66), inset 0 1px 0 rgba(255,255,255,0.025)'
      : '0 12px 32px rgba(0,0,0,0.55)',
  };

  return (
    <div
      ref={elementRef}
      className={className}
      style={style}
      onContextMenu={onContextMenu}
      onWheelCapture={stopCanvasWheelPropagation}
    >
      {children}
    </div>
  );
}

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
  exteriorRender: Building2,
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
    <div className="py-0.5">
      {BASIC_NODE_DEFINITIONS.map((item) => {
        const ItemIcon = basicNodeIcons[item.type];
        const label = t(item.labelKey);
        return (
          <button
            key={item.type}
            onClick={() => onSelect(item.type, label)}
            className="flex h-12 w-full items-center gap-3 px-4 text-left text-[15px] font-medium transition-colors hover:bg-white/[0.07] active:bg-white/[0.10]"
            style={{ color: 'rgba(255,255,255,0.86)' }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.06]"
              style={{ color: 'rgba(255,255,255,0.82)' }}
            >
              <ItemIcon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 truncate">{label}</span>
          </button>
        );
      })}
    </div>
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
      <ViewportMenuSurface
        x={menu.x}
        y={menu.y}
        width={CREATE_NODE_MENU_WIDTH}
        estimatedHeight={306}
        tone="add-node"
        className="fixed z-50 rounded-xl py-2"
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
        }}
      >
        <div className="px-4 pb-2 pt-2.5 text-[13px] font-semibold tracking-wide text-white/[0.86]">{t('contextMenu.addNodeTitle')}</div>
        <BasicNodeMenuItems onSelect={(type, label) => onAddNode(type, label)} />
      </ViewportMenuSurface>
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
      <ViewportMenuSurface
        x={menu.x}
        y={menu.y}
        width={CREATE_NODE_MENU_WIDTH}
        estimatedHeight={306}
        tone="add-node"
        className="fixed z-50 rounded-xl py-2"
      >
        <div className="px-4 pb-2 pt-2.5 text-[13px] font-semibold tracking-wide text-white/[0.86]">{t('contextMenu.addNodeTitle')}</div>
        <BasicNodeMenuItems onSelect={(type) => onCreateAndConnect(type)} />
      </ViewportMenuSurface>
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
  onCreateImageToolNode?: (nodeId: string, type: 'upscale' | 'compare') => void;
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
    { type: 'upscale' as const, label: t('canvas.createMenuUpscaleNode'), Icon: Sparkles },
    { type: 'compare' as const, label: t('canvas.createMenuCompareNode'), Icon: Columns2 },
  ];

  return (
    <>
      <ViewportMenuSurface
        x={menu.x}
        y={menu.y}
        minWidth={200}
        estimatedHeight={canCreateImageTools ? 520 : 360}
        className="fixed z-50 py-1.5 rounded-xl"
        onContextMenu={(e) => {
          e.preventDefault();
          onReopen(e.clientX, e.clientY);
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
      </ViewportMenuSurface>
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
  onCreateImageToolNode?: (nodeId: string, type: 'upscale' | 'compare') => void;
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
  return createPortal(
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
    </>,
    document.body,
  );
}
