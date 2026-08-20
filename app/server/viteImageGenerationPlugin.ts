import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { GENERATED_IMAGE_API_PATH, IMAGE_GENERATION_API_PATH } from '../shared/imageGenerationHttp.js';
import { handleNodeImageGenerationRequest } from './nodeHttpAdapter.js';

type NextFunction = (error?: unknown) => void;

function isImageGenerationRequest(req: IncomingMessage) {
  if (!req.url) return false;
  const pathname = new URL(req.url, 'http://localhost').pathname;
  return pathname === IMAGE_GENERATION_API_PATH || pathname.startsWith(`${GENERATED_IMAGE_API_PATH}/`);
}

function imageGenerationMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: NextFunction,
) {
  if (!isImageGenerationRequest(req)) {
    next();
    return;
  }
  void handleNodeImageGenerationRequest(req, res).catch(next);
}

export function imageGenerationApiPlugin(): Plugin {
  return {
    name: 'visioner-image-generation-api',
    configureServer(server) {
      server.middlewares.use(imageGenerationMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(imageGenerationMiddleware);
    },
  };
}
