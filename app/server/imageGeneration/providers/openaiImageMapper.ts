import { ServerGenerationError } from '../errors.js';
import type { ParsedImageReference, ServerImageGenerationRequest } from '../requestParser.js';

export type OpenAIImageSize = `${number}x${number}`;

export type OpenAIImageGenerationPayload = {
  model: string;
  prompt: string;
  n: number;
  size: OpenAIImageSize;
  quality: 'low' | 'medium' | 'high';
  output_format: 'png';
};

export type OpenAIImageEditPayload = OpenAIImageGenerationPayload & {
  images: Array<{
    bytes: Uint8Array;
    filename: string;
    mimeType: string;
    inputRefIndex: number;
    sourceNodeId: string;
    role: string;
    promptText: string;
  }>;
};

const MIN_PIXELS = 655_360;
const MAX_PIXELS = 8_294_400;
const MAX_EDGE = 3_840;
const MIN_ASPECT_RATIO = 1 / 3;
const MAX_ASPECT_RATIO = 3;

function roundToMultipleOf16(value: number) {
  return Math.max(16, Math.round(value / 16) * 16);
}

export function mapOpenAIImageSize(requestedSize: { width: number; height: number }): OpenAIImageSize {
  if (!Number.isFinite(requestedSize.width) || !Number.isFinite(requestedSize.height)
    || requestedSize.width <= 0 || requestedSize.height <= 0) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Requested image size is invalid.');
  }

  const sourceRatio = Math.min(MAX_ASPECT_RATIO, Math.max(MIN_ASPECT_RATIO, requestedSize.width / requestedSize.height));
  let width = requestedSize.width;
  let height = requestedSize.height;
  const maxScale = Math.min(1, MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
  width *= maxScale;
  height *= maxScale;

  if (width * height < MIN_PIXELS) {
    const scale = Math.sqrt(MIN_PIXELS / (width * height));
    width *= scale;
    height *= scale;
  }

  width = roundToMultipleOf16(width);
  height = roundToMultipleOf16(height);
  if (width * height > MAX_PIXELS || Math.max(width, height) > MAX_EDGE) {
    const scale = Math.min(MAX_EDGE / Math.max(width, height), Math.sqrt(MAX_PIXELS / (width * height)));
    width = Math.floor((width * scale) / 16) * 16;
    height = Math.floor((height * scale) / 16) * 16;
  }

  const mappedRatio = width / height;
  if (mappedRatio < MIN_ASPECT_RATIO || mappedRatio > MAX_ASPECT_RATIO
    || Math.abs(mappedRatio - sourceRatio) > 0.04) {
    throw new ServerGenerationError('INVALID_REQUEST', 'Requested image aspect ratio is not supported.');
  }
  return `${width}x${height}`;
}

export function parseOpenAIImageSize(size: OpenAIImageSize) {
  const [width, height] = size.split('x').map(Number);
  return { width, height };
}

export function mapOpenAIImageGenerationPayload(
  request: ServerImageGenerationRequest,
  providerModel: string,
  defaultQuality: OpenAIImageGenerationPayload['quality'],
): OpenAIImageGenerationPayload {
  return {
    model: providerModel,
    prompt: request.prompt,
    n: request.modelParams.count,
    size: mapOpenAIImageSize(request.modelParams.requestedSize),
    quality: defaultQuality,
    output_format: 'png',
  };
}

export function mapOpenAIImageEditPayload(
  request: ServerImageGenerationRequest,
  references: ParsedImageReference[],
  providerModel: string,
  defaultQuality: OpenAIImageGenerationPayload['quality'],
): OpenAIImageEditPayload {
  const images = references.map((reference) => {
    if (reference.source.kind !== 'file') {
      throw new ServerGenerationError(
        'INVALID_REFERENCE',
        'Remote image references are not supported by the provider transport.',
      );
    }
    return {
      bytes: reference.source.bytes,
      filename: reference.source.filename,
      mimeType: reference.source.mimeType,
      inputRefIndex: reference.inputRefIndex,
      sourceNodeId: reference.sourceNodeId,
      role: reference.role,
      promptText: reference.promptText,
    };
  });

  return { ...mapOpenAIImageGenerationPayload(request, providerModel, defaultQuality), images };
}
