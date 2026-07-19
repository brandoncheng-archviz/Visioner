import type {
  QuickRenderAtmosphereOption,
  QuickRenderExteriorNodeData,
  QuickRenderPendingStructureFile,
  QuickRenderStructureChannel,
  QuickRenderStructureChannelType,
} from './quickRenderExterior.types';

export const QUICK_RENDER_STRUCTURE_CHANNELS: Record<QuickRenderStructureChannelType, {
  name: string;
  description: string;
  defaultWeight: number;
}> = {
  beauty: { name: 'Beauty', description: '主体结构与细节', defaultWeight: 0.8 },
  albedo: { name: 'Albedo', description: '材质 / 颜色约束', defaultWeight: 0.7 },
  normal: { name: 'Normal', description: '表面法线', defaultWeight: 0.6 },
  depth: { name: 'Depth', description: '深度 / 空间关系', defaultWeight: 0.5 },
  ao: { name: 'AO', description: '环境遮蔽', defaultWeight: 0.5 },
  materialId: { name: 'Material ID', description: '材质分区', defaultWeight: 0.5 },
  objectId: { name: 'Object ID', description: '对象分区', defaultWeight: 0.5 },
};

export const QUICK_RENDER_STRUCTURE_TYPES = Object.keys(
  QUICK_RENDER_STRUCTURE_CHANNELS,
) as QuickRenderStructureChannelType[];

const DETECTION_RULES: Array<{ type: QuickRenderStructureChannelType; keywords: string[] }> = [
  { type: 'materialId', keywords: ['materialid', 'matid', 'material'] },
  { type: 'objectId', keywords: ['objectid', 'objid', 'object'] },
  { type: 'ao', keywords: ['ambientocclusion', 'ao'] },
  { type: 'albedo', keywords: ['sourcecolor', 'basecolor', 'albedo', 'diffuse'] },
  { type: 'beauty', keywords: ['beauty', 'render', 'final', 'rgb'] },
  { type: 'normal', keywords: ['normals', 'normal'] },
  { type: 'depth', keywords: ['zdepth', 'depth'] },
];

export function normalizeQuickRenderStructureFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[\s_-]+/g, '');
}

export function detectQuickRenderStructureChannelType(fileName: string): QuickRenderStructureChannelType | null {
  const normalized = normalizeQuickRenderStructureFileName(fileName);
  for (const rule of DETECTION_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.type;
    }
  }
  return null;
}

export function createQuickRenderExteriorNodeData(label: string): QuickRenderExteriorNodeData {
  return {
    label,
    title: label,
    connectedImages: [],
    atmosphereEnabled: false,
    atmosphere: {
      time: { source: 'unset' },
      weather: { source: 'unset' },
      light: { source: 'unset' },
      style: { source: 'unset' },
      addEntourage: false,
      addPeople: false,
      interiorLights: false,
      motionBlur: false,
    },
    structureEnabled: false,
    structure: { channels: [], pendingFiles: [] },
    prompt: '',
    modelParams: { model: 'Nano Banana 2', aspectRatio: '1:1', resolution: '2K', count: 1 },
    status: 'idle',
  };
}

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function createUploadedQuickRenderInputImage(
  imageUrl: string,
  fileName: string,
  mimeType?: string,
) {
  return {
    id: `quick-input-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceType: 'upload' as const,
    imageUrl,
    fileName,
    mimeType,
    width: 1024,
    height: 1024,
    label: fileName,
  };
}

export function createQuickRenderStructureChannel(
  type: QuickRenderStructureChannelType,
  imageUrl: string,
  fileName?: string,
  mimeType?: string,
): QuickRenderStructureChannel {
  const meta = QUICK_RENDER_STRUCTURE_CHANNELS[type];
  return {
    id: `quick-structure-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: meta.name,
    description: meta.description,
    imageUrl,
    enabled: true,
    weight: meta.defaultWeight,
    fileName,
    mimeType,
  };
}

export function mergeQuickRenderDetectedChannels(
  currentChannels: QuickRenderStructureChannel[],
  files: Array<{ type: QuickRenderStructureChannelType; imageUrl: string; fileName: string; mimeType?: string }>,
): QuickRenderStructureChannel[] {
  const lastByType = new Map<QuickRenderStructureChannelType, typeof files[number]>();
  files.forEach((file) => lastByType.set(file.type, file));
  let nextChannels = currentChannels.map((channel) => {
    const replacement = lastByType.get(channel.type);
    if (!replacement) return channel;
    lastByType.delete(channel.type);
    return {
      ...channel,
      imageUrl: replacement.imageUrl,
      fileName: replacement.fileName,
      mimeType: replacement.mimeType,
    };
  });
  lastByType.forEach((file) => {
    nextChannels = [
      ...nextChannels,
      createQuickRenderStructureChannel(file.type, file.imageUrl, file.fileName, file.mimeType),
    ];
  });
  return nextChannels;
}

export function createPendingQuickRenderStructureFile(
  imageUrl: string,
  fileName: string,
  mimeType?: string,
): QuickRenderPendingStructureFile {
  return {
    id: `quick-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    imageUrl,
    fileName,
    mimeType,
  };
}

export function getQuickRenderStructureEnabled(channels: QuickRenderStructureChannel[] = []) {
  return channels.some((channel) => Boolean(channel.imageUrl) && channel.enabled !== false);
}

export function resolveFollowReferenceOption(
  current: QuickRenderAtmosphereOption | undefined,
  hasReference: boolean,
): QuickRenderAtmosphereOption {
  if (current?.source === 'manual') return current;
  if (hasReference) return { source: 'followReference' };
  return { source: 'unset' };
}
