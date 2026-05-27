import { useCallback, useState } from 'react';
import { ChevronUp, CircleHelp, Cloud, Clock, Compass, Droplets, RotateCcw, Sun, Waves, X } from 'lucide-react';
import type { SunSkyPreset, SunSkySnapshot, SunSkyState } from '../types/sunSky.types';
import { resolveSunSkyState } from '../utils/resolveSunSkyState';
import { SunSkyControls } from './SunSkyControls';
import { SunSkyDerivedInfo } from './SunSkyDerivedInfo';
import { SunSkyPresetList } from './SunSkyPresetList';
import { SunSkyPreview } from './SunSkyPreview';
import { SunSkySnapshotStrip } from './SunSkySnapshotStrip';

export interface SunSkyPanelProps {
  initialState?: SunSkyState;
  onClose: () => void;
  onChange?: (state: SunSkyState) => void;
}

function createDefaultState(): SunSkyState {
  return resolveSunSkyState({
    enabled: true,
    sun: { elevation: 12, azimuth: 225, size: 2.0 },
    time: { phase: 'golden_hour', userOverride: true },
    sky: { condition: 'clear', turbidity: 2.0, horizonBlur: 0.45 },
    atmosphere: { volumeEffect: 0.28, groundAlbedoMode: 'urban' },
    preview: { realtimeEnabled: false, previewResolution: 384 },
    source: { editedFromPreset: false },
  });
}

const SKY_LABELS: Record<string, string> = {
  clear: '晴天',
  partly_cloudy: '薄云',
  cloudy: '多云',
  overcast: '阴天',
  foggy: '雾天',
  hazy: '暖霾',
};

const TURBIDITY_LABELS = [
  { value: 2.0, label: '清澈' },
  { value: 3.0, label: '标准' },
  { value: 5.0, label: '轻雾' },
  { value: 8.0, label: '重雾' },
];

export function SunSkyPanel({ initialState, onClose, onChange }: SunSkyPanelProps) {
  const [state, setState] = useState<SunSkyState>(initialState || createDefaultState);
  const [snapshots, setSnapshots] = useState<SunSkySnapshot[]>([]);

  const commitState = useCallback(
    (nextState: SunSkyState) => {
      setState(nextState);
      onChange?.(nextState);
    },
    [onChange],
  );

  const handleStateUpdate = useCallback(
    (updates: Partial<SunSkyState> | ((prev: SunSkyState) => SunSkyState)) => {
      setState((prev) => {
        const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
        const resolved = resolveSunSkyState({
          enabled: next.enabled,
          sun: next.sun,
          time: { phase: next.time.phase, userOverride: next.time.userOverride },
          sky: next.sky,
          atmosphere: next.atmosphere,
          preview: next.preview,
          source: next.source,
        });
        onChange?.(resolved);
        return resolved;
      });
    },
    [onChange],
  );

  const handlePresetSelect = useCallback(
    (preset: SunSkyPreset) => {
      const resolved = resolveSunSkyState({
        enabled: true,
        sun: preset.sun,
        time: { phase: preset.time.phase, userOverride: true },
        sky: preset.sky,
        atmosphere: preset.atmosphere,
        preview: state.preview,
        source: { presetId: preset.id, editedFromPreset: false },
      });
      commitState(resolved);
    },
    [commitState, state.preview],
  );

  const handleReset = useCallback(() => {
    commitState(createDefaultState());
  }, [commitState]);

  const handleAddSnapshot = useCallback(() => {
    const snapshot: SunSkySnapshot = {
      id: `sunsky-snap-${Date.now()}`,
      previewResolution: state.preview.previewResolution,
      sunSkyState: state,
      generation: {
        promptText: state.derived.promptText,
        createdAt: new Date().toISOString(),
      },
      output: {
        canUpscale: true,
        targetResolutions: ['1k', '2k', '4k'],
      },
    };
    setSnapshots((prev) => [...prev, snapshot]);
  }, [state]);

  const handleRemoveSnapshot = useCallback((id: string) => {
    setSnapshots((prev) => prev.filter((snapshot) => snapshot.id !== id));
  }, []);

  const closestTurbidity = TURBIDITY_LABELS.reduce((prev, curr) =>
    Math.abs(curr.value - state.sky.turbidity) < Math.abs(prev.value - state.sky.turbidity) ? curr : prev,
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3"
      style={{ background: 'rgba(5, 7, 12, 0.86)', backdropFilter: 'blur(14px)' }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="relative grid overflow-hidden rounded-xl"
        style={{
          width: 'min(1520px, 98vw)',
          height: 'min(840px, 94vh)',
          gridTemplateRows: '56px minmax(0, 1fr)',
          background: 'linear-gradient(180deg, #0d1017 0%, #080a0f 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 28px 90px rgba(0,0,0,0.68)',
        }}
      >
        <header className="flex items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
              <Sun className="h-5 w-5" />
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white">太阳天空</h2>
              <span className="rounded-full bg-white/[0.08] px-2 py-0.5 text-[11px] font-medium text-white/70">BETA</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-white/55">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.08] hover:text-white" title="帮助">
              <CircleHelp className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.08] hover:text-white"
              title="重置"
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.08] hover:text-white"
              title="收起"
              onClick={onClose}
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/[0.08] hover:text-white"
              title="关闭"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div
          className="grid min-h-0 gap-3 p-3"
          style={{ gridTemplateColumns: '344px minmax(500px, 1fr) 374px' }}
        >
          <aside className="min-h-0 overflow-hidden rounded-lg border border-white/[0.07] bg-[#0f1219]/95">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <span className="text-sm font-semibold text-white">精选预设</span>
              <span className="text-sm text-white/75">16</span>
            </div>
            <div className="h-[calc(100%-49px)] overflow-y-auto p-4">
              <SunSkyPresetList selectedPresetId={state.source.presetId} onSelect={handlePresetSelect} />
            </div>
          </aside>

          <main className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'minmax(420px, 1fr) 202px' }}>
            <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#12151c]">
              <div className="relative h-full">
                <SunSkyPreview state={state} />
                <div
                  className="absolute inset-x-0 bottom-0 grid border-t border-white/[0.07] bg-[#0d1017]/78 backdrop-blur-xl"
                  style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
                >
                  <InfoTile icon={<Clock />} label="时间" value={state.derived.timeLabel} />
                  <InfoTile icon={<Compass />} label="太阳方位" value={`${state.sun.azimuth}°`} />
                  <InfoTile icon={<Sun />} label="太阳高度" value={`${state.sun.elevation}°`} />
                  <InfoTile icon={<Cloud />} label="天气" value={SKY_LABELS[state.sky.condition] || state.sky.condition} />
                  <InfoTile icon={<Waves />} label="空气质量" value={closestTurbidity.label} />
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-lg border border-white/[0.08] bg-[#10131a] p-4">
              <SunSkySnapshotStrip
                snapshots={snapshots}
                onAddSnapshot={handleAddSnapshot}
                onRemoveSnapshot={handleRemoveSnapshot}
              />
            </section>
          </main>

          <aside className="grid min-h-0 gap-3" style={{ gridTemplateRows: 'minmax(0, 1fr) 210px' }}>
            <section className="min-h-0 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0f1219]/95 p-4">
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.06] pb-3">
                <h3 className="text-sm font-semibold text-white">参数控制</h3>
                <div className="flex items-center gap-2 text-white/45">
                  <button className="transition hover:text-white" onClick={handleReset} title="重置参数">
                    <RotateCcw className="h-4 w-4" />
                  </button>
                  <ChevronUp className="h-4 w-4" />
                </div>
              </div>
              <SunSkyControls state={state} onChange={handleStateUpdate} />
            </section>

            <section className="overflow-y-auto rounded-lg border border-white/[0.08] bg-[#0f1219]/95 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-white/45" />
                <h3 className="text-sm font-semibold text-white">当前光照信息</h3>
              </div>
              <SunSkyDerivedInfo derived={state.derived} state={state} />
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-3 border-r border-white/[0.06] px-4 py-4 last:border-r-0">
      <span className="text-white/55 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-white/52">{label}</div>
        <div className="truncate text-sm font-medium text-white/86">{value}</div>
      </div>
    </div>
  );
}
