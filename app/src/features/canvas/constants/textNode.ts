import type { TextNodeModel } from '../types/basicNode.types';

export const TEXT_NODE_WIDTH = 300;
export const TEXT_NODE_MIN_HEIGHT = 300;
export const TEXT_NODE_MAX_HEIGHT = 420;

export const TEXT_NODE_PLACEHOLDER_KEY = 'textNode.compose.placeholder';

export const TEXT_NODE_IMAGE_EXTRACTION_PROMPT_KEY = 'textNode.extract.prompt';

export const DEFAULT_TEXT_NODE_MODEL: TextNodeModel = 'Gemini 3.1 Flash Lite';

export const TEXT_NODE_MODELS: Array<{
  name: TextNodeModel;
  descriptionKey: string;
  credits: number;
}> = [
  {
    name: 'Gemini 3.1 Pro',
    descriptionKey: 'textNode.models.geminiPro',
    credits: 4,
  },
  {
    name: 'Gemini 3.1 Flash Lite',
    descriptionKey: 'textNode.models.geminiFlashLite',
    credits: 1,
  },
  {
    name: 'Gemini 3 Flash',
    descriptionKey: 'textNode.models.geminiFlash',
    credits: 2,
  },
  {
    name: 'DeepSeek V4 Pro',
    descriptionKey: 'textNode.models.deepSeekPro',
    credits: 4,
  },
];
