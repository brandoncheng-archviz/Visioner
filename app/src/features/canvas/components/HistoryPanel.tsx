import { useState, useMemo, useCallback } from 'react';
import { X, Eye, Trash2, Check, Clock, Image as ImageIcon, Film, Music } from 'lucide-react';
import { useHistory } from '../contexts/HistoryContext';
import { useToast } from '../hooks/useToast';
import type { ResultSetBatch, GeneratedImage } from '../types/history.types';

interface HistoryPanelProps {
  scope: 'global' | 'node';
  nodeId?: string;
  onClose?: () => void;
  onUseImages?: (images: GeneratedImage[], sourceBatch?: ResultSetBatch, sourceBatches?: ResultSetBatch[]) => void;
}

function formatDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) return '今天';
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function groupBatchesByDate(batches: ResultSetBatch[]): Record<string, ResultSetBatch[]> {
  const groups: Record<string, ResultSetBatch[]> = {};
  batches.forEach((batch) => {
    const key = formatDateLabel(batch.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(batch);
  });
  return groups;
}

export function HistoryPanel({ scope, nodeId, onClose, onUseImages }: HistoryPanelProps) {
  const { batches, removeBatch, removeBatches } = useHistory();
  const { show: showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'audio'>('image');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewImages, setPreviewImages] = useState<GeneratedImage[] | null>(null);
  const [previewIndex, setPreviewIndex] = useState(0);

  const filteredBatches = useMemo(() => {
    if (scope === 'node' && nodeId) {
      return batches.filter((b) => b.nodeId === nodeId);
    }
    return batches;
  }, [batches, scope, nodeId]);

  const grouped = useMemo(() => groupBatchesByDate(filteredBatches), [filteredBatches]);
  const sortedDates = useMemo(() => Object.keys(grouped), [grouped]);

  const toggleSelect = useCallback((batchId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }, []);

  const handleDelete = useCallback((batchId: string) => {
    removeBatch(batchId);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(batchId);
      return next;
    });
  }, [removeBatch]);

  const handleBatchDelete = useCallback(() => {
    removeBatches(Array.from(selectedIds));
    setSelectedIds(new Set());
  }, [removeBatches, selectedIds]);

  const handleUse = useCallback((batch: ResultSetBatch) => {
    if (onUseImages) {
      onUseImages(batch.images, batch);
    } else {
      showToast('已选择历史结果，请在图片节点中使用');
    }
    setBatchMode(false);
    setSelectedIds(new Set());
    onClose?.();
  }, [onUseImages, onClose, showToast]);

  const handleBatchUse = useCallback(() => {
    const selectedBatches = filteredBatches.filter((b) => selectedIds.has(b.batchId));
    const allImages = selectedBatches.flatMap((b) => b.images);
    if (allImages.length > 4) {
      showToast('最多只能选择 4 张图片');
      return;
    }
    if (onUseImages) {
      onUseImages(allImages, undefined, selectedBatches);
    } else {
      showToast('已选择历史结果，请在图片节点中使用');
    }
    setBatchMode(false);
    setSelectedIds(new Set());
    onClose?.();
  }, [filteredBatches, selectedIds, onUseImages, onClose, showToast]);

  const handleDownload = useCallback((imageUrl: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = `visioner-history-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const selectedCount = selectedIds.size;
  const selectedImageCount = filteredBatches
    .filter((batch) => selectedIds.has(batch.batchId))
    .reduce((count, batch) => count + batch.images.length, 0);
  const canUse = selectedImageCount > 0 && selectedImageCount <= 4;

  return (
    <div className="flex flex-col h-full" style={{ background: '#252526' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#2a2a35' }}>
        <span className="text-sm font-medium text-white">历史资产</span>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 px-4 py-2 border-b text-xs" style={{ borderColor: '#2a2a35' }}>
        <button
          onClick={() => setActiveTab('image')}
          className={`flex items-center gap-1 transition-colors ${activeTab === 'image' ? 'text-white' : 'text-[#6a6a7a] hover:text-white/70'}`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
          图片历史（{filteredBatches.length}）
        </button>
        <button
          onClick={() => setActiveTab('video')}
          className={`flex items-center gap-1 transition-colors ${activeTab === 'video' ? 'text-white' : 'text-[#6a6a7a] hover:text-white/70'}`}
          disabled
        >
          <Film className="w-3.5 h-3.5" />
          视频历史（0）
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`flex items-center gap-1 transition-colors ${activeTab === 'audio' ? 'text-white' : 'text-[#6a6a7a] hover:text-white/70'}`}
          disabled
        >
          <Music className="w-3.5 h-3.5" />
          音频历史（0）
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b text-xs" style={{ borderColor: '#2a2a35' }}>
        <div className="flex items-center gap-1 text-[#6a6a7a]">
          <Clock className="w-3 h-3" />
          时间顺序
        </div>
        <button
          onClick={() => {
            setBatchMode((v) => !v);
            setSelectedIds(new Set());
          }}
          className={`px-2 py-1 rounded transition-colors ${batchMode ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5 hover:text-white'}`}
        >
          {batchMode ? '取消批量' : '批量操作'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 nowheel">
        {activeTab === 'image' && sortedDates.length === 0 && (
          <div className="text-center py-12 text-[#6a6a7a] text-sm">暂无历史记录</div>
        )}
        {activeTab === 'image' && sortedDates.map((date) => (
          <div key={date}>
            <div className="text-[11px] text-[#6a6a7a] mb-2">{date}</div>
            <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))' }}>
              {grouped[date].map((batch) => (
                <HistoryCard
                  key={batch.batchId}
                  batch={batch}
                  batchMode={batchMode}
                  selected={selectedIds.has(batch.batchId)}
                  onToggleSelect={() => toggleSelect(batch.batchId)}
                  onPreview={() => {
                    setPreviewImages(batch.images);
                    setPreviewIndex(0);
                  }}
                  onUse={() => handleUse(batch)}
                  onDelete={() => handleDelete(batch.batchId)}
                />
              ))}
            </div>
          </div>
        ))}
        {(activeTab === 'video' || activeTab === 'audio') && (
          <div className="text-center py-12 text-[#6a6a7a] text-sm">暂无记录</div>
        )}
      </div>

      {/* Batch action bar */}
      {batchMode && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(13,13,16,0.98)' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>已选 {selectedImageCount} 张</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBatchDelete}
              disabled={selectedCount === 0}
              className="rounded-md px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.72)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.92)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                event.currentTarget.style.background = 'transparent';
              }}
            >
              删除
            </button>
            <button
              onClick={() => {
                selectedIds.forEach((id) => {
                  const batch = filteredBatches.find((b) => b.batchId === id);
                  if (batch) batch.images.forEach((img) => handleDownload(img.imageUrl));
                });
              }}
              disabled={selectedCount === 0}
              className="rounded-md px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.72)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.92)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                event.currentTarget.style.background = 'transparent';
              }}
            >
              下载
            </button>
            <button
              onClick={handleBatchUse}
              disabled={!canUse}
              className="rounded-md px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: 'rgba(255,255,255,0.72)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.92)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                event.currentTarget.style.background = 'transparent';
              }}
            >
              使用
            </button>
            <button
              onClick={() => { setSelectedIds(new Set()); }}
              className="rounded-md px-2.5 py-1 text-[11px] transition-colors"
              style={{ color: 'rgba(255,255,255,0.72)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.92)';
                event.currentTarget.style.background = 'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.color = 'rgba(255,255,255,0.72)';
                event.currentTarget.style.background = 'transparent';
              }}
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewImages && previewImages[previewIndex] && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.78)' }}
          onClick={() => setPreviewImages(null)}
        >
          <img src={previewImages[previewIndex].imageUrl} alt="" className="max-w-[85vw] max-h-[85vh] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          {previewImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-3 py-2" style={{ background: 'rgba(0,0,0,0.52)', border: '1px solid rgba(255,255,255,0.12)' }} onClick={(e) => e.stopPropagation()}>
              {previewImages.map((image, index) => (
                <button
                  key={image.resultId}
                  type="button"
                  onClick={() => setPreviewIndex(index)}
                  className="h-10 w-10 overflow-hidden rounded-md transition-all"
                  style={{ border: previewIndex === index ? '1.5px solid #00d4ff' : '1.5px solid transparent', opacity: previewIndex === index ? 1 : 0.64 }}
                >
                  <img src={image.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setPreviewImages(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── History Card ─── */
function HistoryCard({
  batch,
  batchMode,
  selected,
  onToggleSelect,
  onPreview,
  onUse,
  onDelete,
}: {
  batch: ResultSetBatch;
  batchMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onPreview: () => void;
  onUse: () => void;
  onDelete: () => void;
}) {
  const cover = batch.images[0]?.imageUrl || '';
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group"
      style={{
        border: selected ? '1.5px solid #00d4ff' : '1.5px solid transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={batchMode ? onToggleSelect : undefined}
    >
      <img src={cover} alt="" className="w-full h-full object-cover" draggable={false} />

      {/* Hover overlay */}
      {!batchMode && hovered && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <button
            onClick={(e) => { e.stopPropagation(); onPreview(); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] text-white/90 transition-colors hover:bg-white/15"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Eye className="w-3 h-3" />
            查看
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onUse(); }}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] text-white/90 transition-colors hover:bg-white/15"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <Check className="w-3 h-3" />
            使用
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-1 right-1 w-6 h-6 rounded flex items-center justify-center text-white/50 hover:text-[#fca5a5] hover:bg-[rgba(239,68,68,0.15)] transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Batch select checkbox */}
      {batchMode && (
        <div className="absolute top-1.5 left-1.5 z-10">
          <div
            className="w-4 h-4 rounded border flex items-center justify-center transition-colors"
            style={{
              borderColor: selected ? '#00d4ff' : 'rgba(255,255,255,0.35)',
              background: selected ? 'rgba(0,212,255,0.25)' : 'rgba(0,0,0,0.35)',
            }}
          >
            {selected && <Check className="w-2.5 h-2.5 text-[#00d4ff]" />}
          </div>
        </div>
      )}
    </div>
  );
}
