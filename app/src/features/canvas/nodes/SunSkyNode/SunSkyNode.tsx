import { useCallback, useEffect, useRef } from 'react';
import { Sun, Link2 } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import type { SunSkyNodeData } from './sunSkyNode.types';
import { resolveSunSkyDerived } from './resolveSunSkyDerived';
import { SunSkyNodePreview } from './SunSkyNodePreview';
import { SunSkyNodeControls } from './SunSkyNodeControls';
import { SunSkyNodeInfo } from './SunSkyNodeInfo';

const NODE_WIDTH = 320;

function createDefaultSunSkyData(): SunSkyNodeData {
  const elevation = 12;
  const azimuth = 55;
  return {
    sun: { elevation, azimuth },
    derived: resolveSunSkyDerived({ elevation, azimuth }),
    linkedImageNodeIds: [],
  };
}

export function SunSkyNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const initializedRef = useRef(false);

  const sunSkyData = (data.sunSky as SunSkyNodeData | undefined) || createDefaultSunSkyData();
  const { elevation, azimuth } = sunSkyData.sun;
  const derived = sunSkyData.derived;
  const linkedImageNodeIds = sunSkyData.linkedImageNodeIds;

  // Self-initialize if sunSky data is missing from node.data
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (data.sunSky) return;
    const defaults = createDefaultSunSkyData();
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, sunSky: defaults } }
          : n,
      ),
    );
  }, [data.sunSky, id, setNodes]);

  const updateSunSky = useCallback(
    (partial: Partial<SunSkyNodeData['sun']>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const current = (n.data.sunSky as SunSkyNodeData | undefined) || createDefaultSunSkyData();
          const newSun = { ...current.sun, ...partial };
          const newDerived = resolveSunSkyDerived(newSun);
          return {
            ...n,
            data: {
              ...n.data,
              sunSky: {
                ...current,
                sun: newSun,
                derived: newDerived,
              } as SunSkyNodeData,
            },
          };
        }),
      );
    },
    [id, setNodes],
  );

  const handleElevationChange = useCallback(
    (value: number) => updateSunSky({ elevation: value }),
    [updateSunSky],
  );

  const handleAzimuthChange = useCallback(
    (value: number) => updateSunSky({ azimuth: value }),
    [updateSunSky],
  );

  return (
    <div className="relative group/sunsky" style={{ zIndex: selected ? 100 : 1, width: NODE_WIDTH, cursor: 'default' }}>
      {/* Title label */}
      <div
        className="absolute z-20"
        style={{
          top: -20 / zoom,
          left: 0,
          width: NODE_WIDTH * zoom,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <Sun className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{(data.label as string) || t('canvas.nodeLabels.sunSky')}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative" style={{ width: NODE_WIDTH }}>
        <div
          className="w-full overflow-hidden rounded-[16px] transition-all"
          style={{
            width: NODE_WIDTH,
            background: '#14141a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: 'rgba(245,158,11,0.15)' }}>
              <Sun className="h-4 w-4" style={{ color: '#f59e0b' }} />
            </div>
            <span className="text-sm font-semibold text-white/90">太阳天空</span>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-4 p-4">
            {/* Preview */}
            <SunSkyNodePreview imagePath={derived.previewImagePath} />

            {/* Controls */}
            <SunSkyNodeControls
              elevation={elevation}
              azimuth={azimuth}
              directionLabel={derived.directionLabel}
              onElevationChange={handleElevationChange}
              onAzimuthChange={handleAzimuthChange}
            />

            {/* Info */}
            <div className="h-px bg-white/[0.06]" />
            <SunSkyNodeInfo elevation={elevation} azimuth={azimuth} derived={derived} />

            {/* Linked images */}
            {linkedImageNodeIds.length > 0 && (
              <>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex items-center gap-2 text-xs text-white/55">
                  <Link2 className="h-3.5 w-3.5" />
                  <span>已连接 {linkedImageNodeIds.length} 张图片</span>
                </div>
              </>
            )}
          </div>
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
          <span style={{ width: 14, height: 14, color: 'white', fontSize: 16, lineHeight: 1 }}>+</span>
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
          <span style={{ width: 14, height: 14, color: 'white', fontSize: 16, lineHeight: 1 }}>+</span>
        </div>

        {/* React Flow handles */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />
      </div>
    </div>
  );
}
