import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { Node } from '@xyflow/react';

import { getNextNodeTitle } from '../utils/nodeNaming';
import {
  formatPastedImageLabel,
  getFilesFromClipboard,
  getImageRejectMessage,
  type ImageFileReject,
} from '../utils/canvasFileUtils';
import {
  buildUploadedImageNode,
  decodeImageFile,
  filterImageImportFiles,
  getImageImportPosition,
} from '../utils/canvasImageImportUtils';

export type CanvasUploadToast = { msg: string; type: 'loading' | 'success' } | null;

type CanvasPosition = {
  x: number;
  y: number;
};

type UseCanvasImageImportParams = {
  setNodes: Dispatch<SetStateAction<Node[]>>;
  screenToFlowPosition: (position: CanvasPosition) => CanvasPosition;
  getAllNodeLabels: () => string[];
  showToast: (message: string) => void;
  t: (key: string) => string;
  hasCopiedNodes: () => boolean;
  lastPointerPositionRef: RefObject<CanvasPosition | null>;
};

function isEditablePasteTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    target.isContentEditable ||
    Boolean(target.closest('[contenteditable="true"]')) ||
    Boolean(target.closest('[data-paste-ignore="true"]'))
  );
}

function useRevokeObjectUrlsOnUnmount(objectUrlsRef: RefObject<Set<string>>) {
  useEffect(() => {
    const objectUrls = objectUrlsRef.current;
    return () => {
      objectUrls.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore already-revoked or invalid URLs
        }
      });
      objectUrls.clear();
    };
  }, [objectUrlsRef]);
}

export function useCanvasImageImport({
  setNodes,
  screenToFlowPosition,
  getAllNodeLabels,
  showToast,
  t,
  hasCopiedNodes,
  lastPointerPositionRef,
}: UseCanvasImageImportParams) {
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [uploadToast, setUploadToast] = useState<CanvasUploadToast>(null);

  useRevokeObjectUrlsOnUnmount(objectUrlsRef);

  const createImageNodesFromFiles = useCallback(
    (files: File[], basePosition: CanvasPosition) => {
      const { validFiles, rejectedFiles: initialRejectedFiles } = filterImageImportFiles(files);
      const rejectedFiles: ImageFileReject[] = [...initialRejectedFiles];

      initialRejectedFiles.forEach(({ file, reason }) => {
        if (reason === 'unsupported-type') {
          console.warn(`[Canvas] Skipped unsupported image: ${file.name || 'unnamed'} (type: ${file.type || 'unknown'})`);
        }
        if (reason === 'too-large') {
          console.warn(
            `[Canvas] Skipped oversized image: ${file.name || 'unnamed'} (${(file.size / 1024 / 1024).toFixed(1)}MB > 10MB)`,
          );
        }
      });

      const preCheckMessage = getImageRejectMessage(rejectedFiles, validFiles.length);
      if (validFiles.length === 0) {
        if (preCheckMessage) showToast(preCheckMessage);
        return;
      }

      setUploadToast({ msg: t('canvas.uploading'), type: 'loading' });

      const allLabels = getAllNodeLabels();
      const assignedLabels: string[] = [];
      const fileFinalLabels = validFiles.map((file) => {
        const baseTitle = formatPastedImageLabel(file);
        const label = getNextNodeTitle([...allLabels, ...assignedLabels], baseTitle);
        assignedLabels.push(label);
        return label;
      });

      Promise.all(
        validFiles.map((file, index) => {
          const objectUrl = URL.createObjectURL(file);
          objectUrlsRef.current.add(objectUrl);
          return decodeImageFile(file, objectUrl)
            .then(({ naturalWidth, naturalHeight }) => ({
              node: buildUploadedImageNode({
                id: `image-${Date.now()}-${index}`,
                label: fileFinalLabels[index],
                objectUrl,
                naturalWidth,
                naturalHeight,
                position: getImageImportPosition(basePosition, index),
                selected: index === 0,
              }),
              index,
            }))
            .catch(() => {
              URL.revokeObjectURL(objectUrl);
              objectUrlsRef.current.delete(objectUrl);
              rejectedFiles.push({ file, reason: 'decode-failed' });
              console.warn(`[Canvas] Failed to decode image: ${file.name || 'unnamed'}`);
              return null;
            });
        }),
      ).then((results) => {
        const newNodes = results
          .filter((result): result is { node: Node; index: number } => Boolean(result))
          .map((r) => r.node);

        if (newNodes.length === 0) {
          setUploadToast(null);
          const finalMessage = getImageRejectMessage(rejectedFiles, newNodes.length);
          if (finalMessage) showToast(finalMessage);
          return;
        }

        setNodes((nds) => [
          ...nds.map((n) => ({ ...n, selected: false })),
          ...newNodes,
        ]);
        setUploadToast({ msg: t('canvas.uploadSuccess'), type: 'success' });
        setTimeout(() => setUploadToast(null), 2500);

        if (rejectedFiles.length > 0) {
          const partialMessage = getImageRejectMessage(rejectedFiles, newNodes.length);
          if (partialMessage) showToast(partialMessage);
        }
      });
    },
    [getAllNodeLabels, setNodes, showToast, t],
  );

  const handleDropFiles = useCallback((files: FileList, screenX: number, screenY: number) => {
    const basePos = screenToFlowPosition({ x: screenX, y: screenY });
    createImageNodesFromFiles(Array.from(files), basePos);
  }, [createImageNodesFromFiles, screenToFlowPosition]);

  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      if (isEditablePasteTarget(event.target)) return;

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      const clipboardFiles = getFilesFromClipboard(clipboardData);

      if (clipboardFiles.length > 0) {
        if (hasCopiedNodes()) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        const pastePoint = lastPointerPositionRef.current || {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };
        const centerPos = screenToFlowPosition({
          x: pastePoint.x,
          y: pastePoint.y,
        });
        createImageNodesFromFiles(clipboardFiles, centerPos);
      }
    },
    [createImageNodesFromFiles, hasCopiedNodes, lastPointerPositionRef, screenToFlowPosition],
  );

  useEffect(() => {
    const handler = (event: ClipboardEvent) => handlePaste(event);
    window.addEventListener('paste', handler);
    return () => window.removeEventListener('paste', handler);
  }, [handlePaste]);

  return {
    uploadToast,
    setUploadToast,
    createImageNodesFromFiles,
    handleDropFiles,
    handlePaste,
    objectUrlsRef,
  };
}
