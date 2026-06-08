import { useState, useMemo, useCallback, useEffect, type SyntheticEvent } from 'react';
import { createPortal } from 'react-dom';
import { RotateCcw } from 'lucide-react';
import { createRelightLightPreview } from '../utils/relightSettings';
import { DEFAULT_RELIGHT_SETTINGS, DEFAULT_RELIGHT_SUN } from '../constants/relightPresets';
import { CANVAS_NODE_CONTROL_SCALE, IMAGE_NODE_CONTROL_WIDTH } from '../constants/canvasConstants';
import { clamp, snapToStep } from '../nodes/SunSkyNode/sunSkyNode.utils';
import type { RelightSettings, RelightPreset } from '../types/relight.types';
import type { LightPreviewData } from '../types/lightPreview.types';
import {
  RelightControlBody,
  RELIGHT_ADVANCED_PANEL_WIDTH,
  RELIGHT_CONTROL_PANEL_EXPANDED_HEIGHT,
  RELIGHT_CONTROL_PANEL_HEIGHT,
} from './RelightControlBody';

interface LightPreviewPanelProps {
  initialSun?: { elevation: number; azimuth: number };
  initialSettings?: RelightSettings;
  onApply: (data: LightPreviewData) => void;
  onClose: () => void;
}

export function LightPreviewPanel({
  initialSun,
  initialSettings,
  onApply,
  onClose,
}: LightPreviewPanelProps) {
  const [elevation, setElevation] = useState(initialSun?.elevation ?? DEFAULT_RELIGHT_SUN.elevation);
  const [azimuth, setAzimuth] = useState(initialSun?.azimuth ?? DEFAULT_RELIGHT_SUN.azimuth);
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
    setElevation(DEFAULT_RELIGHT_SUN.elevation);
    setAzimuth(DEFAULT_RELIGHT_SUN.azimuth);
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

  const panelWidth = IMAGE_NODE_CONTROL_WIDTH + (showAdvancedSettings ? RELIGHT_ADVANCED_PANEL_WIDTH : 0);
  const panelHeight = showAdvancedSettings
    ? RELIGHT_CONTROL_PANEL_EXPANDED_HEIGHT
    : RELIGHT_CONTROL_PANEL_HEIGHT;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center nodrag nopan nowheel"
      style={{ background: 'rgba(0,0,0,0.85)' }}
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
        className="relative flex flex-col overflow-hidden rounded-[18px] border transition-[width] duration-300 ease-out nodrag nopan nowheel"
        style={{
          width: panelWidth,
          minHeight: panelHeight,
          maxHeight: 'calc(100vh - 64px)',
          background: '#252526',
          borderColor: 'rgba(255,255,255,0.08)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.42)',
          transform: `scale(${CANVAS_NODE_CONTROL_SCALE})`,
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
        <RelightControlBody
          lightPreview={lightPreview}
          elevation={elevation}
          azimuth={azimuth}
          settings={settings}
          showAdvancedSettings={showAdvancedSettings}
          onToggleAdvancedSettings={() => setShowAdvancedSettings((current) => !current)}
          onElevationChange={handleElevationChange}
          onAzimuthChange={handleAzimuthChange}
          onSettingsChange={handleSettingsChange}
          onPresetSelect={handlePresetSelect}
        />

        {/* Footer */}
        <div className="flex min-h-[72px] flex-shrink-0 items-center justify-between border-t border-white/[0.06] px-5 py-3">
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
