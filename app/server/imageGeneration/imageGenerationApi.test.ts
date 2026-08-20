import { describe, expect, it, vi } from 'vitest';
import { createServer } from 'node:http';
import {
  IMAGE_GENERATION_API_PATH,
  IMAGE_GENERATION_MULTIPART_VERSION,
  IMAGE_GENERATION_REQUEST_FIELD,
  type ImageGenerationMultipartManifest,
} from '../../shared/imageGenerationHttp.js';
import { handleImageGenerationApiRequest } from './apiHandler.js';
import {
  createProviderImageGenerationOrchestrator,
  type ImageGenerationOrchestrator,
  type ServerGenerationResult,
} from './orchestrator.js';
import { createImageGenerationModelRegistry } from './modelRegistry.js';
import type { ImageGenerationProvider } from './providers/imageGenerationProvider.js';
import { createHttpImageGenerationTransport } from '../../src/features/canvas/services/httpImageGenerationTransport.js';
import { handleNodeImageGenerationRequest } from '../nodeHttpAdapter.js';
import {
  MAX_IMAGE_GENERATION_REQUEST_BYTES,
  parseImageGenerationRequest,
  type ServerImageGenerationRequest,
} from './requestParser.js';

const request: ServerImageGenerationRequest = {
  nodeId: 'image-node-1',
  prompt: 'final prompt',
  userPrompt: 'user prompt',
  inputRefs: [],
  modelParams: {
    model: 'nano-banana-2',
    aspectRatio: '16:9',
    resolution: '2K',
    resolutionTier: '2K',
    requestedSize: { width: 2048, height: 1152 },
    count: 1,
  },
};

const result: ServerGenerationResult = {
  taskId: 'server-result-1',
  imageUrl: '/assets/mock/generation-results/show-cover-1.jpg',
  width: 2048,
  height: 1152,
  seed: 7,
  metadata: { prompt: 'final prompt', model: 'nano-banana-2', resolution: '2K' },
};

function createMultipartRequest(
  manifest: ImageGenerationMultipartManifest<ServerImageGenerationRequest>,
  files: Array<{ field: string; blob: Blob }> = [],
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.set(IMAGE_GENERATION_REQUEST_FIELD, JSON.stringify(manifest));
  files.forEach(({ field, blob }) => formData.set(field, blob, `${field}.png`));
  return new Request(`http://localhost${IMAGE_GENERATION_API_PATH}`, {
    method: 'POST',
    body: formData,
    signal,
  });
}

describe('image generation server', () => {
  it('parses a request without references', async () => {
    const parsed = await parseImageGenerationRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request,
      references: [],
    }));

    expect(parsed).toEqual({ request, references: [] });
  });

  it('restores multiple references in original order without losing metadata', async () => {
    const requestWithReferences: ServerImageGenerationRequest = {
      ...request,
      inputRefs: [
        { sourceNodeId: 'building', imageUrl: 'multipart://reference_0', role: 'primary_building', promptText: 'preserve building' },
        { sourceNodeId: 'sky', imageUrl: 'https://cdn.example.com/sky.jpg', role: 'atmosphere_reference', promptText: 'follow sky' },
      ],
    };
    const parsed = await parseImageGenerationRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request: requestWithReferences,
      references: [
        { inputRefIndex: 0, sourceKind: 'blob', fileField: 'reference_0' },
        { inputRefIndex: 1, sourceKind: 'http', url: 'https://cdn.example.com/sky.jpg' },
      ],
    }, [{ field: 'reference_0', blob: new Blob(['png'], { type: 'image/png' }) }]));

    expect(parsed.references.map(({ inputRefIndex, sourceNodeId, role, promptText, source }) => ({
      inputRefIndex,
      sourceNodeId,
      role,
      promptText,
      kind: source.kind,
    }))).toEqual([
      { inputRefIndex: 0, sourceNodeId: 'building', role: 'primary_building', promptText: 'preserve building', kind: 'file' },
      { inputRefIndex: 1, sourceNodeId: 'sky', role: 'atmosphere_reference', promptText: 'follow sky', kind: 'url' },
    ]);
  });

  it('rejects invalid MIME types and oversized declared payloads', async () => {
    const fileRequest: ServerImageGenerationRequest = {
      ...request,
      inputRefs: [{ sourceNodeId: 'bad', imageUrl: 'multipart://reference_0', role: 'custom_reference', promptText: '' }],
    };
    await expect(parseImageGenerationRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request: fileRequest,
      references: [{ inputRefIndex: 0, sourceKind: 'blob', fileField: 'reference_0' }],
    }, [{ field: 'reference_0', blob: new Blob(['text'], { type: 'text/plain' }) }])))
      .rejects.toMatchObject({ code: 'INVALID_REFERENCE' });

    const oversizedRequest = new Request(`http://localhost${IMAGE_GENERATION_API_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'multipart/form-data; boundary=test',
        'content-length': String(MAX_IMAGE_GENERATION_REQUEST_BYTES + 1),
      },
      body: '--test--',
    });
    await expect(parseImageGenerationRequest(oversizedRequest))
      .rejects.toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });

  it('rejects non-HTTP remote reference protocols', async () => {
    const invalidUrlRequest: ServerImageGenerationRequest = {
      ...request,
      inputRefs: [{ sourceNodeId: 'bad', imageUrl: 'file:///etc/passwd', role: 'custom_reference', promptText: '' }],
    };
    await expect(parseImageGenerationRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request: invalidUrlRequest,
      references: [{ inputRefIndex: 0, sourceKind: 'http', url: 'file:///etc/passwd' }],
    }))).rejects.toMatchObject({ code: 'INVALID_REFERENCE' });
  });

  it('returns GenerationResult arrays through the endpoint', async () => {
    const generate = vi.fn(async (parsed) => {
      expect(parsed.request).toEqual(request);
      return [result];
    });
    const orchestrator: ImageGenerationOrchestrator = { generate };
    const response = await handleImageGenerationApiRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request,
      references: [],
    }), { orchestrator });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, results: [result] });
  });

  it('returns provider results through the real endpoint contract', async () => {
    const providerResult: ServerGenerationResult = {
      ...result,
      taskId: 'openai-result-1',
      imageUrl: '/api/generated-images/provider-result.png',
      metadata: { ...result.metadata, model: 'gpt-image-2' },
    };
    const provider: ImageGenerationProvider = { generate: vi.fn(async () => [providerResult]) };
    const orchestrator = createProviderImageGenerationOrchestrator(
      createImageGenerationModelRegistry({ openAIProvider: provider }),
    );
    const providerRequest: ServerImageGenerationRequest = {
      ...request,
      modelParams: { ...request.modelParams, model: 'gpt-image-2' },
    };
    const response = await handleImageGenerationApiRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request: providerRequest,
      references: [],
    }), { orchestrator });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, results: [providerResult] });
  });

  it('round-trips a blob reference through HTTP transport, multipart parser and endpoint', async () => {
    const generate = vi.fn(async (parsed) => {
      expect(parsed.references).toHaveLength(1);
      expect(parsed.references[0]).toMatchObject({
        inputRefIndex: 0,
        sourceNodeId: 'source-blob',
        role: 'primary_building',
        promptText: 'preserve geometry',
        source: { kind: 'file', field: 'reference_0', mimeType: 'image/png' },
      });
      return [result];
    });
    const orchestrator: ImageGenerationOrchestrator = { generate };
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const endpointRequest = new Request(`http://localhost${IMAGE_GENERATION_API_PATH}`, {
        method: 'POST',
        body: init?.body,
        signal: init?.signal,
      });
      return handleImageGenerationApiRequest(endpointRequest, { orchestrator });
    }) as typeof fetch;
    const referenceFetchImplementation = vi.fn(async () => new Response(
      new Blob(['png'], { type: 'image/png' }),
    )) as typeof fetch;
    const transport = createHttpImageGenerationTransport({
      fetchImplementation,
      referenceFetchImplementation,
    });

    await expect(transport.generate({
      ...request,
      inputRefs: [{
        sourceNodeId: 'source-blob',
        imageUrl: 'blob:browser-only',
        role: 'primary_building',
        promptText: 'preserve geometry',
      }],
    })).resolves.toEqual([result]);
  });

  it('serves POST /api/image-generations through the real Node HTTP adapter', async () => {
    const server = createServer((incoming, outgoing) => {
      void handleNodeImageGenerationRequest(incoming, outgoing);
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Expected TCP server address');
      const response = await fetch(`http://127.0.0.1:${address.port}${IMAGE_GENERATION_API_PATH}`, {
        method: 'POST',
        body: (() => {
          const formData = new FormData();
          formData.set(IMAGE_GENERATION_REQUEST_FIELD, JSON.stringify({
            version: IMAGE_GENERATION_MULTIPART_VERSION,
            request,
            references: [],
          }));
          return formData;
        })(),
      });
      const payload = await response.json() as { ok: boolean; results: ServerGenerationResult[] };

      expect(response.status).toBe(200);
      expect(payload.ok).toBe(true);
      expect(payload.results).toHaveLength(1);
      expect(payload.results[0]?.metadata).toMatchObject({
        prompt: request.prompt,
        model: request.modelParams.model,
      });
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it('returns stable errors and propagates client cancellation to the orchestrator', async () => {
    const invalidResponse = await handleImageGenerationApiRequest(new Request(
      `http://localhost${IMAGE_GENERATION_API_PATH}`,
      { method: 'POST', body: '{}' },
    ));
    await expect(invalidResponse.json()).resolves.toEqual({
      ok: false,
      error: { code: 'INVALID_REQUEST', message: 'Content-Type must be multipart/form-data.' },
    });

    const controller = new AbortController();
    const orchestrator: ImageGenerationOrchestrator = {
      generate: vi.fn((_parsed, signal) => new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      })),
    };
    const generation = handleImageGenerationApiRequest(createMultipartRequest({
      version: IMAGE_GENERATION_MULTIPART_VERSION,
      request,
      references: [],
    }, [], controller.signal), { orchestrator });
    await Promise.resolve();
    controller.abort();
    const cancelledResponse = await generation;

    expect(cancelledResponse.status).toBe(499);
    await expect(cancelledResponse.json()).resolves.toMatchObject({
      ok: false,
      error: { code: 'GENERATION_CANCELLED' },
    });
  });
});
