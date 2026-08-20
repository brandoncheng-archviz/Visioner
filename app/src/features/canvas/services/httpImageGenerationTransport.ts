import {
  IMAGE_GENERATION_API_PATH,
  IMAGE_GENERATION_MULTIPART_VERSION,
  IMAGE_GENERATION_REQUEST_FIELD,
  isServerGenerationErrorCode,
  type ImageGenerationApiResponse,
  type ImageGenerationMultipartManifest,
  type MultipartReferenceMapping,
  type ReferenceSourceKind,
  type ServerGenerationErrorCode,
} from '../../../../shared/imageGenerationHttp';
import type { GenerationResult, ImageGenerationErrorCode, ImageGenerationRequest } from '../types/generation.types';
import {
  ImageGenerationServiceError,
  type ImageGenerationTransport,
} from './imageGenerationTransport';

const SERVER_ERROR_TO_GENERATION_ERROR: Record<ServerGenerationErrorCode, ImageGenerationErrorCode> = {
  GENERATION_CANCELLED: 'cancelled',
  INVALID_REQUEST: 'invalidInput',
  INVALID_REFERENCE: 'invalidInput',
  PAYLOAD_TOO_LARGE: 'invalidInput',
  TIMEOUT: 'timeout',
  PROVIDER_UNAVAILABLE: 'serviceUnavailable',
  GENERATION_FAILED: 'serviceUnavailable',
};

type FetchImplementation = typeof fetch;

export type HttpImageGenerationTransportOptions = {
  endpoint?: string;
  fetchImplementation?: FetchImplementation;
  referenceFetchImplementation?: FetchImplementation;
};

function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}

function classifyReferenceUrl(imageUrl: string): ReferenceSourceKind {
  if (imageUrl.startsWith('blob:')) return 'blob';
  if (imageUrl.startsWith('data:')) return 'data';

  try {
    const url = new URL(imageUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') return 'http';
    throw new ImageGenerationServiceError('invalidInput');
  } catch (error) {
    if (error instanceof ImageGenerationServiceError) throw error;
    if (imageUrl.startsWith('/') || imageUrl.startsWith('./') || imageUrl.startsWith('../')) return 'local';
    throw new ImageGenerationServiceError('invalidInput', { cause: error });
  }
}

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'png';
}

async function resolveReferenceBlob(
  imageUrl: string,
  fetchImplementation: FetchImplementation,
  signal?: AbortSignal,
) {
  const response = await fetchImplementation(imageUrl, { signal });
  if (!response.ok) throw new ImageGenerationServiceError('invalidInput');
  return response.blob();
}

export function mapServerGenerationError(code: ServerGenerationErrorCode): ImageGenerationErrorCode {
  return SERVER_ERROR_TO_GENERATION_ERROR[code];
}

export function createHttpImageGenerationTransport({
  endpoint = IMAGE_GENERATION_API_PATH,
  fetchImplementation = globalThis.fetch,
  referenceFetchImplementation = globalThis.fetch,
}: HttpImageGenerationTransportOptions = {}): ImageGenerationTransport {
  return {
    async generate(request, options) {
      try {
        options?.onProgress?.(5);
        const formData = new FormData();
        const mappings: MultipartReferenceMapping[] = [];
        const wireInputRefs = [] as ImageGenerationRequest['inputRefs'];

        for (let index = 0; index < request.inputRefs.length; index += 1) {
          const reference = request.inputRefs[index];
          const sourceKind = classifyReferenceUrl(reference.imageUrl);

          if (sourceKind === 'http') {
            mappings.push({ inputRefIndex: index, sourceKind, url: reference.imageUrl });
            wireInputRefs.push({ ...reference });
            continue;
          }

          const fileField = `reference_${index}`;
          const blob = await resolveReferenceBlob(
            reference.imageUrl,
            referenceFetchImplementation,
            options?.signal,
          );
          const filename = `${fileField}.${extensionForMimeType(blob.type)}`;
          formData.append(fileField, blob, filename);
          mappings.push({ inputRefIndex: index, sourceKind, fileField });
          wireInputRefs.push({ ...reference, imageUrl: `multipart://${fileField}` });
        }

        const wireRequest: ImageGenerationRequest = {
          ...request,
          inputRefs: wireInputRefs,
        };
        const manifest: ImageGenerationMultipartManifest<ImageGenerationRequest> = {
          version: IMAGE_GENERATION_MULTIPART_VERSION,
          request: wireRequest,
          references: mappings,
        };
        formData.set(IMAGE_GENERATION_REQUEST_FIELD, JSON.stringify(manifest));
        options?.onProgress?.(25);

        const response = await fetchImplementation(endpoint, {
          method: 'POST',
          body: formData,
          signal: options?.signal,
        });
        options?.onProgress?.(90);

        const payload = await response.json() as ImageGenerationApiResponse<GenerationResult>;
        if (!payload || typeof payload !== 'object' || typeof payload.ok !== 'boolean') {
          throw new ImageGenerationServiceError('serviceUnavailable');
        }
        if (!payload.ok) {
          if (!isServerGenerationErrorCode(payload.error?.code)) {
            throw new ImageGenerationServiceError('serviceUnavailable');
          }
          throw new ImageGenerationServiceError(mapServerGenerationError(payload.error.code));
        }
        if (!Array.isArray(payload.results)) {
          throw new ImageGenerationServiceError('serviceUnavailable');
        }

        options?.onProgress?.(100);
        return payload.results;
      } catch (error) {
        if (error instanceof ImageGenerationServiceError) throw error;
        if (options?.signal?.aborted || isAbortError(error)) {
          throw new ImageGenerationServiceError('cancelled', { cause: error });
        }
        throw new ImageGenerationServiceError('serviceUnavailable', { cause: error });
      }
    },
  };
}
