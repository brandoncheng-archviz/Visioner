import { Image, Plus } from 'lucide-react';
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react';
import {
  IMAGE_NODE_PREVIEW_WIDTH,
  IMAGE_NODE_MIN_IMAGE_SIZE,
  IMAGE_NODE_MAX_IMAGE_WIDTH,
  IMAGE_NODE_MAX_IMAGE_HEIGHT,
} from '../constants/canvasConstants';
import { UpscaleParamPanel } from '../components/UpscaleParamPanel';

export function UpscaleNode({ data, selected, id }: NodeProps) {
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);
  const displayImage = data.image as string | undefined;
  const sourceWidth = (data.width as number) || 1;
  const sourceHeight = (data.height as number) || 1;

  const cardWidth = displayImage
    ? Math.round(
        sourceWidth *
          Math.min(
            IMAGE_NODE_MAX_IMAGE_WIDTH / sourceWidth,
            IMAGE_NODE_MAX_IMAGE_HEIGHT / sourceHeight,
            Math.max(IMAGE_NODE_MIN_IMAGE_SIZE / sourceWidth, IMAGE_NODE_MIN_IMAGE_SIZE / sourceHeight),
          ),
      )
    : IMAGE_NODE_PREVIEW_WIDTH;
  const cardHeight = 240;

  return (
    <div className="relative group/upscale" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {/* Title label */}
      <div className="absolute z-20" style={{ top: -20 / zoom, left: 0, width: cardWidth * zoom, transform: `scale(${inverseScale})`, transformOrigin: 'top left' }}>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{(data.label as string) || '高清'}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative" style={{ width: cardWidth }}>
        <div
          className="node-preview-card w-full rounded-[16px] flex items-center justify-center transition-all overflow-hidden"
          style={{
            width: cardWidth,
            height: cardHeight,
            background: '#1a1a1a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            配置参数生成高清图像
          </span>
        </div>

        {/* Left visual handle — Input */}
        <div
          className="image-node-handle input-port"
          data-port-type="input"
          data-data-type="image"
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 28,
            height: 28,
            background: 'rgba(20,20,26,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        {/* Right visual handle — Output */}
        <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="image"
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            e.nativeEvent.stopImmediatePropagation();
            const onStart = data.onStartLineDraw as ((nodeId: string, x: number, y: number) => void) | undefined;
            if (!onStart) return;
            const rect = e.currentTarget.getBoundingClientRect();
            onStart(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
          }}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translate(50%, -50%)',
            width: 28,
            height: 28,
            background: 'rgba(20,20,26,0.45)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        {/* React Flow handles */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />
      </div>

      {/* Param panel — shown when selected and only this node is selected */}
      {selected && selectedNodeCount === 1 && (
        <div
          className="absolute"
          style={{
            left: -(320 - cardWidth) / 2,
            top: cardHeight + 12 / zoom,
            width: 320,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top center',
            zIndex: 20,
          }}
        >
          <UpscaleParamPanel />
        </div>
      )}
    </div>
  );
}
