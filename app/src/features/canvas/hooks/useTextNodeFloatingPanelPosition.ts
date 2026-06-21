import { useCallback, useEffect, useState } from 'react';

export type TextNodeFloatingPanelPosition = {
  left: number;
  top: number;
} | null;

type UseTextNodeFloatingPanelPositionParams = {
  selectedTextNodeId?: string;
  offset?: number;
};

function getTextNodePreviewElement(nodeId: string) {
  return document.querySelector(`.react-flow__node[data-id="${nodeId}"] .node-preview-card`) as HTMLElement | null;
}

export function useTextNodeFloatingPanelPosition({
  selectedTextNodeId,
  offset = 24,
}: UseTextNodeFloatingPanelPositionParams) {
  const [textNodePanelPosition, setTextNodePanelPosition] = useState<TextNodeFloatingPanelPosition>(null);

  const clearPosition = useCallback(() => {
    setTextNodePanelPosition(null);
  }, []);

  const refreshPosition = useCallback(() => {
    if (!selectedTextNodeId) {
      clearPosition();
      return;
    }

    const nodeEl = getTextNodePreviewElement(selectedTextNodeId);
    if (!nodeEl) return;
    const rect = nodeEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const nextPosition = {
      left: rect.left + rect.width / 2,
      top: rect.bottom + offset,
    };
    setTextNodePanelPosition((currentPosition) =>
      currentPosition?.left === nextPosition.left && currentPosition?.top === nextPosition.top
        ? currentPosition
        : nextPosition,
    );
  }, [clearPosition, offset, selectedTextNodeId]);

  useEffect(() => {
    if (!selectedTextNodeId) {
      clearPosition();
      return;
    }

    refreshPosition();
    let frameId = window.requestAnimationFrame(function tick() {
      refreshPosition();
      frameId = window.requestAnimationFrame(tick);
    });

    const nodeEl = getTextNodePreviewElement(selectedTextNodeId);
    const observer = nodeEl ? new ResizeObserver(refreshPosition) : null;
    if (nodeEl && observer) observer.observe(nodeEl);

    window.addEventListener('resize', refreshPosition);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
      window.removeEventListener('resize', refreshPosition);
    };
  }, [clearPosition, refreshPosition, selectedTextNodeId]);

  return {
    textNodePanelPosition,
    refreshPosition,
    clearPosition,
  };
}
