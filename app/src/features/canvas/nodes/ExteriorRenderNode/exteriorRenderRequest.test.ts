import { describe, expect, it } from 'vitest';
import { mockExteriorRender } from './mockExteriorRender';
import {
  buildExteriorRenderRequest,
  deriveExteriorRenderViewState,
  shouldApplyExteriorRenderTaskResult,
  validateExteriorRenderRequest,
} from './exteriorRenderRequest';
import type {
  ExteriorRenderConnectedImage,
  ExteriorRenderNodeData,
  ExteriorRenderRenderChannel,
} from './exteriorRender.types';

function createInputImage(overrides: Partial<ExteriorRenderConnectedImage> = {}): ExteriorRenderConnectedImage {
  return {
    id: 'input-1',
    sourceType: 'upload',
    imageUrl: '/images/input.jpg',
    width: 1280,
    height: 720,
    role: 'primary_building',
    roleLabel: '主体建筑',
    ...overrides,
  };
}

function createChannel(type: ExteriorRenderRenderChannel['type']): ExteriorRenderRenderChannel {
  return {
    id: `channel-${type}`,
    type,
    name: type,
    imageUrl: `/images/${type}.png`,
    fileName: `${type}.png`,
    width: 1024,
    height: 1024,
  };
}

function createData(overrides: Partial<ExteriorRenderNodeData> = {}): ExteriorRenderNodeData {
  return {
    prompt: '',
    connectedImages: [createInputImage()],
    renderChannels: { channels: [] },
    atmosphere: {},
    modelParams: {
      model: 'Nano Banana 2',
      aspectRatio: '16:9',
      resolution: '2K',
      count: 1,
    },
    generationTask: {
      taskId: null,
      status: 'idle',
      errorCode: null,
      startedAt: null,
      completedAt: null,
    },
    ...overrides,
  };
}

describe('buildExteriorRenderRequest', () => {
  it('builds a valid request with only a normal input image and allows an empty prompt', () => {
    const request = buildExteriorRenderRequest(createData());
    expect(request.inputImages).toEqual([expect.objectContaining({
      imageUrl: '/images/input.jpg',
      usage: { key: 'primaryBuilding', label: '主体建筑' },
    })]);
    expect(request.prompt).toBe('');
    expect(validateExteriorRenderRequest(request)).toEqual({ valid: true, errors: [] });
  });

  it('maps fixed Albedo, Normal, AO and Depth slots', () => {
    const request = buildExteriorRenderRequest(createData({
      renderChannels: { channels: ['albedo', 'normal', 'ao', 'depth'].map((type) => createChannel(type as ExteriorRenderRenderChannel['type'])) },
    }));
    expect(request.renderChannels.albedo?.imageUrl).toBe('/images/albedo.png');
    expect(request.renderChannels.normal?.imageUrl).toBe('/images/normal.png');
    expect(request.renderChannels.ao?.imageUrl).toBe('/images/ao.png');
    expect(request.renderChannels.depth?.imageUrl).toBe('/images/depth.png');
  });

  it('keeps missing render channels null', () => {
    const request = buildExteriorRenderRequest(createData({
      renderChannels: { channels: [createChannel('normal')] },
    }));
    expect(request.renderChannels).toEqual({
      albedo: null,
      normal: expect.objectContaining({ imageUrl: '/images/normal.png' }),
      ao: null,
      depth: null,
    });
  });

  it('reads the legacy structure field without writing it into the request', () => {
    const request = buildExteriorRenderRequest(createData({
      renderChannels: undefined,
      structure: { channels: [createChannel('depth')] },
    }));
    expect(request.renderChannels.depth).toEqual(expect.objectContaining({ imageUrl: '/images/depth.png' }));
    expect(request).not.toHaveProperty('structure');
  });

  it('maps complete atmosphere and model parameters', () => {
    const request = buildExteriorRenderRequest(createData({
      atmosphere: {
        addEntourage: true,
        addPeople: true,
        interiorLights: true,
        motionBlur: true,
        time: { source: 'manual', value: 'sunset' },
        light: { source: 'manual', value: 'left' },
        weather: { source: 'manual', value: 'rainy' },
        style: { source: 'manual', value: 'photorealistic' },
      },
      modelParams: { model: 'GPT Image 2', aspectRatio: '4:3', resolution: '4K' },
    }));
    expect(request.atmosphere).toEqual({
      addEntourage: true,
      addPeople: true,
      interiorLights: true,
      motionBlur: true,
      time: 'sunset',
      lighting: 'left',
      weather: 'rainy',
      style: 'photorealistic',
    });
    expect(request.modelParams).toEqual({
      model: 'GPT Image 2',
      aspectRatio: '4:3',
      resolution: '4K',
      resolutionTier: '4K',
      requestedSize: { width: 3840, height: 2880 },
      count: 1,
    });
  });

  it('does not mutate node data or image/channel references', () => {
    const data = createData({ renderChannels: { channels: [createChannel('albedo')] } });
    const before = JSON.stringify(data);
    const request = buildExteriorRenderRequest(data);
    expect(JSON.stringify(data)).toBe(before);
    expect(request.inputImages[0]).not.toBe(data.connectedImages?.[0]);
    expect(request.renderChannels.albedo).not.toBe(data.renderChannels?.channels?.[0]);
  });
});

describe('exterior render validation and view state', () => {
  it('returns a clear validation error without a valid normal input image', () => {
    const request = buildExteriorRenderRequest(createData({ connectedImages: [] }));
    expect(validateExteriorRenderRequest(request)).toEqual({
      valid: false,
      errors: [{ code: 'INPUT_IMAGE_REQUIRED', field: 'inputImages' }],
    });
  });

  it('derives EMPTY, READY and PROCESSING without storing a view state', () => {
    expect(deriveExteriorRenderViewState(createData({ connectedImages: [] }))).toBe('EMPTY');
    expect(deriveExteriorRenderViewState(createData())).toBe('READY');
    expect(deriveExteriorRenderViewState(createData({
      generationTask: {
        taskId: 'task-processing',
        status: 'processing',
        errorCode: null,
        startedAt: 1,
        completedAt: null,
      },
    }))).toBe('PROCESSING');
  });
});

describe('mockExteriorRender', () => {
  it('returns a future API shaped success result using the primary input image copy', async () => {
    const request = buildExteriorRenderRequest(createData());
    const result = await mockExteriorRender(request, { delayMs: 0, taskId: 'task-success' });
    expect(result).toEqual(expect.objectContaining({
      taskId: 'task-success',
      status: 'success',
      images: [expect.objectContaining({ imageUrl: '/images/input.jpg', width: 1280, height: 720 })],
      metadata: { model: 'Nano Banana 2', aspectRatio: '16:9', resolution: '2K' },
    }));
  });

  it('rejects with a clear error for a configured failed result', async () => {
    const request = buildExteriorRenderRequest(createData());
    await expect(mockExteriorRender(request, { outcome: 'failed', delayMs: 0, taskId: 'task-failed' }))
      .rejects.toThrow('GENERATION_FAILED');
  });

  it('does not let an old task overwrite a newer task result', async () => {
    const request = buildExteriorRenderRequest(createData());
    let activeTaskId = 'task-old';
    let appliedTaskId: string | null = null;
    const oldTask = mockExteriorRender(request, { outcome: 'success', delayMs: 20, taskId: 'task-old' });
    activeTaskId = 'task-new';
    const newTask = mockExteriorRender(request, { outcome: 'success', delayMs: 0, taskId: 'task-new' });

    const apply = (taskId: string) => {
      if (shouldApplyExteriorRenderTaskResult(activeTaskId, taskId)) appliedTaskId = taskId;
    };
    apply((await newTask).taskId);
    apply((await oldTask).taskId);

    expect(appliedTaskId).toBe('task-new');
  });
});
