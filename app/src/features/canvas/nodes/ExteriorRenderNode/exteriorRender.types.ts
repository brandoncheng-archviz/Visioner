import type { ImageRole, LocalReferencePoint, LocalReferenceType } from '../../types/imageNode.types';

export type QuickRenderAtmosphereSource = 'unset' | 'followReference' | 'manual';

export type QuickRenderAtmosphereTime = 'sunrise' | 'earlyMorning' | 'noon' | 'afternoon' | 'sunset' | 'night';
export type QuickRenderAtmosphereLighting = 'front' | 'back' | 'left' | 'right' | 'softSky';
export type QuickRenderAtmosphereWeather = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'foggy';
export type QuickRenderAtmosphereStyle = 'photorealistic' | 'nordic' | 'dramaticConcept' | 'luxuryRealEstate' | 'painterly';
export type QuickRenderAtmosphereValue =
  | QuickRenderAtmosphereTime
  | QuickRenderAtmosphereLighting
  | QuickRenderAtmosphereWeather
  | QuickRenderAtmosphereStyle;

export type QuickRenderAtmosphereOption<T extends QuickRenderAtmosphereValue = QuickRenderAtmosphereValue> = {
  source: QuickRenderAtmosphereSource;
  value?: T;
};

export type QuickRenderRenderChannelType =
  | 'beauty'
  | 'albedo'
  | 'normal'
  | 'ao'
  | 'depth'
  | 'mask'
  | 'materialId'
  | 'objectId'
  | 'unknown';

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

export type QuickRenderRenderChannel = {
  id: string;
  type: QuickRenderRenderChannelType;
  name: string;
  imageUrl: string;
  fileName?: string;
  mimeType?: string;
  sourceType?: 'upload' | 'canvas';
  sourceNodeId?: string;
  width?: number;
  height?: number;
};

export type QuickRenderPendingRenderChannelFile = {
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

export type QuickRenderRequestInputImage = {
  id: string;
  imageUrl: string;
  usage: {
    key: string;
    label: string;
  };
  width?: number;
  height?: number;
};

export type QuickRenderRequestRenderChannel = {
  imageUrl: string;
  fileName?: string;
  width?: number;
  height?: number;
};

export type QuickRenderRequest = {
  inputImages: QuickRenderRequestInputImage[];
  renderChannels: {
    albedo: QuickRenderRequestRenderChannel | null;
    normal: QuickRenderRequestRenderChannel | null;
    ao: QuickRenderRequestRenderChannel | null;
    depth: QuickRenderRequestRenderChannel | null;
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
    count: number;
  };
};

export type QuickRenderValidationError = {
  code: 'INPUT_IMAGE_REQUIRED' | 'INPUT_IMAGE_INVALID';
  field: 'inputImages';
};

export type QuickRenderValidationResult = {
  valid: boolean;
  errors: QuickRenderValidationError[];
};

export type QuickRenderViewState = 'EMPTY' | 'READY' | 'PROCESSING';
export type QuickRenderGenerationTaskStatus = 'idle' | 'processing' | 'success' | 'failed';
export type QuickRenderErrorCode = 'CANCELLED' | 'GENERATION_FAILED' | 'MISSING_INPUT';

export type QuickRenderGenerationTask = {
  taskId: string | null;
  status: QuickRenderGenerationTaskStatus;
  errorCode: QuickRenderErrorCode | null;
  startedAt: number | null;
  completedAt: number | null;
};

export type QuickRenderResultImage = {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
};

export type QuickRenderResult = {
  taskId: string;
  status: 'success';
  images: QuickRenderResultImage[];
  metadata: {
    model: string;
    aspectRatio: string;
    resolution: string;
  };
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
    time?: QuickRenderAtmosphereOption<QuickRenderAtmosphereTime>;
    weather?: QuickRenderAtmosphereOption<QuickRenderAtmosphereWeather>;
    light?: QuickRenderAtmosphereOption<QuickRenderAtmosphereLighting>;
    style?: QuickRenderAtmosphereOption<QuickRenderAtmosphereStyle>;
    addEntourage?: boolean;
    addPeople?: boolean;
    interiorLights?: boolean;
    motionBlur?: boolean;
  };
  /** Deprecated: old quick render nodes may contain this field; current UI ignores it. */
  atmosphereReferenceEnabled?: boolean;
  /** Deprecated: old quick render nodes may contain this field; current UI ignores it. */
  atmosphereReference?: QuickRenderAtmosphereReference | null;
  renderChannelsEnabled?: boolean;
  renderChannels?: {
    channels?: QuickRenderRenderChannel[];
    pendingFiles?: QuickRenderPendingRenderChannelFile[];
  };
  /** Deprecated: read-only compatibility for quick render nodes saved before renderChannels was introduced. */
  structureEnabled?: boolean;
  /** Deprecated: read-only compatibility for quick render nodes saved before renderChannels was introduced. */
  structure?: {
    channels?: QuickRenderRenderChannel[];
    pendingFiles?: QuickRenderPendingRenderChannelFile[];
  };
  prompt?: string;
  modelParams?: QuickRenderExteriorModelParams;
  generationTask?: QuickRenderGenerationTask;
  lastResult?: QuickRenderResult;
  onCreateQuickRenderOutput?: (
    sourceNodeId: string,
    taskId: string,
    request: QuickRenderRequest,
  ) => string | null;
  onQuickRenderResult?: (
    sourceNodeId: string,
    outputNodeId: string,
    request: QuickRenderRequest,
    result: QuickRenderResult,
  ) => boolean | Promise<boolean>;
  onQuickRenderOutputFailed?: (
    outputNodeId: string,
    taskId: string,
    errorMessage: string,
  ) => void;
};
