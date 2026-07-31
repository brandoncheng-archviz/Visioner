import type {
  ImageNodeControllers,
  PendingStructureChannelFile,
  StructureChannel,
  StructureChannelType,
  StructureControllerData,
} from './imageControllers.types';

export const STRUCTURE_CHANNEL_TYPES: StructureChannelType[] = [
  'beauty',
  'albedo',
  'normal',
  'depth',
  'ao',
  'materialId',
  'objectId',
];

const STRUCTURE_CHANNEL_LABELS: Record<StructureChannelType, string> = {
  beauty: 'Beauty',
  albedo: 'Albedo',
  normal: 'Normal',
  depth: 'Depth',
  ao: 'AO',
  materialId: 'Material ID',
  objectId: 'Object ID',
};

const STRUCTURE_CHANNEL_DETECTION_RULES: Array<{
  type: StructureChannelType;
  keywords: string[];
}> = [
  { type: 'materialId', keywords: ['materialid', 'material', 'matid'] },
  { type: 'objectId', keywords: ['objectid', 'object', 'objid'] },
  { type: 'ao', keywords: ['ambientocclusion', 'ao'] },
  { type: 'albedo', keywords: ['sourcecolor', 'basecolor', 'albedo', 'diffuse'] },
  { type: 'beauty', keywords: ['beauty', 'render', 'final', 'rgb'] },
  { type: 'normal', keywords: ['normals', 'normal'] },
  { type: 'depth', keywords: ['zdepth', 'depth'] },
];

export interface StructureChannelImageData {
  imageUrl: string;
  fileName: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface DetectedStructureChannelFile extends StructureChannelImageData {
  type: StructureChannelType;
}

export function getStructureChannelLabel(type: StructureChannelType): string {
  return STRUCTURE_CHANNEL_LABELS[type];
}

export function normalizeStructureChannelFileName(fileName: string): string {
  return fileName
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function detectStructureChannelTypeFromFileName(fileName: string): StructureChannelType | null {
  const normalizedName = normalizeStructureChannelFileName(fileName);
  const matchedRule = STRUCTURE_CHANNEL_DETECTION_RULES.find((rule) => (
    rule.keywords.some((keyword) => normalizedName.includes(keyword))
  ));
  return matchedRule?.type ?? null;
}

export function createStructureChannelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `structure-channel-${crypto.randomUUID()}`;
  }
  return `structure-channel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createPendingStructureFileId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `pending-structure-file-${crypto.randomUUID()}`;
  }
  return `pending-structure-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidStructureChannel(channel: StructureChannel | undefined): channel is StructureChannel {
  return Boolean(channel?.id && channel.type && channel.imageUrl);
}

export function isStructureChannelEnabled(channel: StructureChannel | undefined): boolean {
  return Boolean(channel?.imageUrl && channel.enabled !== false);
}

export function getValidStructureChannels(structure?: StructureControllerData): StructureChannel[] {
  if (!Array.isArray(structure?.channels)) return [];
  return structure.channels.filter(isValidStructureChannel);
}

export function getPendingStructureFiles(structure?: StructureControllerData): PendingStructureChannelFile[] {
  if (!Array.isArray(structure?.pendingFiles)) return [];
  return structure.pendingFiles.filter((file) => Boolean(file.id && file.imageUrl && file.fileName));
}

export function getEnabledStructureChannels(structure?: StructureControllerData): StructureChannel[] {
  return getValidStructureChannels(structure).filter(isStructureChannelEnabled);
}

export function getStructureChannelCount(structure?: StructureControllerData): number {
  return getValidStructureChannels(structure).length;
}

export function getEnabledStructureChannelCount(structure?: StructureControllerData): number {
  return getEnabledStructureChannels(structure).length;
}

export function isStructureControllerEnabled(structure?: StructureControllerData): boolean {
  return getEnabledStructureChannelCount(structure) > 0;
}

export function getStructurePreviewChannel(structure?: StructureControllerData): StructureChannel | undefined {
  const channels = getValidStructureChannels(structure);
  if (channels.length === 0) return undefined;
  const previewChannel = channels.find((channel) => channel.id === structure?.previewChannelId);
  if (previewChannel) return previewChannel;
  return channels.find((channel) => channel.type === 'beauty') ?? channels[0];
}

export function getEnabledControllerCount(controllers?: ImageNodeControllers): number {
  let count = 0;
  if (isStructureControllerEnabled(controllers?.structure)) count += 1;
  return count;
}

export function replaceStructureChannelImage(
  channels: StructureChannel[],
  channelId: string,
  imageData: StructureChannelImageData,
): StructureChannel[] {
  return channels.map((channel) => (
    channel.id === channelId
      ? {
          ...channel,
          imageUrl: imageData.imageUrl,
          fileName: imageData.fileName,
          mimeType: imageData.mimeType,
          width: imageData.width,
          height: imageData.height,
        }
      : channel
  ));
}

export function mergeDetectedStructureChannelFiles(
  channels: StructureChannel[],
  detectedFiles: DetectedStructureChannelFile[],
): StructureChannel[] {
  const latestFileByType = new Map<StructureChannelType, DetectedStructureChannelFile>();
  detectedFiles.forEach((file) => {
    latestFileByType.set(file.type, file);
  });

  const nextChannels = channels.map((channel) => {
    const detectedFile = latestFileByType.get(channel.type);
    if (!detectedFile) return channel;
    latestFileByType.delete(channel.type);
    return {
      ...channel,
      imageUrl: detectedFile.imageUrl,
      fileName: detectedFile.fileName,
      mimeType: detectedFile.mimeType,
      width: detectedFile.width,
      height: detectedFile.height,
    };
  });

  latestFileByType.forEach((detectedFile, type) => {
    nextChannels.push({
      id: createStructureChannelId(),
      type,
      name: getStructureChannelLabel(type),
      enabled: true,
      imageUrl: detectedFile.imageUrl,
      fileName: detectedFile.fileName,
      mimeType: detectedFile.mimeType,
      width: detectedFile.width,
      height: detectedFile.height,
    });
  });

  return nextChannels;
}

export function addPendingStructureFiles(
  pendingFiles: PendingStructureChannelFile[],
  files: StructureChannelImageData[],
): PendingStructureChannelFile[] {
  return [
    ...pendingFiles,
    ...files.map((file) => ({
      id: createPendingStructureFileId(),
      imageUrl: file.imageUrl,
      fileName: file.fileName,
      mimeType: file.mimeType,
      width: file.width,
      height: file.height,
    })),
  ];
}

export function promotePendingFileToStructureChannel(
  channels: StructureChannel[],
  pendingFiles: PendingStructureChannelFile[],
  pendingFileId: string,
  type: StructureChannelType,
  options?: { replaceExisting?: boolean },
): { channels: StructureChannel[]; pendingFiles: PendingStructureChannelFile[]; promotedChannelId?: string } | null {
  const pendingFile = pendingFiles.find((file) => file.id === pendingFileId);
  if (!pendingFile) return null;

  const existingChannel = channels.find((channel) => channel.type === type);
  if (existingChannel && !options?.replaceExisting) return null;

  const nextPendingFiles = pendingFiles.filter((file) => file.id !== pendingFileId);
  if (existingChannel) {
    return {
      channels: replaceStructureChannelImage(channels, existingChannel.id, pendingFile),
      pendingFiles: nextPendingFiles,
      promotedChannelId: existingChannel.id,
    };
  }

  const nextChannel: StructureChannel = {
    id: createStructureChannelId(),
    type,
    name: getStructureChannelLabel(type),
    enabled: true,
    imageUrl: pendingFile.imageUrl,
    fileName: pendingFile.fileName,
    mimeType: pendingFile.mimeType,
    width: pendingFile.width,
    height: pendingFile.height,
  };

  return {
    channels: [...channels, nextChannel],
    pendingFiles: nextPendingFiles,
    promotedChannelId: nextChannel.id,
  };
}
