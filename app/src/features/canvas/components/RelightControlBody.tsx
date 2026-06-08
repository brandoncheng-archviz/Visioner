import { ChevronRight } from 'lucide-react';
import { IMAGE_NODE_CONTROL_WIDTH } from '../constants/canvasConstants';
import type { LightPreviewData } from '../types/lightPreview.types';
import type { RelightPreset, RelightSettings } from '../types/relight.types';
import { SunSkyNodeControls } from '../nodes/SunSkyNode/SunSkyNodeControls';
import { RelightAdvancedSettings } from './RelightAdvancedSettings';

export const RELIGHT_ADVANCED_PANEL_WIDTH = 340;
export const RELIGHT_CONTROL_PANEL_HEIGHT = 360;
export const RELIGHT_CONTROL_PANEL_EXPANDED_HEIGHT = 440;

interface RelightControlBodyProps {
  lightPreview: LightPreviewData;
  elevation: number;
  azimuth: number;
  settings: RelightSettings;
  showAdvancedSettings: boolean;
  onToggleAdvancedSettings: () => void;
  onElevationChange: (value: number) => void;
  onAzimuthChange: (value: number) => void;
  onSettingsChange: (settings: RelightSettings) => void;
  onPresetSelect: (preset: RelightPreset) => void;
}

export function RelightControlBody({
  lightPreview,
  elevation,
  azimuth,
  settings,
  showAdvancedSettings,
  onToggleAdvancedSettings,
  onElevationChange,
  onAzimuthChange,
  onSettingsChange,
  onPresetSelect,
}: RelightControlBodyProps) {
  return (
    <div className="flex">
      <div className="flex-shrink-0" style={{ width: IMAGE_NODE_CONTROL_WIDTH }}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold text-white/90">
              光影预览 / Light Preview
            </div>
            <div className="mt-1.5 truncate text-[13px] text-white/42">
              {lightPreview.derived.timeLabel} · {lightPreview.derived.directionLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleAdvancedSettings}
            className="ml-4 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-white/58 transition hover:bg-white/[0.05] hover:text-white/78"
          >
            高级设置
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        <div className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: '205px minmax(0, 1fr)' }}>
          <div className="relative flex h-[205px] items-center justify-center overflow-hidden rounded-xl bg-[#0f1219]">
            <img
              src={lightPreview.derived.previewImagePath}
              alt="光影预览"
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>
          <div className="min-w-0 space-y-3">
            <SunSkyNodeControls
              elevation={elevation}
              azimuth={azimuth}
              layout="stacked"
              onElevationChange={onElevationChange}
              onAzimuthChange={onAzimuthChange}
            />
          </div>
        </div>
      </div>

      {showAdvancedSettings && (
        <div className="flex-shrink-0" style={{ width: RELIGHT_ADVANCED_PANEL_WIDTH }}>
          <RelightAdvancedSettings
            settings={settings}
            onSettingsChange={onSettingsChange}
            onPresetSelect={onPresetSelect}
          />
        </div>
      )}
    </div>
  );
}
