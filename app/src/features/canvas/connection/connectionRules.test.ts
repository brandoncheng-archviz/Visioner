import { describe, expect, it } from 'vitest';
import type { ConnectionRuleMessages } from './connectionRules';
import { validateConnectionRules } from './connectionRules';

const messages: ConnectionRuleMessages = {
  wrongPortDirection: 'wrong direction',
  selfConnect: 'self connect',
  cannotConnect: 'cannot connect',
  portTypeMismatch: 'type mismatch',
  cycleDetected: 'cycle',
  alreadyConnected: 'duplicate',
  relightMaxOneImage: 'relight limit',
  upscaleMaxOneImage: 'upscale limit',
  compareMaxTwoImages: 'compare limit',
  usageConflict: () => 'usage conflict',
  referenceLimit: () => 'reference limit',
};

function validate(sourceNodeType: string, targetNodeType: string) {
  return validateConnectionRules({
    nodes: [
      { id: 'source', type: sourceNodeType, data: {} },
      { id: 'target', type: targetNodeType, data: {} },
    ],
    edges: [],
    sourceNodeId: 'source',
    targetNodeId: 'target',
    sourceHandle: 'right-source',
    targetHandle: 'left-target',
    sourceHandleType: 'source',
    targetHandleType: 'target',
    sourceDataType: 'image',
    targetDataType: 'image',
    sourceNodeType,
    targetNodeType,
    messages,
  });
}

describe('exterior render connection rules', () => {
  it('rejects manually connecting exteriorRender to an image node', () => {
    expect(validate('exteriorRender', 'image')).toEqual(expect.objectContaining({
      valid: false,
      code: 'exterior_render_manual_output',
    }));
  });

  it('keeps image to exteriorRender input connections valid', () => {
    expect(validate('image', 'exteriorRender')).toEqual({ valid: true });
  });
});

describe('shared reference connection rules', () => {
  it('keeps the existing reference limit rejection while delegating UI copy', () => {
    const existingSources = Array.from({ length: 6 }, (_, index) => ({
      id: `existing-${index}`,
      type: 'image',
      data: {},
    }));
    const result = validateConnectionRules({
      nodes: [
        { id: 'source', type: 'image', data: {} },
        { id: 'target', type: 'image', data: {} },
        ...existingSources,
      ],
      edges: existingSources.map((source) => ({ source: source.id, target: 'target' })),
      sourceNodeId: 'source',
      targetNodeId: 'target',
      sourceHandle: 'right-source',
      targetHandle: 'left-target',
      sourceHandleType: 'source',
      targetHandleType: 'target',
      sourceDataType: 'image',
      targetDataType: 'image',
      sourceNodeType: 'image',
      targetNodeType: 'image',
      messages,
    });

    expect(result).toEqual(expect.objectContaining({
      valid: false,
      code: 'reference_limit',
      reason: 'reference limit',
    }));
  });
});
