import { useState, useMemo, useCallback, useEffect, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';
import { SunSkyNodeControls } from '../nodes/SunSkyNode/SunSkyNodeControls';
import { SunSkyNodeInfo } from '../nodes/SunSkyNode/SunSkyNodeInfo';
import { resolveSunSkyDerived } from '../nodes/SunSkyNode/resolveSunSkyDerived';
import { clamp, snapToStep } from '../nodes/SunSkyNode/sunSkyNode.utils';
import type { SunSkyNodeDerived } from '../nodes/SunSkyNode/sunSkyNode.types';

interface LightPreviewPanelProps {
  initialSun?: { elevation: number; azimuth: number };
  onApply: (sun: { elevation: number; azimuth: number }, derived: SunSkyNodeDerived) => void;
  onClear: () => void;
  onClose: () => void;
}

export function LightPreviewPanel({
  initialSun,
  onApply,
  onClear,
  onClose,
}: LightPreviewPanelProps) {
  const [elevation, setElevation] = useState(initialSun?.elevation ?? 12);
  const [azimuth, setAzimuth] = useState(initialSun?.azimuth ?? 55);

  const derived = useMemo(() => {
    const normalizedElevation = snapToStep(clamp(elevation, 0, 90), 3);
    const normalizedAzimuth = snapToStep(clamp(azimuth, 0, 360), 5);
    return resolveSunSkyDerived({ elevation: normalizedElevation, azimuth: normalizedAzimuth });
  }, [elevation, azimuth]);

  const handleElevationChange = useCallback((value: number) => {
    setElevation(value);
  }, []);

  const handleAzimuthChange = useCallback((value: number) => {
    setAzimuth(value);
  }, []);

  const handleReset = useCallback(() => {
    setElevation(12);
    setAzimuth(55);
  }, []);

  const handleApply = useCallback(() => {
    const normalizedElevation = snapToStep(clamp(elevation, 0, 90), 3);
    const normalizedAzimuth = snapToStep(clamp(azimuth, 0, 360), 5);
    const finalDerived = resolveSunSkyDerived({ elevation: normalizedElevation, azimuth: normalizedAzimuth });
    onApply({ elevation: normalizedElevation, azimuth: normalizedAzimuth }, finalDerived);
  }, [elevation, azimuth, onApply]);

  const stopPanelEvent = useCallback((event: SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center nodrag nopan nowheel"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={stopPanelEvent}
      onWheelCapture={stopPanelEvent}
      onPointerDown={stopPanelEvent}
      onPointerMove={stopPanelEvent}
      onMouseDown={stopPanelEvent}
      onTouchStart={stopPanelEvent}
      onTouchMove={stopPanelEvent}
    >
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden nodrag nopan nowheel"
        style={{
          width: 560,
          maxHeight: 'calc(100vh - 64px)',
          background: '#14141a',
          border: '1px solid #2a2a35',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
        }}
        onClick={stopPanelEvent}
        onWheel={stopPanelEvent}
        onWheelCapture={stopPanelEvent}
        onPointerDown={stopPanelEvent}
        onPointerMove={stopPanelEvent}
        onMouseDown={stopPanelEvent}
        onTouchStart={stopPanelEvent}
        onTouchMove={stopPanelEvent}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <div className="min-w-0">
            <div className="text-[16px] font-semibold text-white/90 truncate">光影预览 / Light Preview</div>
            <div className="mt-1 text-[12px] text-white/45 truncate">
              {derived.timeLabel} · {derived.directionLabel}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/[0.07] hover:text-white/78"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              title="重置"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-white/[0.07] hover:text-white/78"
              style={{ color: 'rgba(255,255,255,0.45)' }}
              title="关闭"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Preview */}
          <div className="relative overflow-hidden rounded-xl bg-[#0f1219]" style={{ height: 210 }}>
            <img
              src={derived.previewImagePath}
              alt="光影预览"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>

          {/* Controls */}
          <SunSkyNodeControls
            elevation={elevation}
            azimuth={azimuth}
            directionLabel={derived.directionLabel}
            onElevationChange={handleElevationChange}
            onAzimuthChange={handleAzimuthChange}
          />

          {/* Info */}
          <SunSkyNodeInfo elevation={elevation} azimuth={azimuth} derived={derived} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] flex-shrink-0">
          <button
            type="button"
            onClick={() => { onClear(); onClose(); }}
            className="text-[13px] font-medium transition hover:text-white/80"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            清除
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-[13px] font-medium transition hover:bg-white/[0.07]"
              style={{ color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.04)' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg px-5 py-2 text-[13px] font-medium transition hover:brightness-110"
              style={{ color: '#fff', background: '#208cff' }}
            >
              应用
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
