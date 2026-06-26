import { useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Copy, Download, Film, Maximize2, Play, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { Handle, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';
import { ImageToolbar } from '../components/ImageToolbar';
import type { VideoNodeData } from '../types/basicNode.types';

function formatFileSize(bytes?: number): string {
  if (!bytes) return '等待上传视频文件';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function VideoNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const nodeData = data as VideoNodeData;
  const label = nodeData.label || t('canvas.nodeLabels.video');

  const updateData = useCallback(
    (patch: Partial<VideoNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...patch } }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (nodeData.videoUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(nodeData.videoUrl);
      }

      updateData({
        videoUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileSize: file.size,
        duration: undefined,
      });
      event.target.value = '';
    },
    [nodeData.videoUrl, updateData],
  );

  const handleDuplicateNode = useCallback(() => {
    nodeData.onDuplicateNode?.(id);
  }, [id, nodeData]);

  const handleDeleteNode = useCallback(() => {
    nodeData.onDeleteNode?.(id);
  }, [id, nodeData]);

  const handleDownload = useCallback(() => {
    if (!nodeData.videoUrl) return;
    const link = document.createElement('a');
    link.href = nodeData.videoUrl;
    link.download = nodeData.fileName || `video-node-${id}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [id, nodeData.fileName, nodeData.videoUrl]);

  const toolbarActions = [
    { icon: Maximize2, label: t('imageNode.fullscreen'), action: () => setShowFullscreen(true), disabled: !nodeData.videoUrl },
    { icon: Copy, label: t('common.createCopy'), action: handleDuplicateNode },
    { icon: Download, label: t('common.download'), action: handleDownload, disabled: !nodeData.videoUrl },
    { icon: RefreshCw, label: t('common.replace'), action: () => inputRef.current?.click() },
    { icon: Trash2, label: t('common.delete'), action: handleDeleteNode, danger: true },
  ];

  return (
    <div className="relative">
      {selected && (
        <div
          className="absolute z-20 flex justify-center"
          style={{
            top: -80 / zoom,
            left: 130,
            transform: `translateX(-50%) scale(${inverseScale})`,
            transformOrigin: 'top center',
          }}
        >
          <ImageToolbar actions={toolbarActions} />
        </div>
      )}
      <NodeShell label={label} selected={selected}>
        <div className="w-[260px] px-4 py-3.5">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/55">
              <Film className="h-3.5 w-3.5" />
            </span>
            <input
              value={label}
              onChange={(event) => updateData({ label: event.target.value })}
              onKeyDown={(event) => event.stopPropagation()}
              className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[13px] font-medium text-white/90 outline-none placeholder:text-white/30"
              aria-label={t('common.rename')}
            />
          </div>

          <div className="nodrag nowheel relative flex h-[128px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-[#0f1219] text-white/45">
            {nodeData.videoUrl ? (
              <video
                src={nodeData.videoUrl}
                controls
                preload="metadata"
                onLoadedMetadata={(event) => updateData({ duration: event.currentTarget.duration })}
                className="nodrag nowheel h-full w-full object-cover"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              />
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 transition hover:bg-white/[0.025] hover:text-white/70"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.04]">
                  <Play className="h-4 w-4 fill-current" />
                </span>
                <span className="text-[12px]">上传视频或预览素材</span>
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[11px] text-white/62">
                {nodeData.fileName || '暂无视频文件'}
              </div>
              <div className="mt-0.5 text-[10px] text-white/32">
                {formatFileSize(nodeData.fileSize)}
                {nodeData.duration ? ` · ${nodeData.duration.toFixed(1)}s` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="nodrag nowheel inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 text-[11px] text-white/62 transition hover:bg-white/[0.08] hover:text-white/85"
            >
              <Upload className="h-3 w-3" />
              上传
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </NodeShell>
      <div
        className="image-node-handle input-port"
        data-port-type="input"
        data-data-type="video"
        data-handle-id="left-target"
        data-handle-type="target"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          event.nativeEvent.stopImmediatePropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          nodeData.onStartLineDraw?.(
            id,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            'left-target',
            'target',
          );
        }}
        style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(20,20,26,0.55)',
          border: '1.5px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        }}
      >
        <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
      <div
        className="image-node-handle output-port"
        data-port-type="output"
        data-data-type="video"
        data-handle-id="right-source"
        data-handle-type="source"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          event.nativeEvent.stopImmediatePropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          nodeData.onStartLineDraw?.(
            id,
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            'right-source',
            'source',
          );
        }}
        style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translate(50%, -50%)',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: 'rgba(20,20,26,0.55)',
          border: '1.5px solid rgba(255,255,255,0.25)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        }}
      >
        <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%', pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%', pointerEvents: 'none' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%', pointerEvents: 'none' }}
      />
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%', pointerEvents: 'none' }}
      />
      {showFullscreen && nodeData.videoUrl && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-8"
          onClick={() => setShowFullscreen(false)}
        >
          <div
            className="relative w-[min(960px,92vw)] overflow-hidden rounded-[18px] border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowFullscreen(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white/72 transition hover:bg-black/70 hover:text-white"
              aria-label={t('common.close')}
            >
              <X className="h-4 w-4" />
            </button>
            <video src={nodeData.videoUrl} controls autoPlay className="max-h-[82vh] w-full bg-black" />
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
