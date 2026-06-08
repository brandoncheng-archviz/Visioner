import { useState, useMemo, useCallback, useEffect, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, ChevronRight } from 'lucide-react';
import { SunSkyNodeControls } from '../nodes/SunSkyNode/SunSkyNodeControls';
import { RelightAdvancedSettings } from './RelightAdvancedSettings';
import { createRelightLightPreview } from '../utils/relightSettings';
import { DEFAULT_RELIGHT_SETTINGS } from '../constants/relightPresets';
import { clamp, snapToStep } from '../nodes/SunSkyNode/sunSkyNode.utils';
import type { RelightSettings, RelightPreset } from '../types/relight.types';
import type { LightPreviewData } from '../types/lightPreview.types';

interface LightPreviewPanelProps {
  initialSun?: { elevation: number; azimuth: number };
  initialSettings?: RelightSettings;
  onApply: (data: LightPreviewData) => void;
  onClose: () => void;
}

const BASE_PANEL_WIDTH = 580;
const ADVANCED_PANEL_WIDTH = 340;
const PREVIEW_SIZE = 160;

export function LightPreviewPanel({
  initialSun,
  initialSettings,
  onApply,
  onClose,
}: LightPreviewPanelProps) {
  const [elevation, setElevation] = useState(initialSun?.elevation ?? 12);
  const [azimuth, setAzimuth] = useState(initialSun?.azimuth ?? 55);
  const [settings, setSettings] = useState<RelightSettings>(initialSettings ?? DEFAULT_RELIGHT_SETTINGS);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const lightPreview = useMemo(() => {
    const normalizedElevation = snapToStep(clamp(elevation, 0, 90), 3);
    const normalizedAzimuth = snapToStep(clamp(azimuth, 0, 360), 5);
    return createRelightLightPreview(
      { elevation: normalizedElevation, azimuth: normalizedAzimuth },
      settings,
    );
  }, [elevation, azimuth, settings]);

  const derived = lightPreview.derived;

  const handleElevationChange = useCallback((value: number) => {
    setElevation(value);
  }, []);

  const handleAzimuthChange = useCallback((value: number) => {
    setAzimuth(value);
  }, []);

  const handleSettingsChange = useCallback((nextSettings: RelightSettings) => {
    setSettings(nextSettings);
  }, []);

  const handlePresetSelect = useCallback((preset: RelightPreset) => {
    setElevation(preset.elevation);
    setAzimuth(preset.azimuth);
    setSettings({
      cloudAmount: preset.cloudAmount,
      fogLevel: preset.fogLevel,
      lightingPresetId: preset.id,
    });
  }, []);

  const handleReset = useCallback(() => {
    setElevation(12);
    setAzimuth(55);
    setSettings(DEFAULT_RELIGHT_SETTINGS);
  }, []);

  const handleApply = useCallback(() => {
    onApply(lightPreview);
  }, [lightPreview, onApply]);

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

  const panelWidth = BASE_PANEL_WIDTH + (showAdvancedSettings ? ADVANCED_PANEL_WIDTH : 0);

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
        className="relative flex flex-col overflow-hidden nodrag nopan nowheel"
        style={{
          width: panelWidth,
          maxHeight: 'calc(100vh - 64px)',
          background: '#252526',
          borderRadius: 18,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
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
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3 flex-shrink-0">
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-white/90">
              光影预览 / Light Preview
            </div>
            <div className="mt-1 truncate text-[12px] text-white/42">
              {derived.timeLabel} · {derived.directionLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-white/40 transition hover:bg-white/[0.06] hover:text-white/70"
            title="关闭"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            <div className="flex-shrink-0" style={{ width: BASE_PANEL_WIDTH }}>
              <div className="grid gap-3 px-5 py-3" style={{ gridTemplateColumns: `${PREVIEW_SIZE}px minmax(0, 1fr)` }}>
                <div
                  className="relative flex items-center justify-center overflow-hidden rounded-xl bg-[#0f1219]"
                  style={{ height: PREVIEW_SIZE }}
                >
                  <img
                    src={derived.previewImagePath}
                    alt="光影预览"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings((current) => !current)}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-white/55 transition hover:bg-white/[0.05] hover:text-white/78"
                    >
                      高级设置
                      <ChevronRight
                        className="h-3 w-3 transition-transform"
                        style={{ transform: showAdvancedSettings ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      />
                    </button>
                  </div>
                  <SunSkyNodeControls
                    elevation={elevation}
                    azimuth={azimuth}
                    layout="stacked"
                    onElevationChange={handleElevationChange}
                    onAzimuthChange={handleAzimuthChange}
                  />
                </div>
              </div>
            </div>
            {showAdvancedSettings && (
              <div className="flex-shrink-0" style={{ width: ADVANCED_PANEL_WIDTH }}>
                <RelightAdvancedSettings
                  settings={settings}
                  onSettingsChange={handleSettingsChange}
                  onPresetSelect={handlePresetSelect}
                />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.035] px-5 py-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-white/45 transition hover:bg-white/[0.04] hover:text-white/75"
          >
            <RotateCcw className="h-3 w-3" />
            重置
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-8 rounded-lg px-3.5 text-[12px] font-medium text-white/65 transition hover:bg-white/[0.07]"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="h-8 rounded-lg px-4 text-[12px] font-medium text-white transition hover:brightness-110"
              style={{ background: '#208cff' }}
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
