import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, type ServerResponse } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED_IMAGE_API_PATH, IMAGE_GENERATION_API_PATH } from '../shared/imageGenerationHttp.js';
import { handleNodeImageGenerationRequest } from './nodeHttpAdapter.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const distDirectory = path.resolve(currentDirectory, '../../dist');
const port = Number.parseInt(process.env.PORT || '3000', 10);

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function sendFile(filePath: string, res: ServerResponse) {
  res.statusCode = 200;
  res.setHeader('content-type', CONTENT_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  createReadStream(filePath).pipe(res);
}

async function serveApplication(pathname: string, res: ServerResponse) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const candidate = path.resolve(distDirectory, `.${requestedPath}`);
  if (candidate.startsWith(`${distDirectory}${path.sep}`)) {
    try {
      const details = await stat(candidate);
      if (details.isFile()) {
        sendFile(candidate, res);
        return;
      }
    } catch {
      // SPA routes fall through to index.html.
    }
  }
  sendFile(path.join(distDirectory, 'index.html'), res);
}

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;
    if (pathname === IMAGE_GENERATION_API_PATH || pathname.startsWith(`${GENERATED_IMAGE_API_PATH}/`)) {
      await handleNodeImageGenerationRequest(req, res);
      return;
    }
    await serveApplication(pathname, res);
  } catch {
    if (!res.headersSent) res.statusCode = 500;
    res.end('Internal Server Error');
  }
});

server.listen(port, () => {
  process.stdout.write(`Visioner server listening on http://localhost:${port}\n`);
});
