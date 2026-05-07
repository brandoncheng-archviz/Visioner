import { useCallback, useState } from 'react';
import {
  BaseEdge,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';

export default function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Fixed-offset cubic bezier: control points offset 120px horizontally
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX + 120} ${sourceY}, ${targetX - 120} ${targetY}, ${targetX} ${targetY}`;

  const handleDisconnect = useCallback(() => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
    setContextMenu(null);
  }, [id, setEdges]);

  const strokeWidth = selected ? 2 : 1.5;
  const opacity = selected ? 1 : hovered ? 0.7 : 0.5;

  return (
    <>
      {/* Invisible wider hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={12}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setContextMenu({ x: e.clientX, y: e.clientY });
        }}
      />

      {/* Visible edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#4a4a5a',
          strokeWidth,
          opacity,
          transition: 'opacity 150ms ease, stroke-width 150ms ease',
        }}
        className="react-flow__edge-path"
      />

      {/* Right-click context menu */}
      {contextMenu && (
        <div
          className="fixed z-[100] py-1.5 rounded-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
            background: '#252530',
            border: '1px solid #2a2a35',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: 140,
          }}
        >
          <button
            onClick={handleDisconnect}
            className="w-full px-3 py-2 text-left text-[13px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
          >
            断开连接
          </button>
        </div>
      )}
      {contextMenu && (
        <div className="fixed inset-0 z-[99]" onClick={() => setContextMenu(null)} />
      )}
    </>
  );
}
