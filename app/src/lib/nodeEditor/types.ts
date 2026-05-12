/* ─── Core Types for Canvas 2D Node Editor ─── */

export interface Point {
  x: number;
  y: number;
}

export interface EditorPort {
  id: string;
  type: PortType;
  name: string;
}

export type PortType =
  | 'IMAGE'
  | 'PROMPT'
  | 'LATENT'
  | 'MODEL'
  | 'NUMBER'
  | 'CONDITIONING'
  | 'STRING'
  | 'BOOLEAN'
  | 'ANY';

export interface EditorNode {
  id: string;
  type: string;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  inputs: EditorPort[];
  outputs: EditorPort[];
  params: Record<string, unknown>;
  selected: boolean;
  status?: 'idle' | 'running' | 'success' | 'error';
  progress?: number;
  cachedInputHash?: string;
  outputData?: Record<string, unknown>;
}

export interface EditorEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
  selected: boolean;
  transmittedType?: PortType;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ConnectionPreview {
  sourceNodeId: string;
  sourcePortId: string;
  mouseX: number;
  mouseY: number;
  valid: boolean;
  targetNodeId?: string;
  targetPortId?: string;
}

export interface PortTypeMeta {
  id: PortType;
  color: string;
  label: string;
}

export const PORT_TYPE_META: Record<PortType, PortTypeMeta> = {
  IMAGE: { id: 'IMAGE', color: '#22d3ee', label: '图像' },
  PROMPT: { id: 'PROMPT', color: '#a855f7', label: '提示词' },
  LATENT: { id: 'LATENT', color: '#f59e0b', label: '潜空间' },
  MODEL: { id: 'MODEL', color: '#3b82f6', label: '模型' },
  NUMBER: { id: 'NUMBER', color: '#22c55e', label: '数值' },
  CONDITIONING: { id: 'CONDITIONING', color: '#ec4899', label: '条件' },
  STRING: { id: 'STRING', color: '#94a3b8', label: '字符串' },
  BOOLEAN: { id: 'BOOLEAN', color: '#ef4444', label: '布尔' },
  ANY: { id: 'ANY', color: '#ffffff', label: '任意' },
};

export interface ConnectionResult {
  valid: boolean;
  cast: boolean;
  reason?: string;
  castFrom?: PortType;
  castTo?: PortType;
}

export function canConnect(source: PortType, target: PortType): ConnectionResult {
  if (source === target) return { valid: true, cast: false };
  if (target === 'ANY' || source === 'ANY') return { valid: true, cast: false };
  const autoCastMap: Record<string, PortType[]> = { STRING: ['PROMPT'], NUMBER: ['STRING'] };
  if (autoCastMap[source]?.includes(target)) {
    return { valid: true, cast: true, castFrom: source, castTo: target };
  }
  return { valid: false, cast: false, reason: `类型不匹配：${source} 无法连接至 ${target}` };
}
