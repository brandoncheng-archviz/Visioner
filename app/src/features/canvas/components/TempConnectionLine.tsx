import { useStore } from '@xyflow/react';

export function TempConnectionLine({ tempLine }: { tempLine: { sourceNodeId: string; currentX: number; currentY: number } | null }) {
  // Subscribe to viewport changes so the temp line re-queries DOM positions on pan/zoom.
  // This is isolated to this tiny component so it does NOT cause the whole FlowCanvas to re-render.
  useStore((state) => state.transform);

  if (!tempLine) return null;

  const sNode = document.querySelector(`.react-flow__node[data-id="${tempLine.sourceNodeId}"] .output-port`);
  if (!sNode) return null;
  const sRect = sNode.getBoundingClientRect();
  const sx = sRect.left + sRect.width / 2;
  const sy = sRect.top + sRect.height / 2;

  const offset = Math.max(Math.abs(tempLine.currentX - sx) * 0.4, 40);

  return (
    <svg className="absolute inset-0 z-50 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <path
        d={`M ${sx} ${sy} C ${sx + offset} ${sy}, ${tempLine.currentX - offset} ${tempLine.currentY}, ${tempLine.currentX} ${tempLine.currentY}`}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
