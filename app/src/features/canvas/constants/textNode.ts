import type { TextNodeModel } from '../types/basicNode.types';

export const TEXT_NODE_WIDTH = 300;
export const TEXT_NODE_MIN_HEIGHT = 300;
export const TEXT_NODE_MAX_HEIGHT = 420;

export const TEXT_NODE_PLACEHOLDER = '描述你想要的画面、氛围或修改方向...';

export const TEXT_NODE_IMAGE_EXTRACTION_PROMPT = `根据图片生成结构化中文提示词，提取以下内容：
1. 主体描述
2. 场景/环境
3. 光影与时间段
4. 镜头视角与构图
5. 风格关键词
6. 材质与细节特征
7. 可选避免内容
请使用清晰分段，便于后续一键用于生图。`;

export const DEFAULT_TEXT_NODE_MODEL: TextNodeModel = 'Gemini 3.1 Flash Lite';

export const TEXT_NODE_MODELS: Array<{
  name: TextNodeModel;
  description: string;
  credits: number;
}> = [
  {
    name: 'Gemini 3.1 Pro',
    description: '增强推理 · 高质量 · 10~20s',
    credits: 4,
  },
  {
    name: 'Gemini 3.1 Flash Lite',
    description: '轻量快速 · 低成本 · 5~10s',
    credits: 1,
  },
  {
    name: 'Gemini 3 Flash',
    description: '快速高效 · 通用 · 10~20s',
    credits: 2,
  },
  {
    name: 'DeepSeek V4 Pro',
    description: '深度推理 · 高质量 · 10~20s',
    credits: 4,
  },
];
