import { memo, useState, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, ArrowUp, Loader2 } from 'lucide-react';
import type { UpscaleSliderProps } from '../types/canvas.types';
import { stopCanvasWheelPropagation } from '../utils/canvasEvents';

const UpscaleSlider = memo(function UpscaleSlider({ value, min, max, onChange }: UpscaleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(e.currentTarget.value));
    },
    [onChange],
  );

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="relative flex-1 h-6 rounded-full">
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#00d4ff' }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleChange}
          className="absolute inset-0 z-10 w-full h-6 opacity-0 cursor-pointer"
          onPointerDown={(e) => e.stopPropagation()}
        />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full"
          style={{
            left: `${pct}%`,
            transform: 'translate3d(-50%, -50%, 0)',
            background: '#00d4ff',
            pointerEvents: 'none',
            willChange: 'left',
          }}
        />
      </div>
      <span className="text-xs text-[#a0a0b0] w-6 text-right tabular-nums">{value}</span>
    </div>
  );
});

export interface UpscalePanelParams {
  engine: string;
  tlModel: string;
  tlScale: number;
  mcUpscale: string;
  mcOptimized: string;
  mcCreativity: number;
  mcDetail: number;
  mcSimilarity: number;
  mcPromptStr: number;
  mpUpscale: string;
  mpSharpen: number;
  mpGrain: number;
  mpUltra: number;
}

export interface UpscaleParamPanelProps {
  params: UpscalePanelParams;
  onChange: (patch: Partial<UpscalePanelParams>) => void;
  onGenerate: () => void;
  status: string;
  progress: number;
  canGenerate: boolean;
}

export function UpscaleParamPanel({ params, onChange, onGenerate, status, progress, canGenerate }: UpscaleParamPanelProps) {
  const { t } = useTranslation();
  const isRunning = status === 'running';

  const [showEngineMenu, setShowEngineMenu] = useState(false);
  const [showTlModelMenu, setShowTlModelMenu] = useState(false);
  const [showMcUpscaleMenu, setShowMcUpscaleMenu] = useState(false);
  const [showMcOptimizedMenu, setShowMcOptimizedMenu] = useState(false);
  const [showMpUpscaleMenu, setShowMpUpscaleMenu] = useState(false);

  const engineOptions = [
    { key: 'magnific-precision' as const, label: 'Magnific Precision v2' },
    { key: 'magnific-creative' as const, label: 'Magnific Creative' },
    { key: 'topazlabs' as const, label: 'Topazlabs' },
  ];

  const tlModels = ['general', 'lowRes', 'animation3d', 'highFidelity', 'textOpt'];
  const mcOptimizedOptions = ['standard', 'softPortrait', 'hardPortrait', 'artIllustration', 'gameAsset', 'natureLandscape', 'filmPhoto', 'render3d'];

  const closeAllMenus = () => {
    setShowEngineMenu(false);
    setShowTlModelMenu(false);
    setShowMcUpscaleMenu(false);
    setShowMcOptimizedMenu(false);
    setShowMpUpscaleMenu(false);
  };

  return (
    <div className="mt-3 rounded-[16px] nowheel nodrag" style={{ width: 320, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }} onWheel={stopCanvasWheelPropagation} onWheelCapture={stopCanvasWheelPropagation} onPointerDown={(e) => e.stopPropagation()}>
      {/* Title */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-sm font-medium text-white">{t('upscale.title')}</div>
        <div className="mt-1 text-[11px] text-[#7a7a88]">{t('upscale.subtitle')}</div>
      </div>

      <div className="px-4 pb-3 space-y-2.5">
        {/* Engine selector */}
        <div className="relative">
          <div className="text-[11px] text-[#6a6a7a] mb-1">{t('upscale.engine')}</div>
          <button
            onClick={() => { closeAllMenus(); setShowEngineMenu(!showEngineMenu); }}
            disabled={isRunning}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-xs">▲</span>
            {engineOptions.find((o) => o.key === params.engine)?.label}
            <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
          </button>
          {showEngineMenu && (
            <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }} onWheelCapture={stopCanvasWheelPropagation}>
              {engineOptions.map((o) => (
                <button key={o.key} onClick={() => { onChange({ engine: o.key }); setShowEngineMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors ${params.engine === o.key ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Topazlabs params ── */}
        {params.engine === 'topazlabs' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">{t('upscale.model')}</div>
              <button
                onClick={() => { closeAllMenus(); setShowTlModelMenu(!showTlModelMenu); }}
                disabled={isRunning}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {t(`upscale.tlModels.${params.tlModel}`)}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showTlModelMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }} onWheelCapture={stopCanvasWheelPropagation}>
                  {tlModels.map((m) => (
                    <button key={m} onClick={() => { onChange({ tlModel: m }); setShowTlModelMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors ${params.tlModel === m ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {t(`upscale.tlModels.${m}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-[#6a6a7a] mb-1.5">{t('upscale.upscaleFactor')}</div>
              <div className="flex gap-2">
                {[2, 4, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => onChange({ tlScale: s })}
                    disabled={isRunning}
                    className={`flex-1 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-40 ${params.tlScale === s ? 'text-white border border-white/30' : 'text-[#a0a0b0] border border-transparent hover:bg-white/5'}`}
                    style={{ background: params.tlScale === s ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Magnific Creative params ── */}
        {params.engine === 'magnific-creative' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">{t('upscale.upscaleFactor')}</div>
              <button
                onClick={() => { closeAllMenus(); setShowMcUpscaleMenu(!showMcUpscaleMenu); }}
                disabled={isRunning}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {params.mcUpscale}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMcUpscaleMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }} onWheelCapture={stopCanvasWheelPropagation}>
                  {(['2x', '4x'] as const).map((s) => (
                    <button key={s} onClick={() => { onChange({ mcUpscale: s }); setShowMcUpscaleMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${params.mcUpscale === s ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {params.mcUpscale === s && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">{t('upscale.optimizeScene')}</div>
              <button
                onClick={() => { closeAllMenus(); setShowMcOptimizedMenu(!showMcOptimizedMenu); }}
                disabled={isRunning}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {t(`upscale.mcOptimized.${params.mcOptimized}`)}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMcOptimizedMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 200, overflowY: 'auto' }} onWheelCapture={stopCanvasWheelPropagation}>
                  {mcOptimizedOptions.map((o) => (
                    <button key={o} onClick={() => { onChange({ mcOptimized: o }); setShowMcOptimizedMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${params.mcOptimized === o ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {params.mcOptimized === o && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {t(`upscale.mcOptimized.${o}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.creativity')}</span>
              <UpscaleSlider value={params.mcCreativity} min={0} max={100} onChange={(v) => onChange({ mcCreativity: v })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.detailStrength')}</span>
              <UpscaleSlider value={params.mcDetail} min={0} max={100} onChange={(v) => onChange({ mcDetail: v })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.similarity')}</span>
              <UpscaleSlider value={params.mcSimilarity} min={0} max={100} onChange={(v) => onChange({ mcSimilarity: v })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.promptStrength')}</span>
              <UpscaleSlider value={params.mcPromptStr} min={0} max={100} onChange={(v) => onChange({ mcPromptStr: v })} />
            </div>
          </>
        )}

        {/* ── Magnific Precision v2 params ── */}
        {params.engine === 'magnific-precision' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">{t('upscale.upscaleFactor')}</div>
              <button
                onClick={() => { closeAllMenus(); setShowMpUpscaleMenu(!showMpUpscaleMenu); }}
                disabled={isRunning}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {params.mpUpscale}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMpUpscaleMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }} onWheelCapture={stopCanvasWheelPropagation}>
                  {(['2x', '4x'] as const).map((s) => (
                    <button key={s} onClick={() => { onChange({ mpUpscale: s }); setShowMpUpscaleMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${params.mpUpscale === s ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {params.mpUpscale === s && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.sharpen')}</span>
              <UpscaleSlider value={params.mpSharpen} min={0} max={100} onChange={(v) => onChange({ mpSharpen: v })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.smartGrain')}</span>
              <UpscaleSlider value={params.mpGrain} min={0} max={100} onChange={(v) => onChange({ mpGrain: v })} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">{t('upscale.ultraDetail')}</span>
              <UpscaleSlider value={params.mpUltra} min={0} max={100} onChange={(v) => onChange({ mpUltra: v })} />
            </div>
          </>
        )}
      </div>

      {/* Footer: credits + generate button */}
      <div className="flex items-center justify-end px-4 py-3 gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
          <Zap className="w-3 h-3" />
          <span className="text-xs">8</span>
        </div>
        {isRunning && (
          <div className="flex items-center gap-1.5 mr-1">
            <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: '#00d4ff' }} />
            <span className="text-xs text-[#a0a0b0]">{t('upscale.enhancing')} {progress}%</span>
          </div>
        )}
        <button
          onClick={onGenerate}
          disabled={!canGenerate || isRunning}
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.9)' }}
          title={canGenerate ? t('upscale.generate') : t('upscale.connectImageFirst')}
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 text-black animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4 text-black" />
          )}
        </button>
      </div>
    </div>
  );
}
