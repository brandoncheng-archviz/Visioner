import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { GENERATED_IMAGE_API_PATH } from '../../shared/imageGenerationHttp.js';
import { ServerGenerationError } from './errors.js';

export type StoredGeneratedImage = {
  imageUrl: string;
};

export interface GeneratedImageResultStore {
  save(bytes: Uint8Array, extension: 'png'): Promise<StoredGeneratedImage>;
}

export const DEFAULT_GENERATED_IMAGE_DIRECTORY = path.resolve(process.cwd(), '.visioner/generated-images');

export function createLocalGeneratedImageResultStore(
  directory = process.env.IMAGE_GENERATION_OUTPUT_DIR || DEFAULT_GENERATED_IMAGE_DIRECTORY,
): GeneratedImageResultStore {
  return {
    async save(bytes, extension) {
      await mkdir(directory, { recursive: true });
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(path.join(directory, filename), bytes, { mode: 0o600 });
      return { imageUrl: `${GENERATED_IMAGE_API_PATH}/${filename}` };
    },
  };
}

const SAFE_GENERATED_IMAGE_NAME = /^[0-9a-f-]+\.png$/i;

export async function handleGeneratedImageRequest(
  request: Request,
  directory = process.env.IMAGE_GENERATION_OUTPUT_DIR || DEFAULT_GENERATED_IMAGE_DIRECTORY,
) {
  const pathname = new URL(request.url).pathname;
  const prefix = `${GENERATED_IMAGE_API_PATH}/`;
  const filename = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  if (request.method !== 'GET' || !SAFE_GENERATED_IMAGE_NAME.test(filename)) {
    return new Response('Not found', { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(directory, filename));
    return new Response(bytes, {
      status: 200,
      headers: {
        'cache-control': 'public, max-age=31536000, immutable',
        'content-type': 'image/png',
      },
    });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return new Response('Not found', { status: 404 });
    }
    throw new ServerGenerationError('GENERATION_FAILED', 'Generated image could not be read.', { cause: error });
  }
}
