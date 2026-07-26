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

describe('quick render connection rules', () => {
  it('rejects manually connecting quickRenderExterior to an image node', () => {
    expect(validate('quickRenderExterior', 'image')).toEqual(expect.objectContaining({
      valid: false,
      code: 'quick_render_manual_output',
    }));
  });

  it('keeps image to quickRenderExterior input connections valid', () => {
    expect(validate('image', 'quickRenderExterior')).toEqual({ valid: true });
  });
});
