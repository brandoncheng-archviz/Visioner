import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { handleImageGenerationApiRequest } from './imageGeneration/apiHandler.js';
import { handleGeneratedImageRequest } from './imageGeneration/resultStore.js';
import { GENERATED_IMAGE_API_PATH } from '../shared/imageGenerationHttp.js';

function toWebRequest(req: IncomingMessage, signal: AbortSignal) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers.host || 'localhost';
  const url = `${protocol}://${host}${req.url || '/'}`;
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
    else if (value !== undefined) headers.set(name, value);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const init: RequestInit & { duplex?: 'half' } = {
    method: req.method,
    headers,
    signal,
  };
  if (hasBody) {
    init.body = Readable.toWeb(req) as ReadableStream<Uint8Array>;
    init.duplex = 'half';
  }
  return new Request(url, init);
}

async function writeWebResponse(response: Response, res: ServerResponse) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  const body = Buffer.from(await response.arrayBuffer());
  res.end(body);
}

export async function handleNodeImageGenerationRequest(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const abortController = new AbortController();
  req.once('aborted', () => abortController.abort());
  res.once('close', () => {
    if (!res.writableEnded) abortController.abort();
  });

  const request = toWebRequest(req, abortController.signal);
  const pathname = new URL(request.url).pathname;
  const response = pathname.startsWith(`${GENERATED_IMAGE_API_PATH}/`)
    ? await handleGeneratedImageRequest(request)
    : await handleImageGenerationApiRequest(request);
  if (!res.destroyed) await writeWebResponse(response, res);
}
