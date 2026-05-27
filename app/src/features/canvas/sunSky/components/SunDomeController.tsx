import { useRef, useCallback, useState, useEffect } from 'react';
import { clamp, snapToStep } from '../utils/sunSkyMath';

export interface SunDomeControllerProps {
  elevation: number;
  azimuth: number;
  skyTopColor: string;
  skyHorizonColor: string;
  sunColor: string;
  onChange: (elevation: number, azimuth: number) => void;
}

export function SunDomeController({
  elevation,
  azimuth,
  skyTopColor,
  skyHorizonColor,
  sunColor,
  onChange,
}: SunDomeControllerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);

  const size = 220;
  const centerX = size / 2;
  const centerY = size / 2 + 10;
  const radius = 90;

  // Convert elevation/azimuth to SVG coordinates (hemisphere projection)
  // Elevation 0° = bottom of semicircle, 90° = center
  // Azimuth 0° = front (bottom center going up), but let's map: 0° at bottom center, rotate clockwise
  const getSunPosition = useCallback((elev: number, azim: number) => {
    const e = clamp(elev, 0, 90);
    const a = ((azim + 180) % 360); // Rotate so 0° front is at bottom
    const rad = (a * Math.PI) / 180;
    const r = (1 - e / 90) * radius;
    const x = centerX + r * Math.sin(rad);
    const y = centerY - r * Math.cos(rad);
    return { x, y };
  }, [centerX, centerY, radius]);

  const sunPos = getSunPosition(elevation, azimuth);

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const dx = x - centerX;
      const dy = centerY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) return;

      // Calculate elevation from distance (closer to center = higher)
      const rawElevation = (1 - dist / radius) * 90;
      // Calculate azimuth from angle
      let rawAzimuth = (Math.atan2(dx, dy) * 180) / Math.PI;
      rawAzimuth = (rawAzimuth - 180 + 360) % 360;

      const newElevation = snapToStep(clamp(rawElevation, 0, 90), 5);
      const newAzimuth = snapToStep(clamp(rawAzimuth, 0, 355), 5);

      onChange(newElevation, newAzimuth);
    },
    [onChange, centerX, centerY, radius],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      e.preventDefault();
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleUp = () => {
      setDragging(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, handlePointerMove]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    handlePointerMove(e.clientX, e.clientY);
  };

  // Direction tick labels
  const tickLabels = [
    { angle: 0, label: '前', offset: { x: 0, y: 14 } },
    { angle: 45, label: '右前', offset: { x: 10, y: 10 } },
    { angle: 90, label: '右', offset: { x: 14, y: 0 } },
    { angle: 135, label: '右后', offset: { x: 10, y: -10 } },
    { angle: 180, label: '后', offset: { x: 0, y: -14 } },
    { angle: 225, label: '左后', offset: { x: -10, y: -10 } },
    { angle: 270, label: '左', offset: { x: -14, y: 0 } },
    { angle: 315, label: '左前', offset: { x: -10, y: 10 } },
  ];

  // Elevation ring labels
  const elevationRings = [15, 30, 45, 60, 75];

  return (
    <div className="select-none">
      <svg
        ref={svgRef}
        width={size}
        height={size + 20}
        className="cursor-crosshair"
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <defs>
          <radialGradient id="skyGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={skyTopColor} />
            <stop offset="100%" stopColor={skyHorizonColor} />
          </radialGradient>
          <filter id="sunGlow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Hemisphere background */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="url(#skyGradient)"
          stroke="#2a2a35"
          strokeWidth={1.5}
          opacity={0.9}
        />

        {/* Elevation rings */}
        {elevationRings.map((elev) => {
          const r = (1 - elev / 90) * radius;
          return (
            <circle
              key={elev}
              cx={centerX}
              cy={centerY}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          );
        })}

        {/* Direction ticks */}
        {tickLabels.map((tick) => {
          const a = ((tick.angle + 180) * Math.PI) / 180;
          const tx = centerX + (radius + 10) * Math.sin(a);
          const ty = centerY - (radius + 10) * Math.cos(a);
          return (
            <text
              key={tick.angle}
              x={tx + tick.offset.x}
              y={ty + tick.offset.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#6a6a7a"
              fontSize={10}
            >
              {tick.label}
            </text>
          );
        })}

        {/* Elevation labels on left */}
        {[0, 30, 60, 90].map((elev) => {
          const r = (1 - elev / 90) * radius;
          return (
            <text
              key={elev}
              x={centerX - radius - 8}
              y={centerY - r}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#6a6a7a"
              fontSize={9}
            >
              {elev}°
            </text>
          );
        })}

        {/* Sun position */}
        <circle
          cx={sunPos.x}
          cy={sunPos.y}
          r={8}
          fill={sunColor}
          filter="url(#sunGlow)"
          stroke="#fff"
          strokeWidth={1.5}
          style={{ pointerEvents: 'none' }}
        />
        <circle
          cx={sunPos.x}
          cy={sunPos.y}
          r={3}
          fill="#fff"
          style={{ pointerEvents: 'none' }}
        />
      </svg>

      {/* Current values */}
      <div className="flex justify-center gap-4 mt-1 text-xs text-[#6a6a7a]">
        <span>高度 {elevation}°</span>
        <span>方位 {azimuth}°</span>
      </div>
    </div>
  );
}
