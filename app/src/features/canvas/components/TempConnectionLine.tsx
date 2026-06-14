import { useStore } from '@xyflow/react';
import type { TempConnectionState } from '../types/canvas.types';

export function TempConnectionLine({ tempLine }: { tempLine: TempConnectionState | null }) {
  // Subscribe to viewport changes so the temp line re-queries DOM positions on pan/zoom.
  // This is isolated to this tiny component so it does NOT cause the whole FlowCanvas to re-render.
  useStore((state) => state.transform);

  if (!tempLine) return null;

  const sourceNode = document.querySelector(`.react-flow__node[data-id="${tempLine.sourceNodeId}"]`);
  const sNode = sourceNode?.querySelector(
    `[data-handle-id="${tempLine.sourceHandleId}"], .react-flow__handle[data-handleid="${tempLine.sourceHandleId}"], ${
      tempLine.sourceHandleType === 'source' ? '.image-node-handle.output-port' : '.image-node-handle.input-port'
    }`,
  );
  if (!sNode) return null;
  const sRect = sNode.getBoundingClientRect();
  const sx = sRect.left + sRect.width / 2;
  const sy = sRect.top + sRect.height / 2;

  const isLeftSource = tempLine.sourceHandleId.startsWith('left-');
  const offset = Math.max(Math.abs(tempLine.currentX - sx) * 0.4, 40);
  const dx = isLeftSource ? -offset : offset;

  return (
    <svg className="absolute inset-0 z-50 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <path
        d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${tempLine.currentX - dx} ${tempLine.currentY}, ${tempLine.currentX} ${tempLine.currentY}`}
        stroke="rgba(190,194,204,0.52)"
        strokeWidth="1.25"
        fill="none"
      />
    </svg>
  );
}
