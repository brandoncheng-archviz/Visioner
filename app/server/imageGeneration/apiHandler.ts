import {
  IMAGE_GENERATION_API_PATH,
  type ImageGenerationApiFailure,
  type ImageGenerationApiSuccess,
  type ServerGenerationErrorCode,
} from '../../shared/imageGenerationHttp.js';
import { isAbortError, ServerGenerationError } from './errors.js';
import {
  createConfiguredImageGenerationOrchestrator,
  type ImageGenerationOrchestrator,
  type ServerGenerationResult,
} from './orchestrator.js';
import { parseImageGenerationRequest } from './requestParser.js';

const DEFAULT_GENERATION_TIMEOUT_MS = 150_000;

const ERROR_STATUS: Record<ServerGenerationErrorCode, number> = {
  GENERATION_CANCELLED: 499,
  INVALID_REQUEST: 400,
  INVALID_REFERENCE: 400,
  PAYLOAD_TOO_LARGE: 413,
  TIMEOUT: 504,
  PROVIDER_UNAVAILABLE: 503,
  GENERATION_FAILED: 500,
};

export type ImageGenerationApiDependencies = {
  orchestrator?: ImageGenerationOrchestrator;
  timeoutMs?: number;
};

function jsonResponse(payload: ImageGenerationApiSuccess<ServerGenerationResult> | ImageGenerationApiFailure, status: number) {
  return Response.json(payload, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function errorResponse(error: ServerGenerationError) {
  return jsonResponse({
    ok: false,
    error: { code: error.code, message: error.message },
  }, ERROR_STATUS[error.code]);
}

export async function handleImageGenerationApiRequest(
  request: Request,
  {
    orchestrator,
    timeoutMs = DEFAULT_GENERATION_TIMEOUT_MS,
  }: ImageGenerationApiDependencies = {},
) {
  const url = new URL(request.url);
  if (url.pathname !== IMAGE_GENERATION_API_PATH) {
    return jsonResponse({ ok: false, error: { code: 'INVALID_REQUEST', message: 'Route not found.' } }, 404);
  }
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: { code: 'INVALID_REQUEST', message: 'Method not allowed.' } }, 405);
  }

  const operationAbortController = new AbortController();
  let didTimeout = false;
  const cancelFromClient = () => operationAbortController.abort();
  request.signal.addEventListener('abort', cancelFromClient, { once: true });
  const timeout = setTimeout(() => {
    didTimeout = true;
    operationAbortController.abort();
  }, timeoutMs);

  try {
    const parsedRequest = await parseImageGenerationRequest(request);
    if (operationAbortController.signal.aborted) {
      throw new ServerGenerationError('GENERATION_CANCELLED', 'Image generation was cancelled.');
    }
    const selectedOrchestrator = orchestrator || createConfiguredImageGenerationOrchestrator();
    const results = await selectedOrchestrator.generate(parsedRequest, operationAbortController.signal);
    return jsonResponse({ ok: true, results }, 200);
  } catch (error) {
    if (didTimeout) return errorResponse(new ServerGenerationError('TIMEOUT', 'Image generation timed out.'));
    if (request.signal.aborted || isAbortError(error)) {
      return errorResponse(new ServerGenerationError('GENERATION_CANCELLED', 'Image generation was cancelled.'));
    }
    if (error instanceof ServerGenerationError) return errorResponse(error);
    return errorResponse(new ServerGenerationError('GENERATION_FAILED', 'Image generation failed.', { cause: error }));
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener('abort', cancelFromClient);
  }
}
