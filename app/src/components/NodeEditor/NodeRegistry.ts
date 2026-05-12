import type { EditorNode, PortType } from '@/lib/nodeEditor/types';

export interface NodeTemplate {
  title: string;
  category: string;
  width: number;
  height: number;
  inputs: { id: string; type: PortType; name: string }[];
  outputs: { id: string; type: PortType; name: string }[];
  defaultParams?: Record<string, unknown>;
}

export const NODE_TEMPLATES: Record<string, NodeTemplate> = {
  PromptInput: {
    title: '提示词输入',
    category: 'input',
    width: 180,
    height: 80,
    inputs: [],
    outputs: [{ id: 'out-prompt', type: 'PROMPT', name: '提示词' }],
    defaultParams: { text: '' },
  },
  LoadModel: {
    title: '加载模型',
    category: 'loader',
    width: 180,
    height: 80,
    inputs: [],
    outputs: [{ id: 'out-model', type: 'MODEL', name: '模型' }],
    defaultParams: { modelName: 'SDXL' },
  },
  TextEncode: {
    title: '文本编码',
    category: 'process',
    width: 180,
    height: 100,
    inputs: [
      { id: 'in-prompt', type: 'PROMPT', name: '提示词' },
      { id: 'in-model', type: 'MODEL', name: '模型' },
    ],
    outputs: [{ id: 'out-cond', type: 'CONDITIONING', name: '条件' }],
  },
  EmptyLatent: {
    title: '空潜空间',
    category: 'input',
    width: 180,
    height: 100,
    inputs: [{ id: 'in-size', type: 'NUMBER', name: '尺寸' }],
    outputs: [{ id: 'out-latent', type: 'LATENT', name: '潜空间' }],
    defaultParams: { width: 512, height: 512 },
  },
  KSampler: {
    title: 'K采样器',
    category: 'sampler',
    width: 200,
    height: 140,
    inputs: [
      { id: 'in-model', type: 'MODEL', name: '模型' },
      { id: 'in-pos', type: 'CONDITIONING', name: '正向条件' },
      { id: 'in-neg', type: 'CONDITIONING', name: '负向条件' },
      { id: 'in-latent', type: 'LATENT', name: '潜空间' },
    ],
    outputs: [{ id: 'out-latent', type: 'LATENT', name: '潜空间' }],
    defaultParams: { steps: 20, cfg: 7.5 },
  },
  VAEDecode: {
    title: 'VAE解码',
    category: 'process',
    width: 180,
    height: 80,
    inputs: [
      { id: 'in-model', type: 'MODEL', name: '模型' },
      { id: 'in-latent', type: 'LATENT', name: '潜空间' },
    ],
    outputs: [{ id: 'out-image', type: 'IMAGE', name: '图像' }],
  },
  PreviewImage: {
    title: '预览图像',
    category: 'output',
    width: 180,
    height: 80,
    inputs: [{ id: 'in-image', type: 'IMAGE', name: '图像' }],
    outputs: [],
  },
};

export const NODE_CATEGORIES = [
  { key: 'input', label: '输入' },
  { key: 'loader', label: '加载器' },
  { key: 'process', label: '处理' },
  { key: 'sampler', label: '采样器' },
  { key: 'output', label: '输出' },
];

export function createNodeFromTemplate(type: string, id: string, x: number, y: number): EditorNode {
  const tmpl = NODE_TEMPLATES[type];
  if (!tmpl) {
    throw new Error(`Unknown node type: ${type}`);
  }
  const inputCount = Math.max(tmpl.inputs.length, 1);
  const outputCount = Math.max(tmpl.outputs.length, 1);
  const height = Math.max(tmpl.height, 60 + inputCount * 28, 60 + outputCount * 28);

  return {
    id,
    type,
    title: tmpl.title,
    x,
    y,
    width: tmpl.width,
    height,
    inputs: tmpl.inputs.map((p) => ({ ...p })),
    outputs: tmpl.outputs.map((p) => ({ ...p })),
    params: { ...(tmpl.defaultParams || {}) },
    selected: false,
    status: 'idle',
  };
}
