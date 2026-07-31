import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FLOATING_PANEL_BACKGROUND,
  FLOATING_PANEL_BORDER,
} from '../../../constants/canvasConstants';
import type { ImageNodeControllers } from './imageControllers.types';
import { CameraControlPanel } from './CameraControlPanel';

interface CameraControlPopoverProps {
  open: boolean;
  anchorElement: HTMLElement | null;
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  onChange: (controllers: ImageNodeControllers) => void;
  onOpenChange: (open: boolean) => void;
}

const CAMERA_POPOVER_WIDTH = 920;
const CAMERA_POPOVER_HEIGHT = 548;
const POPOVER_MARGIN = 8;
const POPOVER_ANCHOR_GAP = 6;

export function CameraControlPopover({
  open,
  anchorElement,
  controllers,
  disabled = false,
  onChange,
  onOpenChange,
}: CameraControlPopoverProps) {
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open || !anchorElement) return;

    const updatePosition = () => {
      const rect = anchorElement.getBoundingClientRect();
      const width = Math.min(CAMERA_POPOVER_WIDTH, window.innerWidth - POPOVER_MARGIN * 2);
      const height = Math.min(CAMERA_POPOVER_HEIGHT, window.innerHeight - POPOVER_MARGIN * 2);
      const left = Math.min(
        Math.max(POPOVER_MARGIN, rect.left + rect.width / 2 - width / 2),
        Math.max(POPOVER_MARGIN, window.innerWidth - width - POPOVER_MARGIN),
      );
      const topAbove = rect.top - height - POPOVER_ANCHOR_GAP;
      const topBelow = rect.bottom + POPOVER_ANCHOR_GAP;
      const top = topAbove >= POPOVER_MARGIN
        ? topAbove
        : Math.min(topBelow, Math.max(POPOVER_MARGIN, window.innerHeight - height - POPOVER_MARGIN));
      setPosition({ left, top });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorElement, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && anchorElement?.contains(target)) return;
      const popover = document.querySelector('[data-image-camera-popover="true"]');
      if (target && popover?.contains(target)) return;
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

  if (!open || !anchorElement) return null;

  return createPortal(
    <div
      data-image-camera-popover="true"
      className="nodrag nopan nowheel fixed z-[120] overflow-y-auto rounded-xl"
      style={{
        left: position.left,
        top: position.top,
        width: `min(${CAMERA_POPOVER_WIDTH}px, calc(100vw - ${POPOVER_MARGIN * 2}px))`,
        maxHeight: `calc(100vh - ${POPOVER_MARGIN * 2}px)`,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 16px 38px rgba(0,0,0,0.44)',
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <CameraControlPanel
        controllers={controllers}
        disabled={disabled}
        onChange={onChange}
        onClose={() => onOpenChange(false)}
      />
    </div>,
    document.body,
  );
}
