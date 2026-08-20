export const IMAGE_GENERATION_API_PATH = '/api/image-generations';
export const GENERATED_IMAGE_API_PATH = '/api/generated-images';
export const IMAGE_GENERATION_MULTIPART_VERSION = 1 as const;
export const IMAGE_GENERATION_REQUEST_FIELD = 'request';

export const SERVER_GENERATION_ERROR_CODES = [
  'GENERATION_CANCELLED',
  'INVALID_REQUEST',
  'INVALID_REFERENCE',
  'PAYLOAD_TOO_LARGE',
  'TIMEOUT',
  'PROVIDER_UNAVAILABLE',
  'GENERATION_FAILED',
] as const;

export type ServerGenerationErrorCode = typeof SERVER_GENERATION_ERROR_CODES[number];
export type ReferenceSourceKind = 'blob' | 'data' | 'local' | 'http';

export type MultipartReferenceMapping = {
  inputRefIndex: number;
  sourceKind: ReferenceSourceKind;
  fileField?: string;
  url?: string;
};

export type ImageGenerationMultipartManifest<TRequest = unknown> = {
  version: typeof IMAGE_GENERATION_MULTIPART_VERSION;
  request: TRequest;
  references: MultipartReferenceMapping[];
};

export type ImageGenerationApiSuccess<TResult = unknown> = {
  ok: true;
  results: TResult[];
};

export type ImageGenerationApiFailure = {
  ok: false;
  error: {
    code: ServerGenerationErrorCode;
    message: string;
  };
};

export type ImageGenerationApiResponse<TResult = unknown> =
  | ImageGenerationApiSuccess<TResult>
  | ImageGenerationApiFailure;

export function isServerGenerationErrorCode(value: unknown): value is ServerGenerationErrorCode {
  return typeof value === 'string'
    && (SERVER_GENERATION_ERROR_CODES as readonly string[]).includes(value);
}
