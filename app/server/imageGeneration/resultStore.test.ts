import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createLocalGeneratedImageResultStore, handleGeneratedImageRequest } from './resultStore.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('generated image result store', () => {
  it('stores provider bytes server-side and serves a stable image URL', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'visioner-generated-'));
    temporaryDirectories.push(directory);
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const store = createLocalGeneratedImageResultStore(directory);
    const stored = await store.save(bytes, 'png');

    expect(stored.imageUrl).toMatch(/^\/api\/generated-images\/[0-9a-f-]+\.png$/);
    const response = await handleGeneratedImageRequest(
      new Request(`http://localhost${stored.imageUrl}`),
      directory,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
  });

  it('does not allow generated image paths outside the result directory', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'visioner-generated-'));
    temporaryDirectories.push(directory);
    const response = await handleGeneratedImageRequest(
      new Request('http://localhost/api/generated-images/../secret.png'),
      directory,
    );
    expect(response.status).toBe(404);
  });
});
