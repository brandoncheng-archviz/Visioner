import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  SelectionMode,
  useReactFlow,
  type Node,
  type Edge,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TextNode } from '../nodes/TextNode';
import { VideoNode } from '../nodes/VideoNode';
import { AudioNode } from '../nodes/AudioNode';
import { ScriptNode } from '../nodes/ScriptNode';
import { VideoMergeNode } from '../nodes/VideoMergeNode';
import { UpscaleNode } from '../nodes/UpscaleNode';
import { ImageNode } from '../nodes/ImageNode';
import { CompareNode } from '../nodes/CompareNode';
import { SunSkyNode } from '../nodes/SunSkyNode';
import { RelightNode } from '../nodes/RelightNode';
import { TempConnectionLine } from './TempConnectionLine';
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM } from '../constants/canvasConstants';
import type { TempConnectionState } from '../types/canvas.types';

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  upscale: UpscaleNode,
  compare: CompareNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
  'video-merge': VideoMergeNode,
  sunSky: SunSkyNode,
  relight: RelightNode,
};

export interface CanvasStageProps {
  tempLine: TempConnectionState | null;
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
  const { t } = useTranslation();
  const { getViewport, setViewport } = useReactFlow();

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      // Ignore wheel events from MiniMap and Controls
      const target = event.target as HTMLElement;
      if (target.closest('.react-flow__minimap') || target.closest('.react-flow__controls')) {
        return;
      }

      const { deltaX, deltaY, ctrlKey, metaKey, shiftKey, clientX, clientY } = event;
      const current = getViewport();

      if (ctrlKey || metaKey) {
        const normalizedDeltaY =
          event.deltaMode === 1 ? deltaY * 16 : event.deltaMode === 2 ? deltaY * 800 : deltaY;
        const isMouseWheel = Math.abs(normalizedDeltaY) >= 50;
        const zoomSpeed = isMouseWheel ? 0.1 : 0.01;
        const rawFactor = Math.exp(-normalizedDeltaY * zoomSpeed);
        const factor = Math.min(1.08, Math.max(0.92, rawFactor));
        const newZoom = Math.min(Math.max(current.zoom * factor, CANVAS_MIN_ZOOM), CANVAS_MAX_ZOOM);
        const zoomRatio = newZoom / current.zoom;
        const newX = clientX - (clientX - current.x) * zoomRatio;
        const newY = clientY - (clientY - current.y) * zoomRatio;
        setViewport({ x: newX, y: newY, zoom: newZoom }, { duration: 0 });
      } else if (shiftKey) {
        // Horizontal pan ( Shift + wheel )
        const newX = current.x - deltaY;
        setViewport({ x: newX, y: current.y, zoom: current.zoom }, { duration: 0 });
      } else {
        // Free pan (mouse wheel vertical / trackpad two-finger)
        const newX = current.x - deltaX;
        const newY = current.y - deltaY;
        setViewport({ x: newX, y: newY, zoom: current.zoom }, { duration: 0 });
      }
    },
    [getViewport, setViewport],
  );

  const handleWheelCapture = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest('.nowheel')) return;

      event.preventDefault();
      handleWheel(event.nativeEvent);
    },
    [handleWheel],
  );

  return (
    <div
      className="absolute inset-0 h-full min-h-0 w-full overflow-hidden"
      style={{ cursor: tempLine ? 'crosshair' : 'default' }}
      onContextMenu={onContextMenu}
      onWheelCapture={handleWheelCapture}
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
            {t('canvas.dragImageHere')}
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
        className="h-full w-full"
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
        zoomOnPinch={false}
        zoomOnScroll={false}
        panOnScroll={false}
        fitView
        fitViewOptions={{ maxZoom: 1 }}
        minZoom={CANVAS_MIN_ZOOM}
        maxZoom={CANVAS_MAX_ZOOM}
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
