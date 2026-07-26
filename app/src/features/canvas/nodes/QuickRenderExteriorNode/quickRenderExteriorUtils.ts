import type {
  QuickRenderAtmosphereOption,
  QuickRenderExteriorNodeData,
  QuickRenderPendingRenderChannelFile,
  QuickRenderRenderChannel,
  QuickRenderRenderChannelType,
} from './quickRenderExterior.types';

export const QUICK_RENDER_CHANNELS: Record<QuickRenderRenderChannelType, {
  name: string;
}> = {
  beauty: { name: 'Beauty' },
  albedo: { name: 'Albedo' },
  normal: { name: 'Normal' },
  ao: { name: 'AO' },
  depth: { name: 'Depth' },
  mask: { name: 'Mask / ID' },
  materialId: { name: 'Material ID' },
  objectId: { name: 'Object ID' },
  unknown: { name: 'Unrecognized' },
};

export const QUICK_RENDER_CHANNEL_TYPES: QuickRenderRenderChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'ao',
  'depth',
  'mask',
  'unknown',
];

export const QUICK_RENDER_CHANNEL_SORT_ORDER: QuickRenderRenderChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'ao',
  'depth',
  'mask',
  'materialId',
  'objectId',
  'unknown',
];

const DETECTION_RULES: Array<{ type: QuickRenderRenderChannelType; keywords: string[] }> = [
  { type: 'mask', keywords: ['materialid', 'material_id', 'matid', 'objectid', 'object_id', 'objid', 'maskid', 'mask', 'idmap', 'material', 'object'] },
  { type: 'ao', keywords: ['ambientocclusion', 'ao'] },
  { type: 'albedo', keywords: ['sourcecolor', 'basecolor', 'albedo', 'diffuse'] },
  { type: 'beauty', keywords: ['beauty', 'render', 'final', 'rgb'] },
  { type: 'normal', keywords: ['normals', 'normal'] },
  { type: 'depth', keywords: ['zdepth', 'depth'] },
];

export function normalizeQuickRenderRenderChannelFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[\s_-]+/g, '');
}

export function detectQuickRenderRenderChannelType(fileName: string): QuickRenderRenderChannelType | null {
  const normalized = normalizeQuickRenderRenderChannelFileName(fileName);
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
    renderChannelsEnabled: false,
    renderChannels: { channels: [], pendingFiles: [] },
    prompt: '',
    modelParams: { model: 'Nano Banana 2', aspectRatio: 'adaptive', resolution: '2K', count: 1 },
    generationTask: { taskId: null, status: 'idle', errorCode: null, startedAt: null, completedAt: null },
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

export function createQuickRenderRenderChannel(
  type: QuickRenderRenderChannelType,
  imageUrl: string,
  fileName?: string,
  mimeType?: string,
  sourceType: 'upload' | 'canvas' = 'upload',
  sourceNodeId?: string,
  width?: number,
  height?: number,
): QuickRenderRenderChannel {
  const meta = QUICK_RENDER_CHANNELS[type];
  return {
    id: `quick-render-channel-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

export function getQuickRenderRenderChannelName(type: QuickRenderRenderChannelType) {
  return QUICK_RENDER_CHANNELS[type]?.name || QUICK_RENDER_CHANNELS.unknown.name;
}

export function normalizeQuickRenderRenderChannel(channel: QuickRenderRenderChannel): QuickRenderRenderChannel {
  return {
    ...channel,
    type: channel.type,
    name: getQuickRenderRenderChannelName(channel.type),
  };
}

export function sortQuickRenderRenderChannels(channels: QuickRenderRenderChannel[]) {
  return [...channels].map(normalizeQuickRenderRenderChannel).sort((a, b) => {
    const orderA = QUICK_RENDER_CHANNEL_SORT_ORDER.indexOf(a.type);
    const orderB = QUICK_RENDER_CHANNEL_SORT_ORDER.indexOf(b.type);
    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
  });
}

export function mergeQuickRenderDetectedChannels(
  currentChannels: QuickRenderRenderChannel[],
  files: Array<{ type: QuickRenderRenderChannelType; imageUrl: string; fileName: string; mimeType?: string }>,
): QuickRenderRenderChannel[] {
  const lastByType = new Map<QuickRenderRenderChannelType, typeof files[number]>();
  files.forEach((file) => lastByType.set(file.type, file));
  let nextChannels = currentChannels.map((channel) => {
    const replacement = lastByType.get(channel.type);
    if (!replacement) return channel;
    lastByType.delete(channel.type);
    return normalizeQuickRenderRenderChannel({
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
      createQuickRenderRenderChannel(file.type, file.imageUrl, file.fileName, file.mimeType),
    ];
  });
  return sortQuickRenderRenderChannels(nextChannels);
}

export function createPendingQuickRenderRenderChannelFile(
  imageUrl: string,
  fileName: string,
  mimeType?: string,
): QuickRenderPendingRenderChannelFile {
  return {
    id: `quick-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    imageUrl,
    fileName,
    mimeType,
  };
}

export function getQuickRenderRenderChannelsEnabled(channels: QuickRenderRenderChannel[] = []) {
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
