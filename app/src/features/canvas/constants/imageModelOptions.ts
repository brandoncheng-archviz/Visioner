export type ImageModelProvider = 'google' | 'openai';
export type ImageModelResolution = '1K' | '2K' | '4K';
export type ImageModelCount = 1 | 2 | 4;

export type ImageModelOption = {
  id: string;
  label: string;
  provider: ImageModelProvider;
  iconText: string;
  iconBg: string;
  descriptionKey: string;
  resolutions: ImageModelResolution[];
  defaultResolution: ImageModelResolution;
  supportedCounts?: ImageModelCount[];
  costBase?: number;
};

// TODO: 待真实 API 接入后按实际模型能力调整。
export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  {
    id: 'Nano Banana 2',
    label: 'Nano Banana 2',
    provider: 'google',
    iconText: 'NB',
    iconBg: 'linear-gradient(135deg, rgba(66,133,244,0.95), rgba(52,168,83,0.9))',
    descriptionKey: 'modelParams.model.nanoBanana2.description',
    resolutions: ['1K', '2K'],
    defaultResolution: '2K',
    supportedCounts: [1, 2, 4],
    costBase: 14,
  },
  {
    id: 'Nano Banana Pro',
    label: 'Nano Banana Pro',
    provider: 'google',
    iconText: 'NB',
    iconBg: 'linear-gradient(135deg, rgba(52,168,83,0.95), rgba(251,188,5,0.86))',
    descriptionKey: 'modelParams.model.nanoBananaPro.description',
    resolutions: ['1K', '2K', '4K'],
    defaultResolution: '2K',
    supportedCounts: [1, 2, 4],
    costBase: 14,
  },
  {
    id: 'GPT Image 2',
    label: 'GPT Image 2',
    provider: 'openai',
    iconText: 'AI',
    iconBg: 'linear-gradient(135deg, rgba(16,163,127,0.95), rgba(103,232,249,0.72))',
    descriptionKey: 'modelParams.model.gptImage2.description',
    resolutions: ['1K', '2K', '4K'],
    defaultResolution: '2K',
    supportedCounts: [1],
    costBase: 14,
  },
];

export function getImageModelOption(modelId: string | undefined) {
  return IMAGE_MODEL_OPTIONS.find((option) => option.id === modelId) ?? IMAGE_MODEL_OPTIONS[0];
}
