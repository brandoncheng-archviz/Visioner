import type { GenerationHistoryItem } from '@/features/canvas/types/generation.types';
import type { CurrentResultSet } from '@/features/canvas/types/history.types';

export type ProjectCoverSource = 'usedGenerated' | 'generated' | 'imported';

export type ProjectCoverCandidate = {
  thumbnail: string;
  source: Exclude<ProjectCoverSource, 'usedGenerated'>;
};

type ProjectCoverNode = {
  type?: string;
  data: Record<string, unknown>;
};

type GeneratedCandidate = {
  thumbnail: string;
  createdAt: number;
  nodeIndex: number;
};

function getGeneratedCandidate(node: ProjectCoverNode, nodeIndex: number): GeneratedCandidate | null {
  if (node.type !== 'image') return null;

  const data = node.data;
  const history = Array.isArray(data.generatedImages)
    ? (data.generatedImages as GenerationHistoryItem[]).filter((item) => Boolean(item?.imageUrl && item?.batchId))
    : [];

  if (history.length > 0) {
    const latestItem = history.reduce((latest, item) => (
      item.createdAt > latest.createdAt ? item : latest
    ));
    const latestBatch = history
      .filter((item) => item.batchId === latestItem.batchId)
      .sort((a, b) => a.batchIndex - b.batchIndex);
    const resultSet = data.currentResultSet as CurrentResultSet | null | undefined;
    const selectedFromSet = resultSet?.batchId === latestItem.batchId
      ? resultSet.images[resultSet.selectedIndex]
      : undefined;
    const currentResultId = typeof data.currentResultId === 'string' ? data.currentResultId : '';
    const selectedFromHistory = latestBatch.find((item) => item.resultId === currentResultId);
    const thumbnail = selectedFromSet?.imageUrl || selectedFromHistory?.imageUrl || latestBatch[0]?.imageUrl;

    return thumbnail
      ? { thumbnail, createdAt: latestItem.createdAt, nodeIndex }
      : null;
  }

  const isSuccessfulGeneratedImage = data.isGeneratedResult === true
    || data.assetSource === 'generated'
    || data.assetSource === 'history'
    || data.generationStatus === 'completed';
  if (!isSuccessfulGeneratedImage) return null;

  const resultSet = data.currentResultSet as CurrentResultSet | null | undefined;
  const selectedImage = resultSet?.images[resultSet.selectedIndex]?.imageUrl;
  const fallbackImage = typeof data.currentImage === 'string'
    ? data.currentImage
    : typeof data.image === 'string' ? data.image : '';
  const task = data.generationTask as { updatedAt?: number; createdAt?: number } | null | undefined;
  const createdAt = task?.updatedAt || task?.createdAt || nodeIndex;

  return selectedImage || fallbackImage
    ? { thumbnail: selectedImage || fallbackImage, createdAt, nodeIndex }
    : null;
}

function getImportedCandidate(nodes: readonly ProjectCoverNode[]): ProjectCoverCandidate | null {
  for (let index = nodes.length - 1; index >= 0; index -= 1) {
    const node = nodes[index];
    if (node.type !== 'image') continue;
    const data = node.data;
    const isGenerated = data.isGeneratedResult === true
      || data.assetSource === 'generated'
      || data.assetSource === 'history'
      || data.assetSource === 'exteriorRenderOutput'
      || (Array.isArray(data.generatedImages) && data.generatedImages.length > 0);
    if (isGenerated) continue;

    const thumbnail = typeof data.inputImage === 'string' && data.inputImage
      ? data.inputImage
      : typeof data.currentImage === 'string' && data.currentImage
        ? data.currentImage
        : typeof data.image === 'string' ? data.image : '';
    if (thumbnail) return { thumbnail, source: 'imported' };
  }

  return null;
}

export function resolveAutomaticProjectCover(
  nodes: readonly ProjectCoverNode[],
): ProjectCoverCandidate | null {
  const generated = nodes
    .map(getGeneratedCandidate)
    .filter((candidate): candidate is GeneratedCandidate => candidate !== null)
    .sort((a, b) => b.createdAt - a.createdAt || b.nodeIndex - a.nodeIndex)[0];

  if (generated) return { thumbnail: generated.thumbnail, source: 'generated' };
  return getImportedCandidate(nodes);
}
