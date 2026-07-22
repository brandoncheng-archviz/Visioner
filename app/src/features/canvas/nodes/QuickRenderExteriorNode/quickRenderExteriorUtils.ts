import type {
  QuickRenderAtmosphereOption,
  QuickRenderExteriorNodeData,
  QuickRenderPendingStructureFile,
  QuickRenderStructureChannel,
  QuickRenderStructureChannelType,
} from './quickRenderExterior.types';

export const QUICK_RENDER_STRUCTURE_CHANNELS: Record<QuickRenderStructureChannelType, {
  name: string;
}> = {
  beauty: { name: 'Beauty' },
  albedo: { name: 'Albedo' },
  normal: { name: 'Normal' },
  ao: { name: 'AO' },
  depth: { name: 'Depth' },
  maskId: { name: 'Mask / ID' },
  materialId: { name: 'Material ID' },
  objectId: { name: 'Object ID' },
  unknown: { name: '未识别' },
};

export const QUICK_RENDER_STRUCTURE_TYPES: QuickRenderStructureChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'ao',
  'depth',
  'maskId',
  'unknown',
];

export const QUICK_RENDER_STRUCTURE_SORT_ORDER: QuickRenderStructureChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'ao',
  'depth',
  'maskId',
  'materialId',
  'objectId',
  'unknown',
];

const DETECTION_RULES: Array<{ type: QuickRenderStructureChannelType; keywords: string[] }> = [
  { type: 'maskId', keywords: ['materialid', 'material_id', 'matid', 'objectid', 'object_id', 'objid', 'maskid', 'mask', 'idmap', 'material', 'object'] },
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
    atmosphereEnabled: true,
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
  sourceType: 'upload' | 'canvas' = 'upload',
  sourceNodeId?: string,
  width?: number,
  height?: number,
): QuickRenderStructureChannel {
  const meta = QUICK_RENDER_STRUCTURE_CHANNELS[type];
  return {
    id: `quick-structure-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    name: meta.name,
    imageUrl,
    fileName,
    mimeType,
    sourceType,
    sourceNodeId,
    width,
    height,
  };
}

export function getQuickRenderStructureChannelName(type: QuickRenderStructureChannelType) {
  return QUICK_RENDER_STRUCTURE_CHANNELS[type]?.name || QUICK_RENDER_STRUCTURE_CHANNELS.unknown.name;
}

export function normalizeQuickRenderStructureChannel(channel: QuickRenderStructureChannel): QuickRenderStructureChannel {
  return {
    ...channel,
    type: channel.type,
    name: getQuickRenderStructureChannelName(channel.type),
  };
}

export function sortQuickRenderStructureChannels(channels: QuickRenderStructureChannel[]) {
  return [...channels].map(normalizeQuickRenderStructureChannel).sort((a, b) => {
    const orderA = QUICK_RENDER_STRUCTURE_SORT_ORDER.indexOf(a.type);
    const orderB = QUICK_RENDER_STRUCTURE_SORT_ORDER.indexOf(b.type);
    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
  });
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
    return normalizeQuickRenderStructureChannel({
      ...channel,
      imageUrl: replacement.imageUrl,
      fileName: replacement.fileName,
      mimeType: replacement.mimeType,
      sourceType: 'upload',
    });
  });
  lastByType.forEach((file) => {
    nextChannels = [
      ...nextChannels,
      createQuickRenderStructureChannel(file.type, file.imageUrl, file.fileName, file.mimeType),
    ];
  });
  return sortQuickRenderStructureChannels(nextChannels);
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
  return channels.some((channel) => Boolean(channel.imageUrl));
}

export function resolveFollowReferenceOption(
  current: QuickRenderAtmosphereOption | undefined,
  hasReference: boolean,
): QuickRenderAtmosphereOption {
  if (current?.source === 'manual') return current;
  if (hasReference) return { source: 'followReference' };
  return { source: 'unset' };
}
