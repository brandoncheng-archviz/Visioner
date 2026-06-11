import { useStore } from '@xyflow/react';

export function TempConnectionLine({ tempLine }: { tempLine: { sourceNodeId: string; sourceHandleId: string; currentX: number; currentY: number } | null }) {
  // Subscribe to viewport changes so the temp line re-queries DOM positions on pan/zoom.
  // This is isolated to this tiny component so it does NOT cause the whole FlowCanvas to re-render.
  useStore((state) => state.transform);

  if (!tempLine) return null;

  const sNode = document.querySelector(`.react-flow__node[data-id="${tempLine.sourceNodeId}"] [data-source-handle="${tempLine.sourceHandleId}"]`);
  if (!sNode) return null;
  const sRect = sNode.getBoundingClientRect();
  const sx = sRect.left + sRect.width / 2;
  const sy = sRect.top + sRect.height / 2;

  const isLeftSource = tempLine.sourceHandleId === 'left-source';
  const offset = Math.max(Math.abs(tempLine.currentX - sx) * 0.4, 40);
  const dx = isLeftSource ? -offset : offset;

  return (
    <svg className="absolute inset-0 z-50 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <path
        d={`M ${sx} ${sy} C ${sx + dx} ${sy}, ${tempLine.currentX - dx} ${tempLine.currentY}, ${tempLine.currentX} ${tempLine.currentY}`}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
