import type { ServerGenerationErrorCode } from '../../shared/imageGenerationHttp.js';

export class ServerGenerationError extends Error {
  readonly code: ServerGenerationErrorCode;

  constructor(code: ServerGenerationErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ServerGenerationError';
    this.code = code;
  }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : error instanceof Error && error.name === 'AbortError';
}
