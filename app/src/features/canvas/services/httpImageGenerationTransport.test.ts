import { describe, expect, it, vi } from 'vitest';
import {
  IMAGE_GENERATION_REQUEST_FIELD,
  type ImageGenerationMultipartManifest,
} from '../../../../shared/imageGenerationHttp';
import type { GenerationResult, ImageGenerationRequest } from '../types/generation.types';
import { createHttpImageGenerationTransport } from './httpImageGenerationTransport';
import { createMockImageGenerationTransport } from './mockImageGenerationTransport';

const baseRequest: ImageGenerationRequest = {
  nodeId: 'image-node-1',
  prompt: 'final prompt',
  userPrompt: 'user prompt',
  inputRefs: [],
  modelParams: {
    model: 'gpt-image-2',
    aspectRatio: '1:1',
    resolution: '2K',
    resolutionTier: '2K',
    requestedSize: { width: 2048, height: 2048 },
    count: 1,
  },
  controller: { time: 'dusk' },
  presets: ['clean_up'],
};

const result: GenerationResult = {
  taskId: 'http-result-1',
  imageUrl: '/assets/mock/generation-results/show-cover-1.jpg',
  width: 2048,
  height: 2048,
  seed: 42,
  metadata: { prompt: 'final prompt', model: 'gpt-image-2', resolution: '2K' },
};

function successResponse(results = [result]) {
  return Response.json({ ok: true, results });
}

function readManifest(init: RequestInit | undefined) {
  const formData = init?.body as FormData;
  const serialized = formData.get(IMAGE_GENERATION_REQUEST_FIELD);
  if (typeof serialized !== 'string') throw new Error('Missing request manifest');
  return {
    formData,
    manifest: JSON.parse(serialized) as ImageGenerationMultipartManifest<ImageGenerationRequest>,
  };
}

describe('httpImageGenerationTransport', () => {
  it('sends a request without references as multipart form data', async () => {
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const { formData, manifest } = readManifest(init);
      expect([...formData.keys()]).toEqual([IMAGE_GENERATION_REQUEST_FIELD]);
      expect(manifest.request).toEqual(baseRequest);
      expect(manifest.references).toEqual([]);
      return successResponse();
    }) as typeof fetch;
    const transport = createHttpImageGenerationTransport({ fetchImplementation });

    await expect(transport.generate(baseRequest)).resolves.toEqual([result]);
  });

  it('resolves a blob reference to a multipart file without sending its browser URL', async () => {
    const referenceFetchImplementation = vi.fn(async () => new Response(
      new Blob(['image'], { type: 'image/png' }),
    )) as typeof fetch;
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const { formData, manifest } = readManifest(init);
      expect(manifest.references).toEqual([{
        inputRefIndex: 0,
        sourceKind: 'blob',
        fileField: 'reference_0',
      }]);
      expect(manifest.request.inputRefs[0]).toMatchObject({
        sourceNodeId: 'source-1',
        imageUrl: 'multipart://reference_0',
        role: 'primary_building',
        promptText: 'keep the building',
      });
      expect(JSON.stringify(manifest)).not.toContain('blob:browser-only');
      expect(formData.get('reference_0')).toBeInstanceOf(File);
      return successResponse();
    }) as typeof fetch;
    const transport = createHttpImageGenerationTransport({
      fetchImplementation,
      referenceFetchImplementation,
    });
    const request = {
      ...baseRequest,
      inputRefs: [{
        sourceNodeId: 'source-1',
        imageUrl: 'blob:browser-only',
        role: 'primary_building',
        promptText: 'keep the building',
      }],
    };

    await expect(transport.generate(request)).resolves.toEqual([result]);
  });

  it('preserves multiple reference order and metadata while keeping HTTP URLs remote', async () => {
    const referenceFetchImplementation = vi.fn(async () => new Response(
      new Blob(['local'], { type: 'image/webp' }),
    )) as typeof fetch;
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const { manifest } = readManifest(init);
      expect(manifest.references).toEqual([
        { inputRefIndex: 0, sourceKind: 'local', fileField: 'reference_0' },
        { inputRefIndex: 1, sourceKind: 'http', url: 'https://cdn.example.com/sky.jpg' },
      ]);
      expect(manifest.request.inputRefs.map(({ sourceNodeId, role, promptText }) => ({
        sourceNodeId,
        role,
        promptText,
      }))).toEqual([
        { sourceNodeId: 'building', role: 'primary_building', promptText: 'preserve massing' },
        { sourceNodeId: 'sky', role: 'atmosphere_reference', promptText: 'follow atmosphere' },
      ]);
      return successResponse();
    }) as typeof fetch;
    const transport = createHttpImageGenerationTransport({ fetchImplementation, referenceFetchImplementation });

    await transport.generate({
      ...baseRequest,
      inputRefs: [
        { sourceNodeId: 'building', imageUrl: '/uploads/building.webp', role: 'primary_building', promptText: 'preserve massing' },
        { sourceNodeId: 'sky', imageUrl: 'https://cdn.example.com/sky.jpg', role: 'atmosphere_reference', promptText: 'follow atmosphere' },
      ],
    });
    expect(referenceFetchImplementation).toHaveBeenCalledTimes(1);
  });

  it('passes AbortSignal to fetch and normalizes cancellation', async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    }));
    const fetchImplementation = fetchMock as typeof fetch;
    const transport = createHttpImageGenerationTransport({ fetchImplementation });
    const controller = new AbortController();
    const generation = transport.generate(baseRequest, { signal: controller.signal });
    controller.abort();

    await expect(generation).rejects.toMatchObject({ code: 'cancelled' });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  it('maps server errors to stable frontend generation codes', async () => {
    const fetchImplementation = vi.fn(async () => Response.json({
      ok: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'too large' },
    }, { status: 413 })) as typeof fetch;
    const transport = createHttpImageGenerationTransport({ fetchImplementation });

    await expect(transport.generate(baseRequest)).rejects.toMatchObject({ code: 'invalidInput' });
  });

  it('matches the existing Mock transport GenerationResult array contract', async () => {
    const httpTransport = createHttpImageGenerationTransport({
      fetchImplementation: vi.fn(async () => successResponse()) as typeof fetch,
    });
    const mockTransport = createMockImageGenerationTransport(vi.fn(async () => result));

    await expect(httpTransport.generate(baseRequest)).resolves.toEqual([result]);
    await expect(mockTransport.generate(baseRequest)).resolves.toEqual([result]);
  });
});
