import type {
  ExteriorRenderAtmosphereOption,
  ExteriorRenderNodeData,
  ExteriorRenderPendingRenderChannelFile,
  ExteriorRenderRenderChannel,
  ExteriorRenderRenderChannelType,
} from './exteriorRender.types';

export const EXTERIOR_RENDER_CHANNELS: Record<ExteriorRenderRenderChannelType, {
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

export const EXTERIOR_RENDER_CHANNEL_TYPES: ExteriorRenderRenderChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'ao',
  'depth',
  'mask',
  'unknown',
];

export const EXTERIOR_RENDER_CHANNEL_SORT_ORDER: ExteriorRenderRenderChannelType[] = [
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

const DETECTION_RULES: Array<{ type: ExteriorRenderRenderChannelType; keywords: string[] }> = [
  { type: 'mask', keywords: ['materialid', 'material_id', 'matid', 'objectid', 'object_id', 'objid', 'maskid', 'mask', 'idmap', 'material', 'object'] },
  { type: 'ao', keywords: ['ambientocclusion', 'ao'] },
  { type: 'albedo', keywords: ['sourcecolor', 'basecolor', 'albedo', 'diffuse'] },
  { type: 'beauty', keywords: ['beauty', 'render', 'final', 'rgb'] },
  { type: 'normal', keywords: ['normals', 'normal'] },
  { type: 'depth', keywords: ['zdepth', 'depth'] },
];

export function normalizeExteriorRenderRenderChannelFileName(fileName: string): string {
  return fileName.toLowerCase().replace(/[\s_-]+/g, '');
}

export function detectExteriorRenderRenderChannelType(fileName: string): ExteriorRenderRenderChannelType | null {
  const normalized = normalizeExteriorRenderRenderChannelFileName(fileName);
  for (const rule of DETECTION_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.type;
    }
  }
  return null;
}

export function createExteriorRenderNodeData(label: string): ExteriorRenderNodeData {
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

export function createUploadedExteriorRenderInputImage(
  imageUrl: string,
  fileName: string,
  mimeType?: string,
) {
  return {
    id: `exterior-render-input-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceType: 'upload' as const,
    imageUrl,
    fileName,
    mimeType,
    width: 1024,
    height: 1024,
    label: fileName,
  };
}

export function createExteriorRenderRenderChannel(
  type: ExteriorRenderRenderChannelType,
  imageUrl: string,
  fileName?: string,
  mimeType?: string,
  sourceType: 'upload' | 'canvas' = 'upload',
  sourceNodeId?: string,
  width?: number,
  height?: number,
): ExteriorRenderRenderChannel {
  const meta = EXTERIOR_RENDER_CHANNELS[type];
  return {
    id: `exterior-render-channel-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

export function getExteriorRenderRenderChannelName(type: ExteriorRenderRenderChannelType) {
  return EXTERIOR_RENDER_CHANNELS[type]?.name || EXTERIOR_RENDER_CHANNELS.unknown.name;
}

const SYSTEM_EXTERIOR_RENDER_LABEL_PATTERN = /^(?:室外渲染|Exterior Render)(\s+\d+)?$/i;

export function getExteriorRenderDisplayLabel(label: string | undefined, translatedTitle: string): string {
  const normalizedLabel = label?.trim();
  if (!normalizedLabel) return translatedTitle;
  const match = normalizedLabel.match(SYSTEM_EXTERIOR_RENDER_LABEL_PATTERN);
  return match ? `${translatedTitle}${match[1] || ''}` : normalizedLabel;
}

export function normalizeExteriorRenderRenderChannel(channel: ExteriorRenderRenderChannel): ExteriorRenderRenderChannel {
  return {
    ...channel,
    type: channel.type,
    name: getExteriorRenderRenderChannelName(channel.type),
  };
}

export function sortExteriorRenderRenderChannels(channels: ExteriorRenderRenderChannel[]) {
  return [...channels].map(normalizeExteriorRenderRenderChannel).sort((a, b) => {
    const orderA = EXTERIOR_RENDER_CHANNEL_SORT_ORDER.indexOf(a.type);
    const orderB = EXTERIOR_RENDER_CHANNEL_SORT_ORDER.indexOf(b.type);
    return (orderA === -1 ? 999 : orderA) - (orderB === -1 ? 999 : orderB);
  });
}

export function mergeExteriorRenderDetectedChannels(
  currentChannels: ExteriorRenderRenderChannel[],
  files: Array<{ type: ExteriorRenderRenderChannelType; imageUrl: string; fileName: string; mimeType?: string }>,
): ExteriorRenderRenderChannel[] {
  const lastByType = new Map<ExteriorRenderRenderChannelType, typeof files[number]>();
  files.forEach((file) => lastByType.set(file.type, file));
  let nextChannels = currentChannels.map((channel) => {
    const replacement = lastByType.get(channel.type);
    if (!replacement) return channel;
    lastByType.delete(channel.type);
    return normalizeExteriorRenderRenderChannel({
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
      createExteriorRenderRenderChannel(file.type, file.imageUrl, file.fileName, file.mimeType),
    ];
  });
  return sortExteriorRenderRenderChannels(nextChannels);
}

export function createPendingExteriorRenderRenderChannelFile(
  imageUrl: string,
  fileName: string,
  mimeType?: string,
): ExteriorRenderPendingRenderChannelFile {
  return {
    id: `exterior-render-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    imageUrl,
    fileName,
    mimeType,
  };
}

export function getExteriorRenderRenderChannelsEnabled(channels: ExteriorRenderRenderChannel[] = []) {
  return channels.some((channel) => Boolean(channel.imageUrl));
}

export function resolveFollowReferenceOption(
  current: ExteriorRenderAtmosphereOption | undefined,
  hasReference: boolean,
): ExteriorRenderAtmosphereOption {
  if (current?.source === 'manual') return current;
  if (hasReference) return { source: 'followReference' };
  return { source: 'unset' };
}
