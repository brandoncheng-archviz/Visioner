import type { ImageReferenceEdgeData, ImageRole } from '../types/imageNode.types';

export type ConnectionRejectCode =
  | 'same_handle_side'
  | 'same_node'
  | 'data_type_mismatch'
  | 'cycle'
  | 'duplicate'
  | 'relight_input_limit'
  | 'upscale_input_limit'
  | 'compare_input_limit'
  | 'exterior_render_manual_output'
  | 'reference_limit'
  | 'unique_reference_role_conflict'
  | 'invalid_text_mode'
  | 'unknown';

export type ConnectionValidationResult = {
  valid: boolean;
  reason?: string;
  code?: ConnectionRejectCode;
  meta?: Record<string, unknown>;
};

export type ConnectionEdgePayload = {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
};

export type ConnectionDecision =
  | {
      type: 'CREATE_EDGE';
      valid: true;
      payload: ConnectionEdgePayload;
      meta?: Record<string, unknown>;
    }
  | {
      type: 'OPEN_CREATE_MENU';
      valid: true;
      payload: {
        position: { x: number; y: number };
        sourceNodeId?: string;
        sourceHandle?: string;
      };
      meta?: Record<string, unknown>;
    }
  | {
      type: 'REJECT_CONNECTION';
      valid: false;
      reason: string;
      code?: ConnectionRejectCode;
      meta?: Record<string, unknown>;
    }
  | {
      type: 'RESET';
      valid: true;
    };

export type ConnectionRuleNode = {
  id: string;
  type?: string;
  data?: ImageReferenceEdgeData & {
    [key: string]: unknown;
  };
};

export type ConnectionRuleEdge = {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  data?: {
    role?: ImageRole | null;
    [key: string]: unknown;
  };
};
