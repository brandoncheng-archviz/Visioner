import { ACCEPTED_IMAGE_UPLOAD_TYPES } from '../constants/canvasConstants';

export type ImageFileRejectReason = 'unsupported-type' | 'too-large' | 'decode-failed';

export type ImageFileReject = {
  file: File;
  reason: ImageFileRejectReason;
};

export function getImageRejectMessage(rejectedFiles: ImageFileReject[], successCount: number): string {
  if (rejectedFiles.length === 0) return '';

  if (successCount > 0) {
    return '部分图片未添加，可能是格式不支持、超过 10MB 或图片无法读取。';
  }

  const reasons = new Set(rejectedFiles.map((item) => item.reason));
  const hasTooLarge = reasons.has('too-large');
  const hasUnsupported = reasons.has('unsupported-type');
  const hasDecodeFailed = reasons.has('decode-failed');

  if (hasTooLarge && !hasUnsupported && !hasDecodeFailed) {
    return '图片太大，已跳过。单张图片不能超过 10MB。';
  }

  if (hasUnsupported && !hasTooLarge && !hasDecodeFailed) {
    return '图片格式不支持。请使用 PNG、JPG、WEBP 或 GIF。';
  }

  if (hasDecodeFailed && !hasTooLarge && !hasUnsupported) {
    return '图片无法读取，已跳过。';
  }

  return '没有可添加的图片。请检查图片格式或文件大小。';
}

export function formatPastedImageLabel(file: File): string {
  if (file.name && file.name !== 'image.png') {
    return file.name.replace(/\.[^/.]+$/, '');
  }
  return 'pasted-image';
}

export function isAcceptedImageFile(file: File): boolean {
  if (ACCEPTED_IMAGE_UPLOAD_TYPES.has(file.type)) return true;
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.gif')
  );
}

export function getFilesFromClipboard(clipboardData: DataTransfer): File[] {
  const filesFromItems = Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  const filesFromFiles = Array.from(clipboardData.files ?? []);

  const seen = new Set<string>();
  const files: File[] = [];
  for (const file of [...filesFromItems, ...filesFromFiles]) {
    const key = `${file.name}-${file.size}-${file.type}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      files.push(file);
    }
  }

  return files;
}
