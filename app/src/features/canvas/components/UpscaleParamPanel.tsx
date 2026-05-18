import { memo, useState, useCallback, type ChangeEvent } from 'react';
import { Zap, ArrowUp } from 'lucide-react';
import type { UpscaleSliderProps } from '../types/canvas.types';

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

export function UpscaleParamPanel() {
  const [engine, setEngine] = useState<'topazlabs' | 'magnific-creative' | 'magnific-precision'>('magnific-precision');
  const [showEngineMenu, setShowEngineMenu] = useState(false);

  // Topazlabs params
  const [tlModel, setTlModel] = useState('通用');
  const [tlScale, setTlScale] = useState<2 | 4 | 6>(4);
  const [showTlModelMenu, setShowTlModelMenu] = useState(false);

  // Magnific Creative params
  const [mcUpscale, setMcUpscale] = useState<'2x' | '4x'>('2x');
  const [mcOptimized, setMcOptimized] = useState('标准');
  const [mcCreativity, setMcCreativity] = useState(0);
  const [mcDetail, setMcDetail] = useState(0);
  const [mcSimilarity, setMcSimilarity] = useState(0);
  const [mcPromptStr, setMcPromptStr] = useState(0);
  const [showMcUpscaleMenu, setShowMcUpscaleMenu] = useState(false);
  const [showMcOptimizedMenu, setShowMcOptimizedMenu] = useState(false);

  // Magnific Precision params
  const [mpUpscale, setMpUpscale] = useState<'2x' | '4x'>('2x');
  const [mpSharpen, setMpSharpen] = useState(7);
  const [mpGrain, setMpGrain] = useState(7);
  const [mpUltra, setMpUltra] = useState(30);
  const [showMpUpscaleMenu, setShowMpUpscaleMenu] = useState(false);

  const engineOptions = [
    { key: 'magnific-precision' as const, label: 'Magnific Precision v2' },
    { key: 'magnific-creative' as const, label: 'Magnific Creative' },
    { key: 'topazlabs' as const, label: 'Topazlabs' },
  ];

  const tlModels = ['通用', '低分辨率', '3D动画', '高保真', '文本优化'];
  const mcOptimizedOptions = ['标准', '柔和人像', '硬朗人像', '艺术与插画', '游戏资产', '自然与风景', '电影与摄影', '3D渲染'];

  const closeAllMenus = () => {
    setShowEngineMenu(false);
    setShowTlModelMenu(false);
    setShowMcUpscaleMenu(false);
    setShowMcOptimizedMenu(false);
    setShowMpUpscaleMenu(false);
  };

  return (
    <div className="mt-3 rounded-[16px] nowheel nodrag" style={{ width: 320, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }} onWheel={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      {/* Title */}
      <div className="px-4 pt-3 pb-2">
        <div className="text-sm font-medium text-white">高清放大</div>
      </div>

      <div className="px-4 pb-3 space-y-2.5">
        {/* Engine selector */}
        <div className="relative">
          <div className="text-[11px] text-[#6a6a7a] mb-1">引擎</div>
          <button
            onClick={() => { closeAllMenus(); setShowEngineMenu(!showEngineMenu); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-xs">▲</span>
            {engineOptions.find((o) => o.key === engine)?.label}
            <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
          </button>
          {showEngineMenu && (
            <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }}>
              {engineOptions.map((o) => (
                <button key={o.key} onClick={() => { setEngine(o.key); setShowEngineMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors ${engine === o.key ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Topazlabs params ── */}
        {engine === 'topazlabs' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">模型</div>
              <button
                onClick={() => { closeAllMenus(); setShowTlModelMenu(!showTlModelMenu); }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {tlModel}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showTlModelMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {tlModels.map((m) => (
                    <button key={m} onClick={() => { setTlModel(m); setShowTlModelMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors ${tlModel === m ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-[11px] text-[#6a6a7a] mb-1.5">放大倍数</div>
              <div className="flex gap-2">
                {[2, 4, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => setTlScale(s as 2 | 4 | 6)}
                    className={`flex-1 py-1.5 rounded-lg text-sm transition-colors ${tlScale === s ? 'text-white border border-white/30' : 'text-[#a0a0b0] border border-transparent hover:bg-white/5'}`}
                    style={{ background: tlScale === s ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── Magnific Creative params ── */}
        {engine === 'magnific-creative' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">放大倍数</div>
              <button
                onClick={() => { closeAllMenus(); setShowMcUpscaleMenu(!showMcUpscaleMenu); }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {mcUpscale}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMcUpscaleMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['2x', '4x'] as const).map((s) => (
                    <button key={s} onClick={() => { setMcUpscale(s); setShowMcUpscaleMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${mcUpscale === s ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {mcUpscale === s && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">优化场景</div>
              <button
                onClick={() => { closeAllMenus(); setShowMcOptimizedMenu(!showMcOptimizedMenu); }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {mcOptimized}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMcOptimizedMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)', maxHeight: 200, overflowY: 'auto' }}>
                  {mcOptimizedOptions.map((o) => (
                    <button key={o} onClick={() => { setMcOptimized(o); setShowMcOptimizedMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${mcOptimized === o ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {mcOptimized === o && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">创造力</span>
              <UpscaleSlider value={mcCreativity} min={0} max={100} onChange={setMcCreativity} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">细节强度</span>
              <UpscaleSlider value={mcDetail} min={0} max={100} onChange={setMcDetail} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">相似度</span>
              <UpscaleSlider value={mcSimilarity} min={0} max={100} onChange={setMcSimilarity} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">提示词强度</span>
              <UpscaleSlider value={mcPromptStr} min={0} max={100} onChange={setMcPromptStr} />
            </div>
          </>
        )}

        {/* ── Magnific Precision v2 params ── */}
        {engine === 'magnific-precision' && (
          <>
            <div className="relative">
              <div className="text-[11px] text-[#6a6a7a] mb-1">放大倍数</div>
              <button
                onClick={() => { closeAllMenus(); setShowMpUpscaleMenu(!showMpUpscaleMenu); }}
                className="w-full flex items-center px-3 py-2 rounded-lg text-left text-sm text-white transition-colors hover:bg-white/5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {mpUpscale}
                <span className="ml-auto text-[10px] text-[#6a6a7a]">▼</span>
              </button>
              {showMpUpscaleMenu && (
                <div className="absolute z-30 left-0 right-0 mt-1 py-1 rounded-lg overflow-hidden" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {(['2x', '4x'] as const).map((s) => (
                    <button key={s} onClick={() => { setMpUpscale(s); setShowMpUpscaleMenu(false); }} className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${mpUpscale === s ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}>
                      {mpUpscale === s && <span className="w-0.5 h-3 rounded-full bg-[#00d4ff]" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">锐化</span>
              <UpscaleSlider value={mpSharpen} min={0} max={100} onChange={setMpSharpen} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">智能颗粒</span>
              <UpscaleSlider value={mpGrain} min={0} max={100} onChange={setMpGrain} />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a0a0b0] w-20 flex-shrink-0">超细节</span>
              <UpscaleSlider value={mpUltra} min={0} max={100} onChange={setMpUltra} />
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
        <button
          className="flex items-center justify-center rounded-lg transition-colors hover:bg-white/20"
          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.9)' }}
          title="生成"
        >
          <ArrowUp className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
}
