import type { ConnectionLineComponentProps } from '@xyflow/react';

export default function CustomConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  connectionStatus,
}: ConnectionLineComponentProps) {
  // Cubic Bezier: control point 1 offsets 120px to the right of start
  // control point 2 offsets 120px to the left of end
  const d = `M ${fromX} ${fromY} C ${fromX + 120} ${fromY}, ${toX - 120} ${toY}, ${toX} ${toY}`;

  const stroke = connectionStatus === 'valid' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)';

  return (
    <path
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      d={d}
      style={{ transition: 'stroke 150ms ease' }}
    />
  );
}
