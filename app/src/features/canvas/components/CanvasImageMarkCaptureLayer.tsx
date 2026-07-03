import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

import {
  getImageMarkCaptureEntries,
  getImageMarkCaptureRegistrySnapshot,
  subscribeImageMarkCaptureRegistry,
  type ImageMarkCaptureEntry,
} from '../utils/imageMarkCaptureRegistry';

type CaptureRect = {
  entry: ImageMarkCaptureEntry;
  left: number;
  top: number;
  width: number;
  height: number;
};

export function CanvasImageMarkCaptureLayer({ targetNodeId }: { targetNodeId: string | null }) {
  useSyncExternalStore(
    subscribeImageMarkCaptureRegistry,
    getImageMarkCaptureRegistrySnapshot,
    getImageMarkCaptureRegistrySnapshot,
  );
  const [captureRects, setCaptureRects] = useState<CaptureRect[]>([]);

  useLayoutEffect(() => {
    if (!targetNodeId) return;
    let frameId = 0;
    const updateRects = () => {
      const nextRects = getImageMarkCaptureEntries()
        .filter((entry) => entry.canMark(targetNodeId) && entry.element.isConnected)
        .map((entry) => {
          const rect = entry.element.getBoundingClientRect();
          return { entry, left: rect.left, top: rect.top, width: rect.width, height: rect.height };
        })
        .filter((item) => item.width > 0 && item.height > 0);
      setCaptureRects((current) => {
        const unchanged = current.length === nextRects.length && current.every((item, index) => {
          const next = nextRects[index];
          return next && item.entry === next.entry && Math.abs(item.left - next.left) < 0.5 && Math.abs(item.top - next.top) < 0.5 && Math.abs(item.width - next.width) < 0.5 && Math.abs(item.height - next.height) < 0.5;
        });
        return unchanged ? current : nextRects;
      });
      frameId = requestAnimationFrame(updateRects);
    };
    updateRects();
    return () => cancelAnimationFrame(frameId);
  }, [targetNodeId]);

  if (!targetNodeId) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[3000]" aria-hidden="true">
      {captureRects.map(({ entry, left, top, width, height }) => (
        <div
          key={entry.nodeId}
          className="pointer-events-auto fixed cursor-crosshair bg-transparent"
          style={{ left, top, width, height }}
          onPointerDownCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
            if (event.button !== 0) return;
            entry.startIdentify(event.nativeEvent, targetNodeId);
          }}
          onMouseDownCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
          }}
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
          }}
          onContextMenuCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
          }}
        />
      ))}
    </div>,
    document.body,
  );
}
