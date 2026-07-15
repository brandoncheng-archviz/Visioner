import type {
  ImageNodeControllers,
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

export function getStructureChannelLabel(type: StructureChannelType): string {
  return STRUCTURE_CHANNEL_LABELS[type];
}

export function createStructureChannelId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `structure-channel-${crypto.randomUUID()}`;
  }
  return `structure-channel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isValidStructureChannel(channel: StructureChannel | undefined): channel is StructureChannel {
  return Boolean(channel?.id && channel.type && channel.imageUrl);
}

export function isStructureChannelEnabled(channel: StructureChannel | undefined): boolean {
  return isValidStructureChannel(channel) && channel.enabled !== false;
}

export function getValidStructureChannels(structure?: StructureControllerData): StructureChannel[] {
  if (!Array.isArray(structure?.channels)) return [];
  return structure.channels.filter(isValidStructureChannel);
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
  if (controllers?.camera?.enabled === true) count += 1;
  return count;
}
