import { randomUUID } from 'node:crypto';
import { ServerGenerationError, isAbortError } from '../errors.js';
import type { ServerGenerationResult } from '../orchestrator.js';
import type { GeneratedImageResultStore } from '../resultStore.js';
import { createLocalGeneratedImageResultStore } from '../resultStore.js';
import type { ImageGenerationProvider } from './imageGenerationProvider.js';
import {
  mapOpenAIImageEditPayload,
  mapOpenAIImageGenerationPayload,
  type OpenAIImageEditPayload,
} from './openaiImageMapper.js';

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';

type OpenAIImageResponse = {
  created?: number;
  data?: Array<{ b64_json?: string }>;
};

type OpenAIErrorBody = {
  error?: {
    code?: unknown;
    param?: unknown;
    type?: unknown;
  };
};

export type OpenAIImageProviderLogContext = {
  status?: number;
  requestId?: string | null;
  providerCode?: string;
  providerType?: string;
};

export type OpenAIImageProviderDependencies = {
  apiKey?: () => string | undefined;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
  logger?: (message: string, context: OpenAIImageProviderLogContext) => void;
  resultStore?: GeneratedImageResultStore;
};

function asSafeString(value: unknown) {
  return typeof value === 'string' ? value.slice(0, 120) : undefined;
}

export function mapOpenAIProviderError(
  status: number,
  errorBody: OpenAIErrorBody,
): ServerGenerationError {
  const code = asSafeString(errorBody.error?.code)?.toLowerCase() || '';
  const type = asSafeString(errorBody.error?.type)?.toLowerCase() || '';
  const param = asSafeString(errorBody.error?.param)?.toLowerCase() || '';

  if (status === 408) return new ServerGenerationError('TIMEOUT', 'Image provider request timed out.');
  if (status === 401 || status === 403 || status === 429 || status >= 500) {
    return new ServerGenerationError('PROVIDER_UNAVAILABLE', 'Image provider is unavailable.');
  }
  if (status === 400 || status === 415 || status === 422) {
    if (param.includes('image') || code.includes('image') || type.includes('image')) {
      return new ServerGenerationError('INVALID_REFERENCE', 'The image provider rejected a reference image.');
    }
    return new ServerGenerationError('INVALID_REQUEST', 'The image provider rejected the generation request.');
  }
  return new ServerGenerationError('GENERATION_FAILED', 'Image generation failed.');
}

function buildEditFormData(payload: OpenAIImageEditPayload) {
  const formData = new FormData();
  formData.set('model', payload.model);
  formData.set('prompt', payload.prompt);
  formData.set('n', String(payload.n));
  formData.set('size', payload.size);
  formData.set('output_format', payload.output_format);
  payload.images.forEach((image, index) => {
    const filename = image.filename || `reference-${index + 1}.png`;
    const bytes = Uint8Array.from(image.bytes).buffer;
    formData.append('image[]', new Blob([bytes], { type: image.mimeType }), filename);
  });
  return formData;
}

async function safeErrorBody(response: Response): Promise<OpenAIErrorBody> {
  try {
    const body: unknown = await response.json();
    return typeof body === 'object' && body !== null ? body as OpenAIErrorBody : {};
  } catch {
    return {};
  }
}

function decodeBase64Image(value: string) {
  try {
    const bytes = Buffer.from(value, 'base64');
    if (bytes.byteLength === 0) throw new Error('Empty image');
    return new Uint8Array(bytes);
  } catch (error) {
    throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned invalid image data.', { cause: error });
  }
}

function readPngSize(bytes: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.byteLength < 24 || signature.some((value, index) => bytes[index] !== value)) {
    throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned an invalid PNG image.');
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (width === 0 || height === 0) {
    throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned invalid image dimensions.');
  }
  return { width, height };
}

export function createOpenAIImageProvider({
  apiKey = () => process.env.OPENAI_API_KEY,
  baseUrl = DEFAULT_OPENAI_BASE_URL,
  fetchImplementation = fetch,
  logger = (message, context) => console.error(message, context),
  resultStore = createLocalGeneratedImageResultStore(),
}: OpenAIImageProviderDependencies = {}): ImageGenerationProvider {
  return {
    async generate(request, references, { providerModel, signal }) {
      const key = apiKey()?.trim();
      if (!key) throw new ServerGenerationError('PROVIDER_UNAVAILABLE', 'Image provider is not configured.');

      const generationPayload = mapOpenAIImageGenerationPayload(request, providerModel);
      const isEdit = references.length > 0;
      const editPayload = isEdit
        ? mapOpenAIImageEditPayload(request, references, providerModel)
        : undefined;
      const endpoint = isEdit ? '/images/edits' : '/images/generations';
      const headers: Record<string, string> = { authorization: `Bearer ${key}` };
      let body: string | FormData;
      if (editPayload) {
        body = buildEditFormData(editPayload);
      } else {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(generationPayload);
      }

      let response: Response;
      try {
        response = await fetchImplementation(`${baseUrl.replace(/\/$/, '')}${endpoint}`, {
          method: 'POST',
          headers,
          body,
          signal,
        });
      } catch (error) {
        if (signal.aborted || isAbortError(error)) {
          throw new ServerGenerationError('GENERATION_CANCELLED', 'Image generation was cancelled.', { cause: error });
        }
        logger('OpenAI image request failed', {});
        throw new ServerGenerationError('PROVIDER_UNAVAILABLE', 'Image provider is unavailable.', { cause: error });
      }

      if (!response.ok) {
        const errorBody = await safeErrorBody(response);
        const context = {
          status: response.status,
          requestId: response.headers.get('x-request-id'),
          providerCode: asSafeString(errorBody.error?.code),
          providerType: asSafeString(errorBody.error?.type),
        };
        logger('OpenAI image request rejected', context);
        throw mapOpenAIProviderError(response.status, errorBody);
      }

      let payload: OpenAIImageResponse;
      try {
        payload = await response.json() as OpenAIImageResponse;
      } catch (error) {
        throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned an invalid response.', { cause: error });
      }
      if (!Array.isArray(payload.data) || payload.data.length === 0) {
        throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned no images.');
      }

      return Promise.all(payload.data.map(async (item, index): Promise<ServerGenerationResult> => {
        if (typeof item.b64_json !== 'string') {
          throw new ServerGenerationError('GENERATION_FAILED', 'Image provider returned invalid image data.');
        }
        const imageBytes = decodeBase64Image(item.b64_json);
        const actualSize = readPngSize(imageBytes);
        const stored = await resultStore.save(imageBytes, 'png');
        return {
          taskId: `openai-${payload.created || Date.now()}-${index + 1}-${randomUUID()}`,
          imageUrl: stored.imageUrl,
          width: actualSize.width,
          height: actualSize.height,
          seed: 0,
          metadata: {
            prompt: request.prompt,
            model: request.modelParams.model,
            resolution: request.modelParams.resolution,
          },
        };
      }));
    },
  };
}
