import {
  IMAGE_NODE_EMPTY_HEIGHT,
  IMAGE_NODE_EMPTY_WIDTH,
  IMAGE_NODE_MAX_IMAGE_HEIGHT,
  IMAGE_NODE_MAX_IMAGE_WIDTH,
  IMAGE_NODE_MIN_IMAGE_HEIGHT,
  IMAGE_NODE_MIN_IMAGE_WIDTH,
} from '../constants/canvasConstants';

export interface ImageNodeSizeInput {
  hasImage: boolean;
  sourceWidth?: number;
  sourceHeight?: number;
}

export interface ImageNodeSizeResult {
  cardWidth: number;
  cardHeight: number;
  imageDisplayScale: number;
}

export function resolveImageNodeSize({
  hasImage,
  sourceWidth = 1,
  sourceHeight = 1,
}: ImageNodeSizeInput): ImageNodeSizeResult {
  if (!hasImage) {
    return {
      cardWidth: IMAGE_NODE_EMPTY_WIDTH,
      cardHeight: IMAGE_NODE_EMPTY_HEIGHT,
      imageDisplayScale: 1,
    };
  }

  const safeWidth = Math.max(1, sourceWidth);
  const safeHeight = Math.max(1, sourceHeight);
  let imageDisplayScale = Math.min(
    IMAGE_NODE_MAX_IMAGE_WIDTH / safeWidth,
    IMAGE_NODE_MAX_IMAGE_HEIGHT / safeHeight,
  );

  const scaledWidth = safeWidth * imageDisplayScale;
  if (scaledWidth < IMAGE_NODE_MIN_IMAGE_WIDTH) {
    const altScale = IMAGE_NODE_MIN_IMAGE_WIDTH / safeWidth;
    const altHeight = safeHeight * altScale;
    if (altHeight <= IMAGE_NODE_MAX_IMAGE_HEIGHT) {
      imageDisplayScale = altScale;
    }
  }

  const scaledHeight = safeHeight * imageDisplayScale;
  if (scaledHeight < IMAGE_NODE_MIN_IMAGE_HEIGHT) {
    const altScale = IMAGE_NODE_MIN_IMAGE_HEIGHT / safeHeight;
    const altWidth = safeWidth * altScale;
    if (altWidth <= IMAGE_NODE_MAX_IMAGE_WIDTH) {
      imageDisplayScale = altScale;
    }
  }

  return {
    cardWidth: Math.round(safeWidth * imageDisplayScale),
    cardHeight: Math.round(safeHeight * imageDisplayScale),
    imageDisplayScale,
  };
}
