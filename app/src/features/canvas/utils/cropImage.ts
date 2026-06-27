import type { NormalizedCropRect } from '../nodes/ImageNode/ImageCropOverlay';

export type CroppedImage = {
  url: string;
  width: number;
  height: number;
  blobSize: number;
};

export async function cropCoverImage(
  image: HTMLImageElement,
  displayWidth: number,
  displayHeight: number,
  crop: NormalizedCropRect,
): Promise<CroppedImage> {
  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;
  if (!naturalWidth || !naturalHeight || !displayWidth || !displayHeight) {
    throw new Error('Image is not ready');
  }

  const coverScale = Math.max(displayWidth / naturalWidth, displayHeight / naturalHeight);
  const visibleSourceWidth = displayWidth / coverScale;
  const visibleSourceHeight = displayHeight / coverScale;
  const visibleSourceX = (naturalWidth - visibleSourceWidth) / 2;
  const visibleSourceY = (naturalHeight - visibleSourceHeight) / 2;
  const sourceX = visibleSourceX + crop.x * visibleSourceWidth;
  const sourceY = visibleSourceY + crop.y * visibleSourceHeight;
  const sourceWidth = crop.width * visibleSourceWidth;
  const sourceHeight = crop.height * visibleSourceHeight;
  const outputWidth = Math.max(1, Math.round(sourceWidth));
  const outputHeight = Math.max(1, Math.round(sourceHeight));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is unavailable');
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outputWidth, outputHeight);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Failed to export crop')), 'image/png');
  });
  return { url: URL.createObjectURL(blob), width: outputWidth, height: outputHeight, blobSize: blob.size };
}
