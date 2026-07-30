import type { ImageRole, LocalReferencePoint, LocalReferenceType } from '../../types/imageNode.types';
import type { OutputResolutionTier, OutputSize } from '../../utils/modelParams';

export type ExteriorRenderAtmosphereSource = 'unset' | 'followReference' | 'manual';

export type ExteriorRenderAtmosphereTime = 'sunrise' | 'earlyMorning' | 'noon' | 'afternoon' | 'sunset' | 'night';
export type ExteriorRenderAtmosphereLighting = 'front' | 'back' | 'left' | 'right' | 'softSky';
export type ExteriorRenderAtmosphereWeather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
export type ExteriorRenderAtmosphereStyle = 'photorealistic' | 'nordic' | 'dramaticConcept' | 'luxuryRealEstate' | 'painterly';
export type ExteriorRenderAtmosphereValue =
  | ExteriorRenderAtmosphereTime
  | ExteriorRenderAtmosphereLighting
  | ExteriorRenderAtmosphereWeather
  | ExteriorRenderAtmosphereStyle;

export type ExteriorRenderAtmosphereOption<T extends ExteriorRenderAtmosphereValue = ExteriorRenderAtmosphereValue> = {
  source: ExteriorRenderAtmosphereSource;
  value?: T;
};

export type ExteriorRenderRenderChannelType =
  | 'beauty'
  | 'albedo'
  | 'normal'
  | 'ao'
  | 'depth'
  | 'mask'
  | 'materialId'
  | 'objectId'
  | 'unknown';

export type ExteriorRenderConnectedImage = {
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

export type ExteriorRenderAtmosphereReference = {
  sourceType: 'upload' | 'canvas';
  imageUrl: string;
  sourceNodeId?: string;
  fileName?: string;
  mimeType?: string;
};

export type ExteriorRenderRenderChannel = {
  id: string;
  type: ExteriorRenderRenderChannelType;
  name: string;
  imageUrl: string;
  fileName?: string;
  mimeType?: string;
  sourceType?: 'upload' | 'canvas';
  sourceNodeId?: string;
  width?: number;
  height?: number;
};

export type ExteriorRenderPendingRenderChannelFile = {
  id: string;
  imageUrl: string;
  fileName: string;
  mimeType?: string;
};

export type ExteriorRenderModelParams = {
  model: string;
  aspectRatio: string;
  resolution: string;
  resolutionTier?: OutputResolutionTier;
  requestedSize?: OutputSize;
  count?: number;
};

export type ExteriorRenderRequestInputImage = {
  id: string;
  imageUrl: string;
  usage: {
    key: string;
    label: string;
  };
  width?: number;
  height?: number;
};

export type ExteriorRenderRequestRenderChannel = {
  imageUrl: string;
  fileName?: string;
  width?: number;
  height?: number;
};

export type ExteriorRenderRequest = {
  inputImages: ExteriorRenderRequestInputImage[];
  renderChannels: {
    albedo: ExteriorRenderRequestRenderChannel | null;
    normal: ExteriorRenderRequestRenderChannel | null;
    ao: ExteriorRenderRequestRenderChannel | null;
    depth: ExteriorRenderRequestRenderChannel | null;
  };
  atmosphere: {
    addEntourage: boolean;
    addPeople: boolean;
    interiorLights: boolean;
    motionBlur: boolean;
    time: string | null;
    lighting: string | null;
    weather: string | null;
    style: string | null;
  };
  prompt: string;
  modelParams: {
    model: string;
    aspectRatio: string;
    resolution: string;
    resolutionTier: OutputResolutionTier;
    requestedSize: OutputSize;
    count: number;
  };
};

export type ExteriorRenderValidationError = {
  code: 'INPUT_IMAGE_REQUIRED' | 'INPUT_IMAGE_INVALID';
  field: 'inputImages';
};

export type ExteriorRenderValidationResult = {
  valid: boolean;
  errors: ExteriorRenderValidationError[];
};

export type ExteriorRenderViewState = 'EMPTY' | 'READY' | 'PROCESSING';
export type ExteriorRenderGenerationTaskStatus = 'idle' | 'processing' | 'success' | 'failed';
export type ExteriorRenderErrorCode = 'CANCELLED' | 'GENERATION_FAILED' | 'MISSING_INPUT';

export type ExteriorRenderGenerationTask = {
  taskId: string | null;
  status: ExteriorRenderGenerationTaskStatus;
  errorCode: ExteriorRenderErrorCode | null;
  startedAt: number | null;
  completedAt: number | null;
};

export type ExteriorRenderResultImage = {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
};

export type ExteriorRenderResult = {
  taskId: string;
  status: 'success';
  images: ExteriorRenderResultImage[];
  metadata: {
    model: string;
    aspectRatio: string;
    resolution: string;
  };
};
export type ExteriorRenderNodeData = {
  label?: string;
  title?: string;
  connectedImages?: ExteriorRenderConnectedImage[];
  onAddExteriorRenderInputEdge?: (targetNodeId: string, sourceNodeId: string) => void;
  onRemoveExteriorRenderInputEdge?: (targetNodeId: string, sourceNodeId: string, sourceEdgeId?: string) => void;
  onUploadExteriorRenderInputImages?: (targetNodeId: string, files: FileList | null) => void;
  atmosphereEnabled?: boolean;
  atmosphere?: {
    time?: ExteriorRenderAtmosphereOption<ExteriorRenderAtmosphereTime>;
    weather?: ExteriorRenderAtmosphereOption<ExteriorRenderAtmosphereWeather>;
    light?: ExteriorRenderAtmosphereOption<ExteriorRenderAtmosphereLighting>;
    style?: ExteriorRenderAtmosphereOption<ExteriorRenderAtmosphereStyle>;
    addEntourage?: boolean;
    addPeople?: boolean;
    interiorLights?: boolean;
    motionBlur?: boolean;
  };
  /** Deprecated: old exterior render nodes may contain this field; current UI ignores it. */
  atmosphereReferenceEnabled?: boolean;
  /** Deprecated: old exterior render nodes may contain this field; current UI ignores it. */
  atmosphereReference?: ExteriorRenderAtmosphereReference | null;
  renderChannelsEnabled?: boolean;
  renderChannels?: {
    channels?: ExteriorRenderRenderChannel[];
    pendingFiles?: ExteriorRenderPendingRenderChannelFile[];
  };
  /** Deprecated: read-only compatibility for exterior render nodes saved before renderChannels was introduced. */
  structureEnabled?: boolean;
  /** Deprecated: read-only compatibility for exterior render nodes saved before renderChannels was introduced. */
  structure?: {
    channels?: ExteriorRenderRenderChannel[];
    pendingFiles?: ExteriorRenderPendingRenderChannelFile[];
  };
  prompt?: string;
  modelParams?: ExteriorRenderModelParams;
  generationTask?: ExteriorRenderGenerationTask;
  lastResult?: ExteriorRenderResult;
  onCreateExteriorRenderOutput?: (
    sourceNodeId: string,
    taskId: string,
    request: ExteriorRenderRequest,
  ) => string | null;
  onExteriorRenderResult?: (
    sourceNodeId: string,
    outputNodeId: string,
    request: ExteriorRenderRequest,
    result: ExteriorRenderResult,
  ) => boolean | Promise<boolean>;
  onExteriorRenderOutputFailed?: (
    outputNodeId: string,
    taskId: string,
    errorMessage: string,
  ) => void;
};
