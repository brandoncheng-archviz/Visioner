import { describe, expect, it } from 'vitest';
import type { Node } from '@xyflow/react';
import { isSelectableCanvasImageReferenceNode } from './canvasReferenceSelection';

const imageNode = (id: string, data: Node['data']): Node => ({
  id,
  type: 'image',
  position: { x: 0, y: 0 },
  data,
});

describe('isSelectableCanvasImageReferenceNode', () => {
  it('accepts a different idle ImageNode with an image', () => {
    expect(isSelectableCanvasImageReferenceNode(imageNode('source', { currentImage: '/source.png' }), 'target')).toBe(true);
  });

  it('rejects the target itself, empty images, and processing images', () => {
    expect(isSelectableCanvasImageReferenceNode(imageNode('target', { currentImage: '/source.png' }), 'target')).toBe(false);
    expect(isSelectableCanvasImageReferenceNode(imageNode('empty', {}), 'target')).toBe(false);
    expect(isSelectableCanvasImageReferenceNode(imageNode('running', { currentImage: '/source.png', isProcessing: true }), 'target')).toBe(false);
  });
});
