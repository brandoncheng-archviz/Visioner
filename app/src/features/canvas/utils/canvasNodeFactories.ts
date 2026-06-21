import type { Node } from '@xyflow/react';

import { DEFAULT_MODEL_PARAMS } from '../constants/canvasConstants';
import { UPSCALE_NODE_DEFAULTS } from '../constants/upscaleNodeDefaults';
import { DEFAULT_TEXT_NODE_MODEL } from '../constants/textNode';
import type { RelightCreationOptions } from '../types/relight.types';
import { getRoleData } from './referenceUtils';

type CanvasPosition = {
  x: number;
  y: number;
};

type CreateBasicCanvasNodeOptions = {
  id: string;
  type: string;
  position: CanvasPosition;
  label: string;
};

type CreateToolNodeOptions = {
  id: string;
  sourceNode: Node;
  estimatedWidth: number;
  label: string;
  inputImage: string;
  width: number;
  height: number;
};

type CreateRelightNodeOptions = CreateToolNodeOptions & {
  sourceNodeId: string;
  options?: RelightCreationOptions;
};

type CreateCompareNodeOptions = {
  id: string;
  sourceNode: Node;
  estimatedWidth: number;
  label: string;
};

const NODE_SPACING = 80;

export function createBasicCanvasNode({
  id,
  type,
  position,
  label,
}: CreateBasicCanvasNodeOptions): Node {
  return {
    id,
    type,
    position,
    data: {
      label,
      ...(type === 'image'
        ? {
            ...getRoleData(null),
            prompt: '',
            promptContent: [],
            lightPreview: null,
            selectedPresets: [],
            selectedStyleId: null,
            modelParams: { ...DEFAULT_MODEL_PARAMS },
            generatedImages: [],
            generationTask: null,
            currentResultSet: null,
            currentResultId: null,
            references: [],
            referenceImages: [],
            referencesSignature: '[]',
            referenceOrder: [],
          }
        : {}),
      ...(type === 'upscale' ? UPSCALE_NODE_DEFAULTS : {}),
      ...(type === 'text'
        ? {
            title: label,
            content: '',
            text: '',
            status: 'empty',
            referencedImageNodeIds: [],
            referencedTextNodeIds: [],
            outputTargetImageNodeIds: [],
            activeModel: DEFAULT_TEXT_NODE_MODEL,
            lastActionType: null,
            editorInput: '',
            textMode: 'unset',
          }
        : {}),
    },
  };
}

export function createUpscaleNodeData(label: string, inputImage: string, width: number, height: number) {
  return {
    label,
    inputImage,
    image: inputImage,
    width,
    height,
    ...UPSCALE_NODE_DEFAULTS,
  };
}

export function createUpscaleCanvasNode({
  id,
  sourceNode,
  estimatedWidth,
  label,
  inputImage,
  width,
  height,
}: CreateToolNodeOptions): Node {
  return {
    id,
    type: 'upscale',
    position: {
      x: sourceNode.position.x + estimatedWidth + NODE_SPACING,
      y: sourceNode.position.y,
    },
    data: createUpscaleNodeData(label, inputImage, width, height),
    selected: true,
  };
}

export function createSunSkyNodeData(label: string, inputImage: string, width: number, height: number) {
  return {
    label,
    inputImage,
    image: inputImage,
    width,
    height,
  };
}

export function createSunSkyCanvasNode({
  id,
  sourceNode,
  estimatedWidth,
  label,
  inputImage,
  width,
  height,
}: CreateToolNodeOptions): Node {
  return {
    id,
    type: 'sunSky',
    position: {
      x: sourceNode.position.x + estimatedWidth + NODE_SPACING,
      y: sourceNode.position.y,
    },
    data: createSunSkyNodeData(label, inputImage, width, height),
    selected: true,
  };
}

export function createRelightNodeData(
  sourceNodeId: string,
  label: string,
  inputImage: string,
  width: number,
  height: number,
  options?: RelightCreationOptions,
) {
  return {
    generationMode: 'relight',
    label,
    sourceImageNodeIds: [sourceNodeId],
    status: 'empty',
    viewMode: 'edit',
    inputImage,
    width,
    height,
    lightPreview: options?.lightPreview
      ? {
          ...options.lightPreview,
          sun: { ...options.lightPreview.sun },
          derived: { ...options.lightPreview.derived },
        }
      : undefined,
    relightSettings: options?.relightSettings ? { ...options.relightSettings } : undefined,
  };
}

export function createRelightCanvasNode({
  id,
  sourceNode,
  estimatedWidth,
  sourceNodeId,
  label,
  inputImage,
  width,
  height,
  options,
}: CreateRelightNodeOptions): Node {
  return {
    id,
    type: 'relight',
    position: {
      x: sourceNode.position.x + estimatedWidth + NODE_SPACING,
      y: sourceNode.position.y,
    },
    data: createRelightNodeData(sourceNodeId, label, inputImage, width, height, options),
    selected: true,
  };
}

export function createCompareNodeData(label: string) {
  return {
    label,
    sliderPosition: 50,
  };
}

export function createCompareCanvasNode({
  id,
  sourceNode,
  estimatedWidth,
  label,
}: CreateCompareNodeOptions): Node {
  return {
    id,
    type: 'compare',
    position: {
      x: sourceNode.position.x + estimatedWidth + NODE_SPACING,
      y: sourceNode.position.y,
    },
    data: createCompareNodeData(label),
    selected: true,
  };
}
