import { createContext, useContext, useCallback, useMemo, useState } from 'react';
import type { GeneratedImage, ResultSetBatch } from '../types/history.types';

function createImageAssetBatch(batch: ResultSetBatch, image: GeneratedImage, index: number): ResultSetBatch {
  return {
    ...batch,
    batchId: `${batch.batchId}:${image.resultId}`,
    images: [image],
    createdAt: batch.createdAt + index,
  };
}

interface HistoryContextValue {
  batches: ResultSetBatch[];
  addBatch: (batch: ResultSetBatch) => void;
  removeBatch: (batchId: string) => void;
  removeBatches: (batchIds: string[]) => void;
  getBatchesByNodeId: (nodeId: string) => ResultSetBatch[];
  getBatchById: (batchId: string) => ResultSetBatch | undefined;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<ResultSetBatch[]>([]);

  const addBatch = useCallback((batch: ResultSetBatch) => {
    setBatches((prev) => {
      const assets = batch.images.map((image, index) => createImageAssetBatch(batch, image, index));
      const existingIds = new Set(prev.map((item) => item.batchId));
      const nextAssets = assets.filter((asset) => !existingIds.has(asset.batchId));
      if (nextAssets.length === 0) return prev;
      return [...nextAssets, ...prev];
    });
  }, []);

  const removeBatch = useCallback((batchId: string) => {
    setBatches((prev) => prev.filter((b) => b.batchId !== batchId));
  }, []);

  const removeBatches = useCallback((batchIds: string[]) => {
    const idSet = new Set(batchIds);
    setBatches((prev) => prev.filter((b) => !idSet.has(b.batchId)));
  }, []);

  const getBatchesByNodeId = useCallback(
    (nodeId: string) => batches.filter((b) => b.nodeId === nodeId),
    [batches],
  );

  const getBatchById = useCallback(
    (batchId: string) => batches.find((b) => b.batchId === batchId),
    [batches],
  );

  const value = useMemo(
    () => ({
      batches,
      addBatch,
      removeBatch,
      removeBatches,
      getBatchesByNodeId,
      getBatchById,
    }),
    [batches, addBatch, removeBatch, removeBatches, getBatchesByNodeId, getBatchById],
  );

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>;
}

export function useHistory() {
  const ctx = useContext(HistoryContext);
  if (!ctx) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return ctx;
}
