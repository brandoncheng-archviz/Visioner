import { describe, expect, it, vi } from 'vitest';
import { createImageGenerationModelRegistry } from '../modelRegistry.js';
import {
  createConfiguredImageGenerationOrchestrator,
  createProviderImageGenerationOrchestrator,
  type ServerGenerationResult,
} from '../orchestrator.js';
import type { ParsedImageReference, ServerImageGenerationRequest } from '../requestParser.js';
import type { ImageGenerationProvider } from './imageGenerationProvider.js';
import {
  mapOpenAIImageEditPayload,
  mapOpenAIImageGenerationPayload,
  mapOpenAIImageSize,
} from './openaiImageMapper.js';
import { createOpenAIImageProvider, mapOpenAIProviderError } from './openaiImageProvider.js';

const request: ServerImageGenerationRequest = {
  nodeId: 'image-node-provider',
  prompt: 'existing assembled prompt',
  userPrompt: 'user prompt',
  inputRefs: [],
  modelParams: {
    model: 'gpt-image-2',
    aspectRatio: '16:9',
    resolution: '2K',
    resolutionTier: '2K',
    requestedSize: { width: 2048, height: 1152 },
    count: 1,
  },
};

const providerOptions = () => ({
  providerModel: 'gpt-image-2',
  defaultQuality: 'medium' as const,
  signal: new AbortController().signal,
});

function fileReference(index: number, role = 'custom_reference'): ParsedImageReference {
  return {
    inputRefIndex: index,
    sourceNodeId: `source-${index}`,
    role,
    promptText: `instruction-${index}`,
    source: {
      kind: 'file',
      field: `reference_${index}`,
      mimeType: 'image/png',
      filename: `reference-${index}.png`,
      bytes: new Uint8Array([index + 1]),
    },
  };
}

function successfulResponse() {
  const pngHeader = new Uint8Array(24);
  pngHeader.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(pngHeader.buffer);
  view.setUint32(16, 2048);
  view.setUint32(20, 1152);
  return new Response(JSON.stringify({
    created: 123,
    data: [{ b64_json: Buffer.from(pngHeader).toString('base64') }],
  }), { status: 200, headers: { 'content-type': 'application/json' } });
}

describe('OpenAI image mapper', () => {
  it('keeps the assembled prompt and maps Visioner size separately', () => {
    expect(mapOpenAIImageSize({ width: 2048, height: 1152 })).toBe('2048x1152');
    expect(mapOpenAIImageSize({ width: 512, height: 512 })).toBe('816x816');
    expect(mapOpenAIImageGenerationPayload(request, 'gpt-image-2', 'medium')).toEqual({
      model: 'gpt-image-2',
      prompt: request.prompt,
      n: 1,
      size: '2048x1152',
      quality: 'medium',
      output_format: 'png',
    });
  });

  it('preserves reference order, role, prompt text and source metadata', () => {
    const payload = mapOpenAIImageEditPayload(
      request,
      [fileReference(0, 'primary_building'), fileReference(1, 'atmosphere_reference')],
      'gpt-image-2',
      'medium',
    );
    expect(payload.images.map(({ inputRefIndex, sourceNodeId, role, promptText }) => ({
      inputRefIndex,
      sourceNodeId,
      role,
      promptText,
    }))).toEqual([
      { inputRefIndex: 0, sourceNodeId: 'source-0', role: 'primary_building', promptText: 'instruction-0' },
      { inputRefIndex: 1, sourceNodeId: 'source-1', role: 'atmosphere_reference', promptText: 'instruction-1' },
    ]);
  });

  it('rejects remote references instead of downloading them server-side', () => {
    const remote: ParsedImageReference = {
      ...fileReference(0),
      source: { kind: 'url', url: 'https://example.com/reference.png' },
    };
    expect(() => mapOpenAIImageEditPayload(request, [remote], 'gpt-image-2', 'medium'))
      .toThrow(expect.objectContaining({ code: 'INVALID_REFERENCE' }));
  });
});

describe('OpenAI image provider', () => {
  it('uses the generations endpoint when there are no references', async () => {
    const fetchImplementation = vi.fn(async () => successfulResponse()) as typeof fetch;
    const save = vi.fn(async () => ({ imageUrl: '/api/generated-images/result.png' }));
    const logger = vi.fn();
    const provider = createOpenAIImageProvider({
      apiKey: () => 'test-key',
      fetchImplementation,
      resultStore: { save },
      logger,
    });

    const results = await provider.generate(request, [], providerOptions());

    expect(fetchImplementation).toHaveBeenCalledOnce();
    const [url, init] = fetchImplementation.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/images/generations');
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: 'gpt-image-2',
      prompt: request.prompt,
      size: '2048x1152',
      quality: 'medium',
    });
    expect(results[0]).toMatchObject({
      imageUrl: '/api/generated-images/result.png',
      width: 2048,
      height: 1152,
      metadata: { prompt: request.prompt, model: 'gpt-image-2', resolution: '2K' },
    });
    expect(save).toHaveBeenCalledWith(expect.any(Uint8Array), 'png');
    expect(logger).toHaveBeenCalledOnce();
    expect(logger).toHaveBeenCalledWith('OpenAI image request diagnostic', expect.objectContaining({
      requestId: expect.any(String),
      model: 'gpt-image-2',
      operation: 'generation',
      referenceCount: 0,
      requestedSize: { width: 2048, height: 1152 },
      quality: 'medium',
      openAIHttpStatus: 200,
      openAIErrorType: null,
      openAIErrorCode: null,
      stableErrorCode: null,
      durationMs: expect.any(Number),
    }));
    expect(JSON.stringify(logger.mock.calls)).not.toContain(request.prompt);
    expect(JSON.stringify(logger.mock.calls)).not.toContain('authorization');
  });

  it('uses the edits endpoint and repeats image[] in original order', async () => {
    const fetchImplementation = vi.fn(async () => successfulResponse()) as typeof fetch;
    const logger = vi.fn();
    const provider = createOpenAIImageProvider({
      apiKey: () => 'test-key',
      fetchImplementation,
      resultStore: { save: async () => ({ imageUrl: '/result.png' }) },
      logger,
    });
    const references = [fileReference(0), fileReference(1), fileReference(2)];

    await provider.generate(request, references, providerOptions());

    const [url, init] = fetchImplementation.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/images/edits');
    const formData = init.body as FormData;
    expect(formData.get('prompt')).toBe(request.prompt);
    expect(formData.get('quality')).toBe('medium');
    expect(formData.getAll('image[]').map((value) => (value as File).name)).toEqual([
      'reference-0.png',
      'reference-1.png',
      'reference-2.png',
    ]);
    expect(logger).toHaveBeenCalledWith('OpenAI image request diagnostic', expect.objectContaining({
      operation: 'edit',
      referenceCount: 3,
      openAIHttpStatus: 200,
      stableErrorCode: null,
    }));
  });

  it('uses the edits endpoint for a single reference', async () => {
    const fetchImplementation = vi.fn(async () => successfulResponse()) as typeof fetch;
    const provider = createOpenAIImageProvider({
      apiKey: () => 'test-key',
      fetchImplementation,
      resultStore: { save: async () => ({ imageUrl: '/result.png' }) },
      logger: vi.fn(),
    });
    await provider.generate(request, [fileReference(0)], providerOptions());
    expect(fetchImplementation.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/images/edits');
  });

  it('normalizes missing keys, auth, rate limits, provider failures and invalid images', async () => {
    const missingKeyProvider = createOpenAIImageProvider({ apiKey: () => undefined, logger: vi.fn() });
    await expect(missingKeyProvider.generate(request, [], providerOptions()))
      .rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });

    expect(mapOpenAIProviderError(401, {})).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(mapOpenAIProviderError(429, {})).toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    expect(mapOpenAIProviderError(503, {})).toMatchObject({ code: 'GENERATION_FAILED' });
    expect(mapOpenAIProviderError(408, {})).toMatchObject({ code: 'TIMEOUT' });
    expect(mapOpenAIProviderError(400, { error: { param: 'image[]' } })).toMatchObject({ code: 'INVALID_REFERENCE' });
    expect(mapOpenAIProviderError(400, { error: { param: 'size' } })).toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it.each([
    [401, {}, 'PROVIDER_UNAVAILABLE'],
    [429, {}, 'PROVIDER_UNAVAILABLE'],
    [503, {}, 'GENERATION_FAILED'],
    [408, {}, 'TIMEOUT'],
    [400, { error: { param: 'image[]', type: 'invalid_image', code: 'invalid_image_format' } }, 'INVALID_REFERENCE'],
    [400, { error: { param: 'size', type: 'invalid_request_error' } }, 'INVALID_REQUEST'],
  ] as const)('maps mocked OpenAI HTTP %s responses to %s', async (status, body, expectedCode) => {
    const logger = vi.fn();
    const provider = createOpenAIImageProvider({
      apiKey: () => 'test-key',
      fetchImplementation: vi.fn(async () => Response.json(body, {
        status,
        headers: { 'x-request-id': 'request-id-for-test' },
      })) as typeof fetch,
      logger,
    });
    await expect(provider.generate(request, [], providerOptions()))
      .rejects.toMatchObject({ code: expectedCode });
    expect(logger).toHaveBeenCalledWith('OpenAI image request diagnostic', expect.objectContaining({
      openAIHttpStatus: status,
      openAIErrorType: 'error' in body && typeof body.error?.type === 'string' ? body.error.type : null,
      openAIErrorCode: 'error' in body && typeof body.error?.code === 'string' ? body.error.code : null,
      stableErrorCode: expectedCode,
    }));
  });

  it('uses the default logger only in development', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    try {
      process.env.NODE_ENV = 'production';
      await expect(createOpenAIImageProvider({ apiKey: () => undefined }).generate(request, [], providerOptions()))
        .rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
      expect(consoleInfo).not.toHaveBeenCalled();

      process.env.NODE_ENV = 'development';
      await expect(createOpenAIImageProvider({ apiKey: () => undefined }).generate(request, [], providerOptions()))
        .rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
      expect(consoleInfo).toHaveBeenCalledOnce();
      expect(consoleInfo).toHaveBeenCalledWith('OpenAI image request diagnostic', expect.objectContaining({
        stableErrorCode: 'PROVIDER_UNAVAILABLE',
        openAIHttpStatus: null,
      }));
    } finally {
      if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = originalNodeEnv;
      consoleInfo.mockRestore();
    }
  });

  it('propagates AbortSignal and returns a stable cancellation error', async () => {
    const controller = new AbortController();
    const fetchImplementation = vi.fn((_url: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })) as typeof fetch;
    const provider = createOpenAIImageProvider({ apiKey: () => 'test-key', fetchImplementation, logger: vi.fn() });
    const generation = provider.generate(request, [], { ...providerOptions(), signal: controller.signal });
    controller.abort();
    await expect(generation).rejects.toMatchObject({ code: 'GENERATION_CANCELLED' });
  });
});

describe('image generation model registry and dispatch', () => {
  it('maps the stable model ID to a server-only provider model', () => {
    const provider: ImageGenerationProvider = { generate: vi.fn() };
    const registration = createImageGenerationModelRegistry({ openAIProvider: provider }).resolve('gpt-image-2');
    expect(registration).toMatchObject({
      internalModelId: 'gpt-image-2',
      providerId: 'openai',
      providerModel: 'gpt-image-2',
      defaultQuality: 'medium',
      provider,
    });
  });

  it('keeps mock as default and dispatches provider mode through the registry', async () => {
    expect(createConfiguredImageGenerationOrchestrator('mock')).toBeDefined();
    const result: ServerGenerationResult = {
      taskId: 'provider-result', imageUrl: '/provider.png', width: 2048, height: 1152, seed: 0,
      metadata: { prompt: request.prompt, model: 'gpt-image-2', resolution: '2K' },
    };
    const generate = vi.fn(async () => [result]);
    const provider: ImageGenerationProvider = { generate };
    const orchestrator = createProviderImageGenerationOrchestrator(
      createImageGenerationModelRegistry({ openAIProvider: provider }),
    );

    await expect(orchestrator.generate({ request, references: [fileReference(0)] }, new AbortController().signal))
      .resolves.toEqual([result]);
    expect(generate).toHaveBeenCalledWith(request, [fileReference(0)], expect.objectContaining({
      providerModel: 'gpt-image-2',
      defaultQuality: 'medium',
    }));
  });
});
