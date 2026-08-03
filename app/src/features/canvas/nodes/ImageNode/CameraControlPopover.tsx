import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../../constants/canvasConstants';
import type { CameraControlData } from '../../types/imageNodeData.types';
import { CameraControlPanel } from './CameraControlPanel';

const WIDTH = 780;
const HEIGHT = 472;
const VIEWPORT_MARGIN = 12;
const ANCHOR_GAP = 8;

export function CameraControlPopover({
  open,
  anchorElement,
  value,
  disabled = false,
  onChange,
  onOpenChange,
}: {
  open: boolean;
  anchorElement: HTMLElement | null;
  value?: CameraControlData;
  disabled?: boolean;
  onChange: (value: CameraControlData) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: VIEWPORT_MARGIN, top: VIEWPORT_MARGIN });

  useEffect(() => {
    if (!open || !anchorElement) return;
    let frameId = 0;
    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const width = Math.min(WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
      const height = Math.min(HEIGHT, window.innerHeight - VIEWPORT_MARGIN * 2);
      const left = Math.min(Math.max(VIEWPORT_MARGIN, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - VIEWPORT_MARGIN);
      const above = rect.top - height - ANCHOR_GAP;
      const below = rect.bottom + ANCHOR_GAP;
      const top = above >= VIEWPORT_MARGIN ? above : Math.min(below, window.innerHeight - height - VIEWPORT_MARGIN);
      setPosition({ left, top: Math.max(VIEWPORT_MARGIN, top) });
      frameId = window.requestAnimationFrame(updatePosition);
    };
    updatePosition();
    return () => window.cancelAnimationFrame(frameId);
  }, [anchorElement, open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (anchorElement?.contains(target) || panelRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [anchorElement, onOpenChange, open]);

  if (!open || !anchorElement) return null;
  return createPortal(
    <div
      ref={panelRef}
      data-image-camera-popover="true"
      className="nodrag nopan nowheel fixed z-[120] overflow-y-auto rounded-xl"
      style={{
        left: position.left,
        top: position.top,
        width: `min(${WIDTH}px, calc(100vw - ${VIEWPORT_MARGIN * 2}px))`,
        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 18px 42px rgba(0,0,0,0.46)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <CameraControlPanel value={value} disabled={disabled} onChange={onChange} onClose={() => onOpenChange(false)} />
    </div>,
    document.body,
  );
}
