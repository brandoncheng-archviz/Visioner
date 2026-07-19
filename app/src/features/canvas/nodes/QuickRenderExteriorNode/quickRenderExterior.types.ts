import type { ImageRole, LocalReferencePoint, LocalReferenceType } from '../../types/imageNode.types';

export type QuickRenderAtmosphereSource = 'unset' | 'followReference' | 'manual';

export type QuickRenderAtmosphereOption = {
  source: QuickRenderAtmosphereSource;
  value?: string;
};

export type QuickRenderStructureChannelType =
  | 'beauty'
  | 'albedo'
  | 'normal'
  | 'depth'
  | 'ao'
  | 'materialId'
  | 'objectId';

export type QuickRenderConnectedImage = {
  id: string;
  sourceType: 'canvas' | 'upload';
  imageUrl: string;
  sourceNodeId?: string;
  sourceEdgeId?: string;
  fileName?: string;
  width: number;
  height: number;
  label?: string;
  role?: ImageRole | null;
  roleLabel?: string;
  roleColor?: string;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  localReferencePoint?: LocalReferencePoint;
};

export type QuickRenderAtmosphereReference = {
  sourceType: 'upload' | 'canvas';
  imageUrl: string;
  sourceNodeId?: string;
  fileName?: string;
  mimeType?: string;
};

export type QuickRenderStructureChannel = {
  id: string;
  type: QuickRenderStructureChannelType;
  name: string;
  description: string;
  imageUrl: string;
  enabled: boolean;
  weight: number;
  fileName?: string;
  mimeType?: string;
};

export type QuickRenderPendingStructureFile = {
  id: string;
  imageUrl: string;
  fileName: string;
  mimeType?: string;
};

export type QuickRenderExteriorModelParams = {
  model: string;
  aspectRatio: string;
  resolution: string;
  count?: number;
};

export type QuickRenderExteriorNodeData = {
  label?: string;
  title?: string;
  connectedImages?: QuickRenderConnectedImage[];
  onAddQuickRenderInputEdge?: (targetNodeId: string, sourceNodeId: string) => void;
  onRemoveQuickRenderInputEdge?: (targetNodeId: string, sourceNodeId: string, sourceEdgeId?: string) => void;
  onUploadQuickRenderInputImages?: (targetNodeId: string, files: FileList | null) => void;
  atmosphereEnabled?: boolean;
  atmosphere?: {
    time?: QuickRenderAtmosphereOption;
    weather?: QuickRenderAtmosphereOption;
    light?: QuickRenderAtmosphereOption;
    style?: QuickRenderAtmosphereOption;
    addEntourage?: boolean;
    addPeople?: boolean;
    interiorLights?: boolean;
    motionBlur?: boolean;
  };
  /** Deprecated: old quick render nodes may contain this field; current UI ignores it. */
  atmosphereReferenceEnabled?: boolean;
  /** Deprecated: old quick render nodes may contain this field; current UI ignores it. */
  atmosphereReference?: QuickRenderAtmosphereReference | null;
  structureEnabled?: boolean;
  structure?: {
    channels?: QuickRenderStructureChannel[];
    pendingFiles?: QuickRenderPendingStructureFile[];
  };
  prompt?: string;
  modelParams?: QuickRenderExteriorModelParams;
  status?: 'idle' | 'generating' | 'success' | 'error';
  mockResultMessage?: string;
};
