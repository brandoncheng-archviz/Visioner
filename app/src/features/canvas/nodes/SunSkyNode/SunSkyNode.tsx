import { useCallback, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Link2, MoreVertical, RotateCcw, Sun } from 'lucide-react';
import { Handle, Position, useStore, useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import type { SunSkyNodeData } from './sunSkyNode.types';
import { resolveSunSkyDerived } from './resolveSunSkyDerived';
import { SunSkyNodePreview } from './SunSkyNodePreview';
import { SunSkyNodeControls } from './SunSkyNodeControls';
import { SunSkyNodeInfo } from './SunSkyNodeInfo';
import { clamp, clampDisplayAzimuth, sameStringList, snapToStep } from './sunSkyNode.utils';

const NODE_WIDTH = 760;

function stopControlEvent(event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>) {
  event.stopPropagation();
}

function createDefaultSunSkyData(): SunSkyNodeData {
  const elevation = 12;
  const azimuth = 55;
  return {
    sun: { elevation, azimuth },
    derived: resolveSunSkyDerived({ elevation, azimuth }),
    linkedImageNodeIds: [],
  };
}

function normalizeSun(sun: Partial<SunSkyNodeData['sun']>): SunSkyNodeData['sun'] {
  return {
    elevation: snapToStep(clamp(sun.elevation ?? 12, 3, 90), 3),
    azimuth: snapToStep(clampDisplayAzimuth(sun.azimuth ?? 55), 5),
  };
}

export function SunSkyNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);
  const inverseScale = 1 / zoom;
  const initializedRef = useRef(false);

  const sunSkyData = (data.sunSky as SunSkyNodeData | undefined) || createDefaultSunSkyData();
  const { elevation, azimuth } = sunSkyData.sun;
  const derived = sunSkyData.derived;
  const linkedImageNodeIds = useMemo(
    () =>
      allEdges
        .filter((edge) => edge.source === id || edge.target === id)
        .map((edge) => (edge.source === id ? edge.target : edge.source))
        .filter((nodeId) => allNodes.some((node) => node.id === nodeId && node.type === 'image')),
    [allEdges, allNodes, id],
  );

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

  useEffect(() => {
    if (sameStringList(sunSkyData.linkedImageNodeIds, linkedImageNodeIds)) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const current = (n.data.sunSky as SunSkyNodeData | undefined) || createDefaultSunSkyData();
        if (sameStringList(current.linkedImageNodeIds, linkedImageNodeIds)) return n;
        return {
          ...n,
          data: {
            ...n.data,
            sunSky: {
              ...current,
              linkedImageNodeIds,
            } as SunSkyNodeData,
          },
        };
      }),
    );
  }, [id, linkedImageNodeIds, setNodes, sunSkyData.linkedImageNodeIds]);

  useEffect(() => {
    const normalizedSun = normalizeSun(sunSkyData.sun);
    const normalizedDerived = resolveSunSkyDerived(normalizedSun);
    const isCurrent =
      sunSkyData.sun.elevation === normalizedSun.elevation &&
      sunSkyData.sun.azimuth === normalizedSun.azimuth &&
      sunSkyData.derived.previewImagePath === normalizedDerived.previewImagePath &&
      sunSkyData.derived.promptText === normalizedDerived.promptText;
    if (isCurrent) return;

    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                sunSky: {
                  ...sunSkyData,
                  sun: normalizedSun,
                  derived: normalizedDerived,
                } as SunSkyNodeData,
              },
            }
          : n,
      ),
    );
  }, [id, setNodes, sunSkyData]);

  const updateSunSky = useCallback(
    (partial: Partial<SunSkyNodeData['sun']>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const current = (n.data.sunSky as SunSkyNodeData | undefined) || createDefaultSunSkyData();
          const newSun = normalizeSun({ ...current.sun, ...partial });
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

  const handleReset = useCallback(() => {
    const defaults = createDefaultSunSkyData();
    setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, sunSky: defaults } } : n)));
  }, [id, setNodes]);

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
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <Sun className="h-7 w-7" style={{ color: '#f59e0b' }} />
              </div>
              <div className="min-w-0">
                <div className="truncate text-[24px] font-semibold leading-none text-white/90">太阳天空 / Sun & Sky</div>
                <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[12px] text-white/42">
                  <span className="truncate">{derived.timeLabel}</span>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="truncate">{derived.directionLabel}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1 text-white/42">
              <button
                type="button"
                className="nodrag nowheel flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/[0.07] hover:text-white/78"
                title="重置太阳天空"
                onPointerDown={stopControlEvent}
                onClick={(event) => {
                  stopControlEvent(event);
                  handleReset();
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button type="button" className="nodrag nowheel flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/[0.07] hover:text-white/78" onPointerDown={stopControlEvent} title="更多">
                <MoreVertical className="h-5 w-5" />
              </button>
              <button type="button" className="nodrag nowheel flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/[0.07] hover:text-white/78" onPointerDown={stopControlEvent} title="收起">
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-5 px-4 pb-4">
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

            <SunSkyNodeInfo elevation={elevation} azimuth={azimuth} derived={derived} />

            {/* Linked images */}
            <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2 text-[15px] text-[#60a5fa]">
                <Link2 className="h-4 w-4" />
                <span>已连接 {linkedImageNodeIds.length} 张图</span>
              </div>
              <div className="flex items-center gap-3 text-[13px] text-white/45">
                <span className="rounded-lg border border-white/[0.07] bg-[#111722]/80 px-3 py-1.5">矩阵预览 12×8</span>
                <div className="grid h-8 w-16 overflow-hidden rounded-md border border-white/[0.08]" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {Array.from({ length: 8 }).map((_, index) => (
                    <span
                      key={index}
                      style={{
                        background: index % 2 === 0
                          ? 'linear-gradient(180deg, #88a9c9 0%, #d7c4a7 55%, #55504b 56%, #26282d 100%)'
                          : 'linear-gradient(180deg, #607d9c 0%, #cda36f 55%, #47433f 56%, #20242b 100%)',
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
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
