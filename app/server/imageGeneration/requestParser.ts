import {
  IMAGE_GENERATION_MULTIPART_VERSION,
  IMAGE_GENERATION_REQUEST_FIELD,
  type ImageGenerationMultipartManifest,
  type MultipartReferenceMapping,
} from '../../shared/imageGenerationHttp.js';
import { ServerGenerationError } from './errors.js';

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
export const MAX_REFERENCE_FILES = 6;
export const MAX_REFERENCE_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_GENERATION_REQUEST_BYTES = 40 * 1024 * 1024;

export type ParsedImageReference = {
  inputRefIndex: number;
  sourceNodeId: string;
  role: string;
  promptText: string;
  source:
    | {
        kind: 'file';
        field: string;
        mimeType: string;
        filename: string;
        bytes: Uint8Array;
      }
    | {
        kind: 'url';
        url: string;
      };
};

export type ParsedImageGenerationRequest = {
  request: ServerImageGenerationRequest;
  references: ParsedImageReference[];
};

export type ServerImageGenerationRequest = {
  nodeId: string;
  prompt: string;
  userPrompt: string;
  inputRefs: Array<{
    sourceNodeId: string;
    imageUrl: string;
    role: string;
    promptText: string;
  }>;
  modelParams: {
    model: 'gpt-image-2' | 'nano-banana-2' | 'nano-banana-pro';
    aspectRatio: string;
    resolution: string;
    resolutionTier: string;
    requestedSize: { width: number; height: number };
    count: 1 | 2 | 4;
  };
  [key: string]: unknown;
};

type MultipartValue = string | File;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isImageGenerationRequest(value: unknown): value is ServerImageGenerationRequest {
  if (!isRecord(value) || !isRecord(value.modelParams)) return false;
  if (typeof value.nodeId !== 'string' || typeof value.prompt !== 'string' || typeof value.userPrompt !== 'string') return false;
  if (!Array.isArray(value.inputRefs)) return false;
  if (!['gpt-image-2', 'nano-banana-2', 'nano-banana-pro'].includes(String(value.modelParams.model))) return false;
  if (![1, 2, 4].includes(Number(value.modelParams.count))) return false;
  if (!isRecord(value.modelParams.requestedSize)
    || typeof value.modelParams.requestedSize.width !== 'number'
    || typeof value.modelParams.requestedSize.height !== 'number') return false;

  return value.inputRefs.every((reference) => (
    isRecord(reference)
    && typeof reference.sourceNodeId === 'string'
    && typeof reference.imageUrl === 'string'
    && typeof reference.role === 'string'
    && typeof reference.promptText === 'string'
  ));
}

function isReferenceMapping(value: unknown): value is MultipartReferenceMapping {
  return isRecord(value)
    && Number.isInteger(value.inputRefIndex)
    && ['blob', 'data', 'local', 'http'].includes(String(value.sourceKind));
}

function isFileValue(value: MultipartValue): value is File {
  return typeof value !== 'string'
    && typeof value.arrayBuffer === 'function'
    && typeof value.size === 'number'
    && typeof value.type === 'string';
}

function validateHttpReferenceUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Unsupported protocol');
    return url.toString();
  } catch (error) {
    throw new ServerGenerationError('INVALID_REFERENCE', 'Reference URL must use HTTP or HTTPS.', { cause: error });
  }
}

function parseManifest(value: MultipartValue | null) {
  if (typeof value !== 'string') {
    throw new ServerGenerationError('INVALID_REQUEST', 'Missing serialized image generation request.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Serialized request is not valid JSON.', { cause: error });
  }

  if (!isRecord(parsed)
    || parsed.version !== IMAGE_GENERATION_MULTIPART_VERSION
    || !isImageGenerationRequest(parsed.request)
    || !Array.isArray(parsed.references)
    || !parsed.references.every(isReferenceMapping)) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Image generation request shape is invalid.');
  }

  return parsed as ImageGenerationMultipartManifest<ServerImageGenerationRequest>;
}

export async function parseImageGenerationRequest(request: Request): Promise<ParsedImageGenerationRequest> {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data')) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Content-Type must be multipart/form-data.');
  }

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_IMAGE_GENERATION_REQUEST_BYTES) {
    throw new ServerGenerationError('PAYLOAD_TOO_LARGE', 'Image generation payload is too large.');
  }

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_GENERATION_REQUEST_BYTES) {
    throw new ServerGenerationError('PAYLOAD_TOO_LARGE', 'Image generation payload is too large.');
  }

  const parseRequest = new Request(request.url, {
    method: 'POST',
    headers: request.headers,
    body,
  });
  let formData: FormData;
  try {
    formData = await parseRequest.formData();
  } catch (error) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Multipart payload could not be parsed.', { cause: error });
  }

  const manifest = parseManifest(formData.get(IMAGE_GENERATION_REQUEST_FIELD));
  const { inputRefs } = manifest.request;
  if (inputRefs.length > MAX_REFERENCE_FILES || manifest.references.length > MAX_REFERENCE_FILES) {
    throw new ServerGenerationError('INVALID_REFERENCE', 'Too many image references.');
  }
  if (manifest.references.length !== inputRefs.length) {
    throw new ServerGenerationError('INVALID_REFERENCE', 'Every image reference requires one mapping.');
  }

  const mappingByIndex = new Map<number, MultipartReferenceMapping>();
  for (const mapping of manifest.references) {
    if (mapping.inputRefIndex < 0
      || mapping.inputRefIndex >= inputRefs.length
      || mappingByIndex.has(mapping.inputRefIndex)) {
      throw new ServerGenerationError('INVALID_REFERENCE', 'Reference mapping index is invalid or duplicated.');
    }
    mappingByIndex.set(mapping.inputRefIndex, mapping);
  }

  const declaredFileFields = new Set(
    manifest.references.flatMap((mapping) => mapping.fileField ? [mapping.fileField] : []),
  );
  for (const [field, value] of formData.entries()) {
    if (field === IMAGE_GENERATION_REQUEST_FIELD) continue;
    if (!declaredFileFields.has(field) || !isFileValue(value)) {
      throw new ServerGenerationError('INVALID_REFERENCE', 'Multipart payload contains an unknown file field.');
    }
  }

  const references: ParsedImageReference[] = [];
  for (let index = 0; index < inputRefs.length; index += 1) {
    const reference = inputRefs[index];
    const mapping = mappingByIndex.get(index);
    if (!mapping) throw new ServerGenerationError('INVALID_REFERENCE', 'Reference mapping is missing.');

    if (mapping.sourceKind === 'http') {
      if (!mapping.url || reference.imageUrl !== mapping.url) {
        throw new ServerGenerationError('INVALID_REFERENCE', 'HTTP reference metadata does not match the request.');
      }
      references.push({
        inputRefIndex: index,
        sourceNodeId: reference.sourceNodeId,
        role: reference.role,
        promptText: reference.promptText,
        source: { kind: 'url', url: validateHttpReferenceUrl(mapping.url) },
      });
      continue;
    }

    const expectedField = `reference_${index}`;
    if (mapping.fileField !== expectedField || reference.imageUrl !== `multipart://${expectedField}`) {
      throw new ServerGenerationError('INVALID_REFERENCE', 'File reference mapping does not match the request.');
    }
    const file = formData.get(expectedField);
    if (!file || !isFileValue(file)) {
      throw new ServerGenerationError('INVALID_REFERENCE', 'Reference file is missing.');
    }
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
      throw new ServerGenerationError('INVALID_REFERENCE', 'Reference MIME type is not allowed.');
    }
    if (file.size > MAX_REFERENCE_FILE_BYTES) {
      throw new ServerGenerationError('PAYLOAD_TOO_LARGE', 'Reference file is too large.');
    }

    references.push({
      inputRefIndex: index,
      sourceNodeId: reference.sourceNodeId,
      role: reference.role,
      promptText: reference.promptText,
      source: {
        kind: 'file',
        field: expectedField,
        mimeType: file.type.toLowerCase(),
        filename: file.name,
        bytes: new Uint8Array(await file.arrayBuffer()),
      },
    });
  }

  return { request: manifest.request, references };
}
