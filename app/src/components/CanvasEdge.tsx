import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BaseEdge,
  EdgeLabelRenderer,
  useReactFlow,
  useStore,
  type EdgeProps,
} from '@xyflow/react';
import { Unlink } from 'lucide-react';

export default function CanvasEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  source,
  target,
  selected,
  data,
}: EdgeProps) {
  const { t } = useTranslation();
  const { setEdges } = useReactFlow();
  const [hovered, setHovered] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const related = useStore((state) => (
    Boolean(state.nodeLookup.get(source)?.selected) || Boolean(state.nodeLookup.get(target)?.selected)
  ));
  const onDeleteEdge = (data as { onDeleteEdge?: (edgeId: string) => void } | undefined)?.onDeleteEdge;

  // Fixed-offset cubic bezier: control points offset 120px horizontally
  const edgePath = `M ${sourceX} ${sourceY} C ${sourceX + 120} ${sourceY}, ${targetX - 120} ${targetY}, ${targetX} ${targetY}`;

  const handleDisconnect = useCallback(() => {
    if (onDeleteEdge) onDeleteEdge(id);
    else setEdges((eds) => eds.filter((edge) => edge.id !== id));
    setContextMenu(null);
  }, [id, onDeleteEdge, setEdges]);

  const edgeStyle = selected
    ? { stroke: '#8F929C', strokeWidth: 2, opacity: 0.95 }
    : hovered
      ? { stroke: '#6F737D', strokeWidth: 1.75, opacity: 0.85 }
      : related
      ? { stroke: '#6F737D', strokeWidth: 1.75, opacity: 0.85 }
      : { stroke: '#3A3A42', strokeWidth: 1.5, opacity: 0.65 };
  const labelX = (sourceX + targetX) / 2;
  const labelY = (sourceY + targetY) / 2;

  return (
    <>
      {/* Visible edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...edgeStyle,
          filter: 'none',
          transition: 'stroke 120ms ease, opacity 120ms ease, stroke-width 120ms ease',
        }}
        className="react-flow__edge-path"
      />

      {/* Keep the transparent interaction path above the visible path in SVG hit-test order. */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={14}
        className="react-flow__edge-interaction"
        style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setContextMenu({ x: event.clientX, y: event.clientY });
        }}
      />

      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-[#252526] text-white/65 transition-colors hover:bg-[#303034] hover:text-white"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              cursor: 'pointer',
              zIndex: 1000,
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              handleDisconnect();
            }}
            aria-label={t('canvasEdge.disconnect')}
            title={t('canvasEdge.disconnect')}
          >
            <Unlink className="h-3 w-3" />
          </button>
        </EdgeLabelRenderer>
      )}

      {contextMenu && (
        <EdgeLabelRenderer>
          <div
            className="fixed inset-0 z-[99]"
            style={{ pointerEvents: 'all' }}
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-[100] rounded-lg border border-[#2a2a35] bg-[#252530] py-1.5"
            style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 140, pointerEvents: 'all' }}
          >
            <button
              type="button"
              onClick={handleDisconnect}
              className="w-full px-3 py-2 text-left text-[13px] text-[#ef4444] transition-colors hover:bg-[rgba(239,68,68,0.1)]"
            >
              {t('canvasEdge.disconnect')}
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
