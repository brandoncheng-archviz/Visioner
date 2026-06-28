import { useEffect, useRef } from 'react';
import { IMAGE_CROP_CANCEL_EVENT } from '../constants/canvasConstants';

type CanvasKeyboardShortcutCallbacks = {
  copyNodes: () => void | number;
  pasteNodes?: () => void | number;
  deleteSelected: () => void;
  undo: () => void;
  redo: () => void;
  selectAll: () => void;
  deselectAll: () => void;
  closeCreateMenu: () => void;
  closeHelp: () => void;
  panViewport: (direction: 'up' | 'down' | 'left' | 'right') => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;
};

export type UseCanvasKeyboardShortcutsOptions = CanvasKeyboardShortcutCallbacks & {
  isCreateMenuOpen: boolean;
  isHelpOpen: boolean;
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
}

function useLatestCallbacks(callbacks: CanvasKeyboardShortcutCallbacks) {
  const callbacksRef = useRef(callbacks);
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);
  return callbacksRef;
}

export function useCanvasKeyboardShortcuts({
  isCreateMenuOpen,
  isHelpOpen,
  copyNodes,
  pasteNodes,
  deleteSelected,
  undo,
  redo,
  selectAll,
  deselectAll,
  closeCreateMenu,
  closeHelp,
  panViewport,
  zoomIn,
  zoomOut,
  fitView,
}: UseCanvasKeyboardShortcutsOptions) {
  const callbacksRef = useLatestCallbacks({
    copyNodes,
    pasteNodes,
    deleteSelected,
    undo,
    redo,
    selectAll,
    deselectAll,
    closeCreateMenu,
    closeHelp,
    panViewport,
    zoomIn,
    zoomOut,
    fitView,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return;

      const key = event.key.toLowerCase();
      const isZKey = key === 'z' || event.code === 'KeyZ';
      const isModifierPressed = event.ctrlKey || event.metaKey;
      const isEditing = isEditableTarget(event.target);
      const callbacks = callbacksRef.current;

      if (import.meta.env.DEV) {
        console.debug('[CanvasShortcuts] keydown triggered', event.key);
      }

      const isEscape = event.key === 'Escape' || event.key === 'Esc' || event.code === 'Escape';
      if (isEscape && document.querySelector('[data-canvas-escape-layer="true"]')) {
        event.preventDefault();
        return;
      }
      if (isEscape && document.querySelector('[data-image-crop-active="true"]')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        window.dispatchEvent(new Event(IMAGE_CROP_CANCEL_EVENT));
        return;
      }

      if (isEscape) {
        if (isCreateMenuOpen) {
          event.preventDefault();
          callbacks.closeCreateMenu();
          return;
        }
        if (isHelpOpen) {
          event.preventDefault();
          callbacks.closeHelp();
          return;
        }
      }

      if (isEditing) return;

      if (isModifierPressed && key === 'c') {
        event.preventDefault();
        if (import.meta.env.DEV) {
          console.debug('[CanvasShortcuts] copy shortcut triggered');
        }
        callbacks.copyNodes();
        return;
      }

      if (isModifierPressed && key === 'v') {
        if (import.meta.env.DEV) {
          console.debug('[CanvasShortcuts] paste shortcut triggered');
        }
        const pastedCount = callbacks.pasteNodes?.() || 0;
        if (pastedCount > 0) {
          event.preventDefault();
        }
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        callbacks.deleteSelected();
        return;
      }

      if (isModifierPressed && event.shiftKey && isZKey) {
        event.preventDefault();
        if (import.meta.env.DEV) {
          console.debug('[keyboard] redo shortcut triggered');
        }
        callbacks.redo();
        return;
      }

      if (isModifierPressed && !event.shiftKey && isZKey) {
        event.preventDefault();
        if (import.meta.env.DEV) {
          console.debug('[keyboard] undo shortcut triggered');
        }
        callbacks.undo();
        return;
      }

      if (isModifierPressed && key === 'a') {
        event.preventDefault();
        callbacks.selectAll();
        return;
      }

      if (isEscape) {
        event.preventDefault();
        callbacks.deselectAll();
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        callbacks.panViewport('up');
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        callbacks.panViewport('down');
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        callbacks.panViewport('left');
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        callbacks.panViewport('right');
        return;
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        callbacks.zoomIn();
        return;
      }

      if (event.key === '-') {
        event.preventDefault();
        callbacks.zoomOut();
        return;
      }

      if (event.key === '0' || key === 'f' || event.key === '1') {
        event.preventDefault();
        callbacks.fitView();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [callbacksRef, isCreateMenuOpen, isHelpOpen]);
}
