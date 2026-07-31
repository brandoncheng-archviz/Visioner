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

export type CameraHeight = 'low' | 'eyeLevel' | 'slightlyHigh' | 'high' | 'birdsEye';
export type CameraLens = 'ultraWide' | 'wide' | 'standard' | 'telephoto';
export type CameraPerspective = 'onePoint' | 'twoPoint' | 'threePointUp' | 'threePointDown';
export type CameraDepthOfField = 'allSharp' | 'subtle' | 'pronounced';

export interface CameraControllerData {
  enabled?: boolean;
  height?: CameraHeight;
  lens?: CameraLens;
  perspective?: CameraPerspective;
  depthOfField?: CameraDepthOfField;
  preserveOriginalCameraFeatures?: boolean;
}

export interface ImageNodeControllers {
  structure?: StructureControllerData;
  camera?: CameraControllerData;
}
