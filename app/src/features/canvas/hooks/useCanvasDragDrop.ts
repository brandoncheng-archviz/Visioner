import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';

type UseCanvasDragDropParams = {
  handleDropFiles: (files: FileList, screenX: number, screenY: number) => void;
};

function isReferenceReorderDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('application/x-visioner-reference-reorder');
}

function hasDraggedFiles(event: DragEvent): boolean {
  return event.dataTransfer.types.includes('Files');
}

export function useCanvasDragDrop({ handleDropFiles }: UseCanvasDragDropParams) {
  const [isDragOver, setIsDragOver] = useState(false);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    };
  }, []);

  const handleCanvasDragOver = useCallback((event: DragEvent) => {
    if (isReferenceReorderDrag(event) || !hasDraggedFiles(event)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    setIsDragOver(true);
  }, []);

  const handleCanvasDragLeave = useCallback(() => {
    if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
    dragLeaveTimer.current = setTimeout(() => setIsDragOver(false), 50);
  }, []);

  const handleCanvasDrop = useCallback((event: DragEvent) => {
    if (isReferenceReorderDrag(event) || !hasDraggedFiles(event)) {
      setIsDragOver(false);
      return;
    }
    event.preventDefault();
    setIsDragOver(false);
    handleDropFiles(event.dataTransfer.files, event.clientX, event.clientY);
  }, [handleDropFiles]);

  const handleDragOverCapture = useCallback((event: DragEvent) => {
    if (isReferenceReorderDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  const handleDropCapture = useCallback((event: DragEvent) => {
    if (isReferenceReorderDrag(event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return {
    isDragOver,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleDragOverCapture,
    handleDropCapture,
  };
}
