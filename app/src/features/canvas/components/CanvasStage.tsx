import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  SelectionMode,
  type Node,
  type Edge,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react';
import { TextNode } from '../nodes/TextNode';
import { VideoNode } from '../nodes/VideoNode';
import { AudioNode } from '../nodes/AudioNode';
import { ScriptNode } from '../nodes/ScriptNode';
import { VideoMergeNode } from '../nodes/VideoMergeNode';
import { UpscaleNode } from '../nodes/UpscaleNode';
import { ImageNode } from '../nodes/ImageNode';
import { TempConnectionLine } from './TempConnectionLine';

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  upscale: UpscaleNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
  'video-merge': VideoMergeNode,
};

export interface CanvasStageProps {
  tempLine: { sourceNodeId: string; currentX: number; currentY: number } | null;
  isDragOver: boolean;
  rejectTooltip: { x: number; y: number; message: string } | null;
  uploadToast: { msg: string; type: 'loading' | 'success' } | null;
  nodesWithCallbacks: Node[];
  edges: Edge[];
  snapGrid: boolean;
  showMinimap: boolean;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onNodesChange: OnNodesChange;
  onNodeContextMenu: (event: React.MouseEvent, node: Node) => void;
  onViewportChange: (viewport: Viewport) => void;
  onEdgeClick: (event: React.MouseEvent, edge: Edge) => void;
  onPaneClick: () => void;
  onSelectionStart: () => void;
  onSelectionEnd: () => void;
  onDragOverCapture: (event: React.DragEvent) => void;
  onDropCapture: (event: React.DragEvent) => void;
}

export function CanvasStage({
  tempLine,
  isDragOver,
  rejectTooltip,
  uploadToast,
  nodesWithCallbacks,
  edges,
  snapGrid,
  showMinimap,
  onContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
  onNodesChange,
  onNodeContextMenu,
  onViewportChange,
  onEdgeClick,
  onPaneClick,
  onSelectionStart,
  onSelectionEnd,
  onDragOverCapture,
  onDropCapture,
}: CanvasStageProps) {
  return (
    <div
      className="absolute inset-0"
      style={{ cursor: tempLine ? 'crosshair' : 'default' }}
      onContextMenu={onContextMenu}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drop overlay */}
      {isDragOver && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: 'rgba(10,10,15,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="px-6 py-4 rounded-2xl text-sm font-medium"
            style={{ background: '#252526', border: '1px solid #2a2a35', color: '#fff' }}
          >
            拖放图片或视频以上传
          </div>
        </div>
      )}

      {/* Temporary connection line (drawn while dragging from output port) */}
      <TempConnectionLine tempLine={tempLine} />

      {/* Connection rejected tooltip */}
      {rejectTooltip && (
        <div
          className="absolute z-50 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
          style={{
            left: rejectTooltip.x,
            top: rejectTooltip.y,
            transform: 'translate(-50%, -140%)',
            background: '#252526',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {rejectTooltip.message}
        </div>
      )}

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onNodeContextMenu={onNodeContextMenu}
        onViewportChange={onViewportChange}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onSelectionStart={onSelectionStart}
        onSelectionEnd={onSelectionEnd}
        onDragOverCapture={onDragOverCapture}
        onDropCapture={onDropCapture}
        nodeTypes={nodeTypes}
        snapToGrid={snapGrid}
        snapGrid={[24, 24]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        zoomOnPinch
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={4}
        attributionPosition="bottom-right"
        multiSelectionKeyCode={['Shift']}
      >
        <Background color={snapGrid ? 'rgba(42,42,53,0.6)' : '#2a2a35'} gap={24} size={1} variant={BackgroundVariant.Dots} />

        {/* MiniMap */}
        <Panel position="bottom-left" style={{ left: 16, bottom: 72, margin: 0 }}>
          <div
            className="transition-all duration-300 ease-out"
            style={{
              transform: showMinimap ? 'translateY(0)' : 'translateY(12px)',
              opacity: showMinimap ? 1 : 0,
              pointerEvents: showMinimap ? 'auto' : 'none',
            }}
          >
            <MiniMap
              style={{
                position: 'relative',
                left: 'auto',
                bottom: 'auto',
                right: 'auto',
                top: 'auto',
                width: 180,
                height: 120,
                background: '#252526',
                border: '1px solid #2a2a35',
                borderRadius: 12,
                margin: 0,
              }}
              nodeColor={() => '#3a3a4a'}
              maskColor="rgba(10, 10, 15, 0.7)"
              maskStrokeColor="rgba(255,255,255,0.3)"
              maskStrokeWidth={2}
            />
          </div>
        </Panel>
      </ReactFlow>

      {/* Upload status toast */}
      {uploadToast && (
        <div
          className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
          style={{
            background: '#252526',
            border: '1px solid #2a2a35',
            color: uploadToast.type === 'success' ? '#22c55e' : '#fff',
          }}
        >
          {uploadToast.type === 'loading' && (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          )}
          {uploadToast.type === 'success' && (
            <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          {uploadToast.msg}
        </div>
      )}
    </div>
  );
}
