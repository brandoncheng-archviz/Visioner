export type StructureChannelType =
  | 'beauty'
  | 'albedo'
  | 'normal'
  | 'depth'
  | 'ao'
  | 'materialId'
  | 'objectId';

export interface StructureChannel {
  id: string;
  type: StructureChannelType;
  name: string;
  imageUrl: string;
  enabled?: boolean;
  fileName?: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface PendingStructureChannelFile {
  id: string;
  imageUrl: string;
  fileName: string;
  mimeType?: string;
  width?: number;
  height?: number;
}

export interface StructureControllerData {
  channels?: StructureChannel[];
  previewChannelId?: string;
  pendingFiles?: PendingStructureChannelFile[];
  /** @deprecated retained for old placeholder node-data compatibility. */
  enabled?: boolean;
}

export interface ImageNodeControllers {
  structure?: StructureControllerData;
  camera?: {
    enabled?: boolean;
  };
}
