import type { Node } from '@xyflow/react';

import { MAX_IMAGE_UPLOAD_SIZE } from '../constants/canvasConstants';
import {
  isAcceptedImageFile,
  type ImageFileReject,
} from './canvasFileUtils';
import { getRoleData } from './referenceUtils';

type CanvasPosition = {
  x: number;
  y: number;
};

type DecodedImageFile = {
  file: File;
  objectUrl: string;
  naturalWidth: number;
  naturalHeight: number;
};

type BuildUploadedImageNodeDataParams = {
  label: string;
  objectUrl: string;
  naturalWidth: number;
  naturalHeight: number;
};

type BuildUploadedImageNodeParams = BuildUploadedImageNodeDataParams & {
  id: string;
  position: CanvasPosition;
  selected: boolean;
};

export function filterImageImportFiles(files: File[]) {
  const rejectedFiles: ImageFileReject[] = [];
  const validFiles = files.filter((file) => {
    if (!isAcceptedImageFile(file)) {
      rejectedFiles.push({ file, reason: 'unsupported-type' });
      return false;
    }

    if (file.size > MAX_IMAGE_UPLOAD_SIZE) {
      rejectedFiles.push({ file, reason: 'too-large' });
      return false;
    }

    return true;
  });

  return { validFiles, rejectedFiles };
}

export function decodeImageFile(file: File, objectUrl: string): Promise<DecodedImageFile> {
  return new Promise((resolve, reject) => {
    const imgEl = new window.Image();
    imgEl.onload = () => {
      resolve({
        file,
        objectUrl,
        naturalWidth: imgEl.naturalWidth,
        naturalHeight: imgEl.naturalHeight,
      });
    };
    imgEl.onerror = () => {
      reject(new Error(`Failed to decode image: ${file.name || 'unnamed'}`));
    };
    imgEl.src = objectUrl;
  });
}

export function getImageImportPosition(basePosition: CanvasPosition, index: number): CanvasPosition {
  const offset = index * 40;
  return {
    x: basePosition.x + offset,
    y: basePosition.y + offset,
  };
}

export function buildUploadedImageNodeData({
  label,
  objectUrl,
  naturalWidth,
  naturalHeight,
}: BuildUploadedImageNodeDataParams) {
  return {
    label,
    image: objectUrl,
    inputImage: objectUrl,
    currentImage: objectUrl,
    currentResultId: null,
    currentResultSet: null,
    generatedImages: [],
    generationTask: null,
    assetSource: 'upload',
    isGeneratedResult: false,
    width: naturalWidth,
    height: naturalHeight,
    ...getRoleData(null),
  };
}

export function buildUploadedImageNode({
  id,
  label,
  objectUrl,
  naturalWidth,
  naturalHeight,
  position,
  selected,
}: BuildUploadedImageNodeParams): Node {
  return {
    id,
    type: 'image',
    position,
    data: buildUploadedImageNodeData({
      label,
      objectUrl,
      naturalWidth,
      naturalHeight,
    }),
    selected,
  };
}
