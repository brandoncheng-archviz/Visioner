import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronRight, Layers3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../../../constants/canvasConstants';
import type { ImageNodeControllers } from './imageControllers.types';
import { StructureControlPlaceholder } from './StructureControlPlaceholder';
import {
  getEnabledStructureChannelCount,
  isStructureControllerEnabled,
} from './imageControllersUtils';

type ControllerView = 'list' | 'structure';

interface ImageControllersPopoverProps {
  open: boolean;
  anchorElement: HTMLElement | null;
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  onChange: (controllers: ImageNodeControllers) => void;
  onOpenChange: (open: boolean) => void;
}

const POPOVER_WIDTH = 292;
const STRUCTURE_POPOVER_WIDTH = 640;
const POPOVER_LIST_HEIGHT = 108;
const STRUCTURE_POPOVER_HEIGHT = 384;
const POPOVER_MARGIN = 8;
const POPOVER_ANCHOR_GAP = 4;

export function ImageControllersPopover({
  open,
  anchorElement,
  controllers,
  disabled = false,
  onChange,
  onOpenChange,
}: ImageControllersPopoverProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ControllerView>('list');
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (open) return;
    const timer = window.setTimeout(() => setView('list'), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open || !anchorElement) return;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const requestedPopoverWidth = view === 'structure' ? STRUCTURE_POPOVER_WIDTH : POPOVER_WIDTH;
      const popoverWidth = Math.min(requestedPopoverWidth, viewportWidth - POPOVER_MARGIN * 2);
      const popoverHeight = view === 'structure'
        ? STRUCTURE_POPOVER_HEIGHT
        : POPOVER_LIST_HEIGHT;
      const left = Math.min(
        Math.max(POPOVER_MARGIN, rect.left + rect.width / 2 - popoverWidth / 2),
        Math.max(POPOVER_MARGIN, viewportWidth - popoverWidth - POPOVER_MARGIN),
      );
      const topAbove = rect.top - popoverHeight - POPOVER_ANCHOR_GAP;
      const topBelow = rect.bottom + POPOVER_ANCHOR_GAP;
      const top = topAbove >= POPOVER_MARGIN
        ? topAbove
        : Math.min(topBelow, Math.max(POPOVER_MARGIN, viewportHeight - popoverHeight - POPOVER_MARGIN));
      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorElement, open, view]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && anchorElement?.contains(target)) return;
      const popoverElement = document.querySelector('[data-image-controllers-popover="true"]');
      if (target && popoverElement?.contains(target)) return;
      onOpenChange(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [anchorElement, onOpenChange, open]);

  const headerTitle = useMemo(() => {
    if (view === 'structure') return t('imageNode.controllers.structure.header');
    return t('imageNode.controllers.title');
  }, [t, view]);

  if (!open || !anchorElement) return null;

  const renderStatus = (enabled: boolean, label?: string) => (
    <span className="text-[12px]" style={{ color: enabled ? 'rgba(255,255,255,0.68)' : 'rgba(255,255,255,0.38)' }}>
      {label ?? (enabled ? t('imageNode.controllers.status.enabled') : t('imageNode.controllers.status.unset'))}
    </span>
  );

  const structureChannelCount = getEnabledStructureChannelCount(controllers?.structure);
  const isStructureEnabled = isStructureControllerEnabled(controllers?.structure);
  const structureStatus = isStructureEnabled
    ? t('imageNode.controllers.status.enabledChannelCount', { count: structureChannelCount })
    : t('imageNode.controllers.status.unset');

  const renderList = () => (
    <div className="px-2 pb-2">
      <button
        type="button"
        onClick={() => setView('structure')}
        className="flex h-12 w-full items-center gap-3 rounded-lg px-2 text-left transition-colors hover:bg-white/[0.06]"
      >
        <Layers3 className="h-4 w-4 flex-shrink-0 text-white/54" />
        <span className="min-w-0 flex-1 text-[14px] font-medium text-white/82">{t('imageNode.controllers.structure.title')}</span>
        {renderStatus(isStructureEnabled, structureStatus)}
        <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/34" />
      </button>
    </div>
  );

  return createPortal(
    <div
      data-image-controllers-popover="true"
      className="nodrag nopan nowheel fixed z-[120] overflow-y-auto rounded-xl"
      style={{
        left: position.left,
        top: position.top,
        width: view === 'structure' ? STRUCTURE_POPOVER_WIDTH : POPOVER_WIDTH,
        maxHeight: `calc(100vh - ${POPOVER_MARGIN * 2}px)`,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 16px 38px rgba(0,0,0,0.44)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div className="flex h-12 items-center gap-2 border-b border-white/[0.06] px-3">
        {view !== 'list' && (
          <button
            type="button"
            onClick={() => setView('list')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/62 transition-colors hover:bg-white/[0.07] hover:text-white/86"
            aria-label={t('imageNode.controllers.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1 text-[14px] font-medium text-white/86">{headerTitle}</div>
        {view === 'structure' && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/62 transition-colors hover:bg-white/[0.07] hover:text-white/86"
            aria-label={t('imageNode.controllers.close')}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {view === 'list' && renderList()}
      {view === 'structure' && (
        <StructureControlPlaceholder controllers={controllers} disabled={disabled} onChange={onChange} />
      )}
    </div>,
    document.body,
  );
}
