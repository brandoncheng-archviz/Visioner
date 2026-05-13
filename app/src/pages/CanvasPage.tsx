import { memo, useState, useCallback, useMemo, useRef, useEffect, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  useStore,
  type NodeProps,
  type Node,
  type Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Navbar from '../components/Navbar';
import {
  Plus,
  FolderOpen,
  ListTree,
  MessageCircle,
  History,
  Wand2,
  Image,
  Headphones,
  Play,
  X,
  Text,
  RotateCcw,
  Map as MapIcon,
  Grid3x3,
  HelpCircle,
  Minus,
  Upload,
  Zap,
  ArrowUp,
  Mic,
  ClipboardPaste,
  Check,
  ChevronDown,
  Building2,
  Layers,
  Leaf,
  Palette,
  Sun,
  Cloud,
  Maximize,
  Copy,
  Trash2,
  Bug,
  Download,
  Maximize2,
  Crop,
  Box,
  Pencil,
  Lightbulb,
  MoreHorizontal,
} from 'lucide-react';
import { getProjectCanvasData, recentProjects } from '../data/siteData';

/* ─── Toast ─── */
function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(text);
    timer.current = setTimeout(() => setMsg(null), 2500);
  }, []);
  return { msg, show };
}

/* ─── Node Shell ─── */
function NodeShell({ label, selected, children }: { label: string; selected: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Label above card */}
      <div
        className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap pointer-events-none"
        style={{ color: '#a0a0b0' }}
      >
        {label}
      </div>

      {/* Card body */}
      <div
        className="rounded-xl overflow-hidden min-w-[200px] max-w-[260px] transition-all"
        style={{
          background: '#1a1a24',
          border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: selected ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ─── Node Components ─── */

function TextNode({ data, selected }: NodeProps) {
  return (
    <NodeShell label="文本节点" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
          <Text className="w-3.5 h-3.5 text-[#a855f7]" /> 文本节点
        </div>
        <div className="text-[11px] text-[#a0a0b0] leading-relaxed line-clamp-3">
          {(data.text as string) || '在此输入你的设计描述，或从左侧添加节点开始创作...'}
        </div>
      </div>
    </NodeShell>
  );
}

/* ─── Image Toolbar (shown when image node has an image and is selected) ─── */
function ImageToolbar({ onFullscreen }: { onFullscreen: () => void }) {
  const tools = [
    { icon: Crop, label: '裁剪' },
    { icon: Box, label: '视角' },
    { icon: Pencil, label: '重绘' },
    { icon: Lightbulb, label: '灯光' },
    { icon: MoreHorizontal, label: '更多' },
    { icon: Maximize, label: '扩展' },
    { icon: Download, label: '下载' },
  ];

  return (
    <div
      className="flex items-center gap-1 px-2 py-1.5 rounded-full nodrag nowheel"
      style={{
        background: '#252526',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      }}
    >
      {tools.map((tool) => (
        <button
          key={tool.label}
          className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
          style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
          title={tool.label}
        >
          <tool.icon className="w-4 h-4" />
        </button>
      ))}
      <button
        onClick={onFullscreen}
        className="flex items-center justify-center rounded-full transition-colors hover:bg-white/15"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.85)' }}
        title="全屏"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ─── Image Preview Modal (fullscreen preview for image nodes) ─── */
function ImagePreviewModal({
  imageUrl,
  nodeName,
  imgSize,
  onClose,
}: {
  imageUrl: string;
  nodeName: string;
  imgSize: { width: number; height: number } | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: '#0a0a0f' }}>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex items-center justify-center rounded-full transition-colors hover:bg-white/10"
        style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.6)' }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Image area */}
      <div className="flex-1 flex items-center justify-center" style={{ padding: 40 }}>
        <img
          src={imageUrl}
          alt=""
          className="max-w-full max-h-full object-contain rounded-lg"
          style={{ maxHeight: 'calc(100vh - 80px)' }}
        />
      </div>

      {/* Info panel */}
      <div className="flex flex-col" style={{ width: 320, background: '#14141a', borderLeft: '1px solid #2a2a35' }}>
        <div className="flex-1 overflow-y-auto p-5">
          {/* Prompt section */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-3">提示词</h3>
            <div
              className="rounded-lg p-3 text-sm"
              style={{ background: '#1e1e28', color: '#a0a0b0', minHeight: 80 }}
            >
              暂无提示词
            </div>
          </div>

          {/* Info section */}
          <div>
            <h3 className="text-sm font-medium text-white mb-3">信息</h3>
            <div className="rounded-lg p-4 space-y-2.5" style={{ background: '#1e1e28' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>尺寸</span>
                <span style={{ color: '#a0a0b0' }}>{imgSize ? `${imgSize.width}×${imgSize.height}` : '未知'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>质量</span>
                <span style={{ color: '#a0a0b0' }}>2k</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>文件大小</span>
                <span style={{ color: '#a0a0b0' }}>31 KB</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>日期</span>
                <span style={{ color: '#a0a0b0' }}>2026/05/08</span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: '#6a6a7a' }}>创建者</span>
                <span style={{ color: '#a0a0b0' }}>brandonchan0307</span>
              </div>
            </div>
          </div>
        </div>

        {/* Download button */}
        <div className="p-5" style={{ borderTop: '1px solid #2a2a35' }}>
          <button
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white transition-colors hover:bg-[#3a3a4a]"
            style={{ background: '#252530' }}
            onClick={() => {
              const a = document.createElement('a');
              a.href = imageUrl;
              a.download = nodeName || 'image';
              a.click();
            }}
          >
            下载
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Prompt Panel (Component 2 inside ImageNode) ─── */
function PromptPanel() {
  const [prompt, setPrompt] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [model, setModel] = useState('Nano Banana 2');
  const [resolution, setResolution] = useState('2K');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [count, setCount] = useState('1x');

  const modelOptions: { name: string; icon: string; iconBg: string; tags: string[]; time: string; badge?: string }[] = [
    { name: 'Nano Banana 2', icon: 'G', iconBg: '#4285f4', tags: ['Precise', 'Quality', 'Fast'], time: '25s' },
    { name: 'Nano Banana Pro', icon: 'G', iconBg: '#34a853', tags: ['Precise', 'Quality'], time: '50s' },
    { name: 'GPT Image 2', icon: '◎', iconBg: '#10a37f', tags: ['Style'], time: '40s' },
  ];

  const resolutions = ['1K', '2K', '4K'];

  const aspectRatios = [
    { value: '自适应', icon: 'auto' },
    { value: '1:1', icon: 'square' },
    { value: '9:16', icon: 'portrait' },
    { value: '16:9', icon: 'landscape' },
    { value: '3:4', icon: 'portrait' },
    { value: '4:3', icon: 'landscape' },
    { value: '3:2', icon: 'landscape' },
    { value: '2:3', icon: 'portrait' },
    { value: '4:5', icon: 'portrait' },
    { value: '5:4', icon: 'landscape' },
    { value: '21:9', icon: 'ultrawide' },
  ];

  const counts = ['1x', '2x', '4x'];

  const selectedModel = modelOptions.find(m => m.name === model) || modelOptions[0];

  return (
    <div className="mt-3 rounded-[20px] nowheel nodrag" style={{ width: 640, background: '#1e1e1e', border: '1px solid rgba(255,255,255,0.08)' }} onWheel={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
      {/* Top bar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px' }}>
        <div className="flex items-center gap-2">
          <button className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)' }} title="引用图片">
            <Image className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
          <button className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 8, background: '#2a2a2a', border: '1px solid rgba(255,255,255,0.06)' }} title="添加">
            <Plus className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </button>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-center hover:text-white transition-colors"
          style={{ width: 32, height: 32, color: 'rgba(255,255,255,0.4)' }}
          title={expanded ? '收起' : '展开'}
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Text input */}
      <div style={{ padding: '0 16px 12px 16px' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder="描述任何你想要生成的内容"
          className="w-full bg-transparent resize-none outline-none placeholder:text-[rgba(255,255,255,0.25)]"
          style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, lineHeight: 1.5, minHeight: expanded ? 160 : 52 }}
          rows={expanded ? 5 : 2}
        />
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 16px' }}>
        <div className="flex items-center">
          {/* Model selector */}
          <div className="relative">
            <button
              onClick={() => { setShowModelMenu(!showModelMenu); setShowRatioMenu(false); setShowCountMenu(false); }}
              className="flex items-center gap-1.5 transition-colors hover:text-white"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
            >
              <span className="flex items-center justify-center rounded text-[10px] font-bold text-white" style={{ width: 16, height: 16, background: selectedModel.iconBg }}>
                {selectedModel.icon}
              </span>
              {model}
            </button>
            {showModelMenu && (
              <div className="absolute bottom-full left-0 mb-1 py-1 rounded-xl z-30 overflow-hidden nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)', width: 280, maxHeight: 320, overflowY: 'auto', overscrollBehavior: 'contain' }} onWheel={(e) => e.stopPropagation()}>
                {modelOptions.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => { setModel(m.name); setShowModelMenu(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${model === m.name ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center rounded text-[10px] font-bold text-white" style={{ width: 28, height: 28, background: m.iconBg }}>
                      {m.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] text-white font-medium">{m.name}</div>
                      {m.tags && (
                        <div className="flex items-center gap-1 mt-0.5">
                          {m.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {m.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: '#f5a623', color: '#0a0a0f' }}>{m.badge}</span>
                      )}
                      {m.time && (
                        <span className="text-[11px] text-[#6a6a7a]">{m.time}</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 10px' }} />

          {/* Ratio selector */}
          <div className="relative">
            <button
              onClick={() => { setShowRatioMenu(!showRatioMenu); setShowModelMenu(false); setShowCountMenu(false); }}
              className="flex items-center gap-1 transition-colors hover:text-white"
              style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
            >
              <Maximize className="w-3 h-3" /> {aspectRatio} · {resolution}
            </button>
            {showRatioMenu && (
              <div className="absolute bottom-full left-0 mb-1 py-3 rounded-xl z-30 nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)', width: 240, overscrollBehavior: 'contain' }} onWheel={(e) => e.stopPropagation()}>
                {/* Resolution */}
                <div className="px-3 pb-2">
                  <div className="text-[10px] text-[#6a6a7a] mb-2">分辨率</div>
                  <div className="flex items-center gap-2">
                    {resolutions.map((r) => (
                      <button
                        key={r}
                        onClick={() => setResolution(r)}
                        className={`flex-1 py-1.5 rounded-lg text-[12px] transition-colors ${resolution === r ? 'text-white border border-white/30' : 'text-[#a0a0b0] border border-transparent hover:bg-white/5'}`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Aspect Ratio */}
                <div className="px-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-[#6a6a7a] mb-2">比例</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {aspectRatios.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => { setAspectRatio(ar.value); setShowRatioMenu(false); }}
                        className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg transition-colors ${aspectRatio === ar.value ? 'bg-white/10 text-white' : 'text-[#a0a0b0] hover:bg-white/5'}`}
                      >
                        <div className="flex items-center justify-center" style={{ width: 16, height: 16 }}>
                          <div
                            className="border border-current rounded-sm"
                            style={{
                              width: ar.icon === 'portrait' ? 8 : ar.icon === 'landscape' ? 14 : ar.icon === 'ultrawide' ? 16 : 10,
                              height: ar.icon === 'portrait' ? 12 : ar.icon === 'landscape' ? 8 : ar.icon === 'ultrawide' ? 6 : 10,
                              opacity: 0.6
                            }}
                          />
                        </div>
                        <span className="text-[10px]">{ar.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center" style={{ gap: 16 }}>
          {/* Voice input */}
          <button className="flex items-center justify-center transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.4)' }} title="语音输入">
            <Mic className="w-3.5 h-3.5" />
          </button>

          {/* Count selector */}
          <div className="relative">
            <button onClick={() => { setShowCountMenu(!showCountMenu); setShowModelMenu(false); setShowRatioMenu(false); }} className="transition-colors hover:text-white" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
              {count}
            </button>
            {showCountMenu && (
              <div className="absolute bottom-full right-0 mb-1 py-1 rounded-lg z-30 nowheel" style={{ background: '#252526', border: '1px solid rgba(255,255,255,0.08)', overscrollBehavior: 'contain' }} onWheel={(e) => e.stopPropagation()}>
                {counts.map((c) => (
                  <button key={c} onClick={() => { setCount(c); setShowCountMenu(false); }} className="w-full px-3 py-2 text-left text-[12px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Credits pill */}
          <div className="flex items-center gap-1 rounded-full" style={{ background: '#333333', padding: '4px 10px' }}>
            <Zap className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.7)' }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>5</span>
          </div>

          {/* Send button */}
          <button className="flex items-center justify-center rounded-full" style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.9)', marginLeft: -10 }} title="生成">
            <ArrowUp className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Upscale Param Panel ─── */
type UpscaleSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

const UpscaleSlider = memo(function UpscaleSlider({ value, min, max, onChange }: UpscaleSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.currentTarget.value));
  }, [onChange]);

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

function UpscaleParamPanel() {
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

type ImageRole =
  | 'primary_building'
  | 'overall_reference'
  | 'plant_reference'
  | 'material_reference'
  | 'lighting_reference'
  | 'sky_reference';

const imageRoleOptions: {
  value: ImageRole;
  label: string;
  description: string;
  detail: string;
  constraints: string[];
  Icon: typeof Building2;
}[] = [
  {
    value: 'primary_building',
    label: '主体建筑',
    description: '保持结构 / 保持视角 / 保持构图',
    detail: '作为主体建筑参考，AI 将保持结构、视角与构图不变。',
    constraints: ['保持结构', '保持视角', '保持构图'],
    Icon: Building2,
  },
  {
    value: 'overall_reference',
    label: '整体参考',
    description: '参考整体氛围 / 色调 / 真实度',
    detail: '参考整体氛围、时间段、灯光、色调、真实度和艺术化感觉。',
    constraints: ['整体氛围', '色调', '真实度'],
    Icon: Layers,
  },
  {
    value: 'plant_reference',
    label: '植物参考',
    description: '仅参考植物与景观感觉',
    detail: '仅参考植物、景观、绿化的风格与质感。',
    constraints: ['植物', '景观', '绿化'],
    Icon: Leaf,
  },
  {
    value: 'material_reference',
    label: '材质参考',
    description: '仅参考材质质感',
    detail: '仅参考材质质感，例如玻璃、混凝土、木材、金属、石材等。',
    constraints: ['玻璃', '混凝土', '金属'],
    Icon: Palette,
  },
  {
    value: 'lighting_reference',
    label: '灯光参考',
    description: '参考时间段 / 光照 / 明暗关系',
    detail: '参考时间段、太阳方向、光照强弱、明暗关系和室内外灯光。',
    constraints: ['时间段', '光照', '明暗'],
    Icon: Sun,
  },
  {
    value: 'sky_reference',
    label: '天空参考',
    description: '仅参考天空与天气氛围',
    detail: '仅参考天空、云层、天气、霞光、蓝调或夜景氛围。',
    constraints: ['天空', '云层', '天气'],
    Icon: Cloud,
  },
];

const roleColorMap: Record<ImageRole | 'null', string> = {
  primary_building: '#4aa3ff',
  overall_reference: '#a78bfa',
  plant_reference: '#4ade80',
  material_reference: '#fb923c',
  lighting_reference: '#facc15',
  sky_reference: '#7dd3fc',
  null: 'rgba(255,255,255,0.35)',
};

function getRoleData(role: ImageRole | null) {
  const isPrimary = role === 'primary_building';
  return {
    role,
    preserveStructure: isPrimary,
    preserveCamera: isPrimary,
    preserveComposition: isPrimary,
  };
}

function ImageRoleTag({
  role,
  onChange,
  open: controlledOpen,
  onOpenChange,
}: {
  role: ImageRole | null;
  onChange: (role: ImageRole) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [hoveredRole, setHoveredRole] = useState<ImageRole | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = imageRoleOptions.find((option) => option.value === role);
  const previewOption = imageRoleOptions.find((option) => option.value === (hoveredRole || role));
  const DisplayIcon = selectedOption?.Icon || Building2;

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as HTMLElement)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="absolute z-30 nodrag nowheel"
      style={{ top: 8, left: 8 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="image-role-tag-button flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors"
          style={{
            background: selectedOption ? 'rgba(27, 36, 52, 0.82)' : 'rgba(20, 22, 28, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${selectedOption ? 'rgba(56,149,255,0.72)' : 'rgba(255,255,255,0.2)'}`,
            color: selectedOption ? '#eaf7ff' : 'rgba(255,255,255,0.8)',
            boxShadow: selectedOption ? '0 0 0 1px rgba(0,212,255,0.08), 0 10px 24px rgba(0,0,0,0.34)' : '0 8px 18px rgba(0,0,0,0.28)',
          }}
        >
          <DisplayIcon className="h-2.5 w-2.5" style={{ color: selectedOption ? '#4aa3ff' : 'rgba(255,255,255,0.68)' }} />
          <span>{selectedOption?.label || '定义用途'}</span>
          <ChevronDown className="h-2.5 w-2.5" style={{ color: selectedOption ? '#79baff' : 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 top-[28px] w-[214px] overflow-hidden rounded-[14px] p-1.5"
          style={{
            background: 'linear-gradient(180deg, rgba(42,45,52,0.96), rgba(24,26,31,0.96))',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 18px 42px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {imageRoleOptions.map((option) => {
            const active = option.value === role;
            return (
              <button
                key={option.value}
                type="button"
                onMouseEnter={() => setHoveredRole(option.value)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12px] transition-colors"
                style={{
                  background: active ? 'rgba(55, 124, 214, 0.22)' : 'transparent',
                  color: active ? '#4aa3ff' : 'rgba(255,255,255,0.82)',
                }}
              >
                <option.Icon className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="flex-1 font-medium">{option.label}</span>
                {active && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
              </button>
            );
          })}
          <div
            className="mx-1.5 mt-2 border-t px-1 pt-3 pb-1.5 text-[12px] leading-relaxed"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.54)',
            }}
          >
            <div>{previewOption?.detail || '选择图片在建筑可视化流程中的参考角色。'}</div>
            {previewOption && (
              <div className="mt-2 flex gap-1">
                {previewOption.constraints.map((constraint) => (
                  <span
                    key={constraint}
                    className="rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: 'rgba(225,245,255,0.76)',
                    }}
                  >
                    <span style={{ color: '#4aa3ff' }}>•</span> {constraint}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Image Node ─── */
function ImageNode({ data, selected, id }: NodeProps) {
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);
  const hasInputConnection = useStore((state) => state.edges.some((e) => e.target === id));

  const img = data.image as string;
  const role = (data.role as ImageRole | null | undefined) ?? null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [nodeName, setNodeName] = useState((data.label as string) || 'Image');
  const [previewImage, setPreviewImage] = useState(img);
  const [editingName, setEditingName] = useState(false);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { setNodes } = useReactFlow();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const name = file.name.replace(/\.[^/.]+$/, '');
    const url = URL.createObjectURL(file);

    const imgEl = new window.Image();
    imgEl.onload = () => {
      setImgSize({ width: imgEl.width, height: imgEl.height });
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, image: url, label: name, width: imgEl.width, height: imgEl.height, ...getRoleData(null) } } : n));
    };
    imgEl.src = url;

    setNodeName(name);
    setPreviewImage(url);
  };

  const handleNameSave = () => {
    const newName = nameInputRef.current?.value.trim() || nodeName;
    setNodeName(newName);
    setEditingName(false);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, label: newName } } : n));
  };

  const handleRoleChange = (nextRole: ImageRole) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...getRoleData(nextRole) } } : n));
  };

  const stopTitleInteraction = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const displayImage = previewImage || img;
  const cardWidth = 240;
  const aspectRatio = imgSize ? imgSize.width / imgSize.height : ((data.width as number) || 1) / ((data.height as number) || 1);
  const cardHeight = displayImage ? Math.min(Math.round(cardWidth / aspectRatio), 320) : cardWidth;
  const showTitleMeta = zoom >= 0.35;
  const roleOption = role ? imageRoleOptions.find((o) => o.value === role) : null;
  const RoleIconForTitle = roleOption?.Icon;

  return (
    <div className="relative group/image" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {/* Toolbar — shown above title when image exists and node is selected */}
      {displayImage && selected && (
        <div className="absolute z-20 flex justify-center" style={{ top: -80 / zoom, left: cardWidth / 2, transform: `translateX(-50%) scale(${inverseScale})`, transformOrigin: 'top center' }}>
          <ImageToolbar onFullscreen={() => setShowPreview(true)} />
        </div>
      )}

      {/* Title label — fixed screen size, width matches card screen width */}
      <div
        className="absolute z-20 overflow-hidden nodrag"
        onPointerDownCapture={stopTitleInteraction}
        onMouseDownCapture={stopTitleInteraction}
        onClick={stopTitleInteraction}
        style={{ top: -20 / zoom, left: 0, width: cardWidth * zoom, transform: `scale(${inverseScale})`, transformOrigin: 'top left' }}
      >
        <div className="flex items-center justify-between overflow-hidden" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, width: '100%' }}>
          <div className="flex flex-1 items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
            {displayImage && (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setRoleMenuOpen(true);
                }}
                className="flex-shrink-0 cursor-pointer select-none transition-all hover:brightness-125"
                style={{ color: roleColorMap[role ?? 'null'], fontSize: 11 }}
                title="点击设置图片用途"
              >
                {RoleIconForTitle && (
                  <RoleIconForTitle className="inline-block" style={{ width: 11, height: 11, marginRight: 3, verticalAlign: '-0.1em' }} />
                )}
                {roleOption?.label || '未定义用途'}
              </span>
            )}
            {editingName ? (
              <input
                ref={nameInputRef}
                defaultValue={nodeName}
                autoFocus
                onBlur={handleNameSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                onPointerDown={stopTitleInteraction}
                onMouseDown={stopTitleInteraction}
                onClick={stopTitleInteraction}
                onDoubleClick={stopTitleInteraction}
                className="bg-transparent outline-none truncate nodrag nowheel select-text"
                style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, minWidth: 0, flex: 1, borderBottom: '1px solid rgba(255,255,255,0.2)' }}
              />
            ) : (
              <span
                onClick={() => setEditingName(true)}
                className="min-w-0 cursor-pointer truncate transition-colors hover:text-white nodrag"
                style={{ fontSize: 11 }}
              >
                {nodeName}
              </span>
            )}
          </div>
          {displayImage && showTitleMeta && (
            <span className="flex-shrink-0 ml-2" style={{ fontSize: 11 }}>
              {imgSize ? `${imgSize.width}×${imgSize.height}` : `${(data.width as number) || 1024}×${(data.height as number) || 1024}`}
            </span>
          )}
        </div>
      </div>

      {/* Image card wrapper — relative for handles/upload positioning */}
      <div className="relative" style={{ width: cardWidth }}>
        {/* Upload icon — inside card top-right, hidden when node has input connection */}
        {selected && !hasInputConnection && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute z-20 flex items-center justify-center rounded-lg transition-colors cursor-pointer"
              style={{
                top: 8,
                right: 8,
                width: 22,
                height: 22,
                background: 'rgba(37,37,48,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Upload style={{ width: 11, height: 11, color: 'rgba(255,255,255,0.7)' }} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </>
        )}

        {displayImage && (selected || roleMenuOpen) && (
          <ImageRoleTag role={role} onChange={handleRoleChange} open={roleMenuOpen} onOpenChange={setRoleMenuOpen} />
        )}

        {/* Main card — aspect ratio adapts to uploaded image */}
        <div
          className="w-full rounded-[16px] flex items-center justify-center transition-all overflow-hidden"
          style={{
            width: cardWidth,
            height: cardHeight,
            background: '#1a1a1a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          {displayImage ? (
            <img src={displayImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center">
              {/* Clean placeholder icon */}
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <rect x="4" y="4" width="48" height="48" rx="12" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <path d="M16 38L24 26L30 34L36 28L40 32" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="38" cy="20" r="4" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <path d="M12 42C18 36 26 36 32 40C38 44 44 40 48 36" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Left visual handle — Input (hidden when image exists) */}
        {!displayImage && (
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
            <Plus style={{ width: 14, height: 14, color: 'white' }} />
          </div>
        )}

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
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        {/* React Flow handles — positioned to overlap visual handles exactly */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />

      </div>

      {/* Prompt panel — centered under card, shown only for empty image nodes when selected */}
      {!displayImage && selected && selectedNodeCount === 1 && (
        <div
          className="absolute"
          style={{
            left: -(640 - cardWidth) / 2,
            top: cardHeight + 12 / zoom,
            width: 640,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top center',
            zIndex: 20,
          }}
        >
          <PromptPanel />
        </div>
      )}

      {/* Fullscreen preview modal — rendered via portal to escape node bounds */}
      {showPreview && displayImage && createPortal(
        <ImagePreviewModal
          imageUrl={displayImage}
          nodeName={nodeName}
          imgSize={imgSize}
          onClose={() => setShowPreview(false)}
        />,
        document.body
      )}
    </div>
  );
}

/* ─── Upscale Node ─── */
function UpscaleNode({ data, selected, id }: NodeProps) {
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const selectedNodeCount = useStore((state) => state.nodes.filter((n) => n.selected).length);

  const cardWidth = 240;
  const cardHeight = 240;

  return (
    <div className="relative group/upscale" style={{ zIndex: selected ? 100 : 1, width: cardWidth, cursor: 'default' }}>
      {/* Title label */}
      <div className="absolute z-20" style={{ top: -20 / zoom, left: 0, width: cardWidth * zoom, transform: `scale(${inverseScale})`, transformOrigin: 'top left' }}>
        <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
          <Image className="flex-shrink-0 pointer-events-none" style={{ width: 13, height: 13 }} />
          <span className="truncate">{(data.label as string) || '高清'}</span>
        </div>
      </div>

      {/* Main card */}
      <div className="relative" style={{ width: cardWidth }}>
        <div
          className="w-full rounded-[16px] flex items-center justify-center transition-all overflow-hidden"
          style={{
            width: cardWidth,
            height: cardHeight,
            background: '#1a1a1a',
            border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            配置参数生成高清图像
          </span>
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
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
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
          <Plus style={{ width: 14, height: 14, color: 'white' }} />
        </div>

        {/* React Flow handles */}
        <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%' }} />
        <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%' }} />
      </div>

      {/* Param panel — shown when selected and only this node is selected */}
      {selected && selectedNodeCount === 1 && (
        <div
          className="absolute"
          style={{
            left: -(320 - cardWidth) / 2,
            top: cardHeight + 12 / zoom,
            width: 320,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top center',
            zIndex: 20,
          }}
        >
          <UpscaleParamPanel />
        </div>
      )}
    </div>
  );
}

function VideoNode({ data, selected }: NodeProps) {
  return (
    <NodeShell label="视频生成" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-[#22d3ee]" /> 视频生成
        </div>
        <div className="text-[11px] text-[#a0a0b0]">{(data.duration as string) || '5s'} · {(data.fps as number) || 30}fps</div>
      </div>
    </NodeShell>
  );
}

function AudioNode({ selected }: NodeProps) {
  return (
    <NodeShell label="音频节点" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">音频节点</div>
        <div className="text-[11px] text-[#a0a0b0]">音频处理</div>
      </div>
    </NodeShell>
  );
}

function ScriptNode({ selected }: NodeProps) {
  return (
    <NodeShell label="脚本节点" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">脚本节点</div>
        <div className="text-[11px] text-[#a0a0b0]">脚本处理</div>
      </div>
    </NodeShell>
  );
}

function VideoMergeNode({ selected }: NodeProps) {
  return (
    <NodeShell label="视频合成" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">视频合成</div>
        <div className="text-[11px] text-[#a0a0b0]">合成视频</div>
      </div>
    </NodeShell>
  );
}

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  upscale: UpscaleNode,
  video: VideoNode,
  audio: AudioNode,
  script: ScriptNode,
  'video-merge': VideoMergeNode,
};

/* ─── Temp Connection Line (follows viewport via own store subscription) ─── */
function TempConnectionLine({ tempLine }: { tempLine: { sourceNodeId: string; currentX: number; currentY: number } | null }) {
  // Subscribe to viewport changes so the temp line re-queries DOM positions on pan/zoom.
  // This is isolated to this tiny component so it does NOT cause the whole FlowCanvas to re-render.
  useStore((state) => state.transform);

  if (!tempLine) return null;

  const sNode = document.querySelector(`.react-flow__node[data-id="${tempLine.sourceNodeId}"] .output-port`);
  if (!sNode) return null;
  const sRect = sNode.getBoundingClientRect();
  const sx = sRect.left + sRect.width / 2;
  const sy = sRect.top + sRect.height / 2;

  const offset = Math.max(Math.abs(tempLine.currentX - sx) * 0.4, 40);

  return (
    <svg className="absolute inset-0 z-50 pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <path
        d={`M ${sx} ${sy} C ${sx + offset} ${sy}, ${tempLine.currentX - offset} ${tempLine.currentY}, ${tempLine.currentX} ${tempLine.currentY}`}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

/* ─── Flow Inner ─── */

function FlowCanvas() {
  const { projectId } = useParams<{ projectId?: string }>();
  const projectName = useMemo(() => {
    if (!projectId || projectId === 'new') return '未命名项目';
    return recentProjects.find((p) => p.id === projectId)?.name || '未命名项目';
  }, [projectId]);

  const defaultData = useMemo(() => {
    if (!projectId || projectId === 'new') return getProjectCanvasData('new');
    return getProjectCanvasData(projectId);
  }, [projectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(defaultData.nodes as Node[]);
  const { screenToFlowPosition, setViewport, getViewport, fitView } = useReactFlow();
  const { msg: toastMsg } = useToast();

  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number } } | null>(null);
  const [nodeContextMenu, setNodeContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);

  // ─── Line Drawing State ───
  const [edges, setEdges] = useState<Edge[]>([]);
  const [tempLine, setTempLine] = useState<{ sourceNodeId: string; currentX: number; currentY: number } | null>(null);
  const [createMenu, setCreateMenu] = useState<{ x: number; y: number; flowPos: { x: number; y: number }; sourceNodeId: string } | null>(null);
  const [rejectTooltip, setRejectTooltip] = useState<{ x: number; y: number; message: string } | null>(null);
  const isDrawingRef = useRef(false);

  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Detect if adding an edge from source → target would create a cycle
  const wouldCreateCycle = useCallback((sourceId: string, targetId: string, currentEdges: Edge[]): boolean => {
    // Build adjacency list
    const adj = new Map<string, string[]>();
    currentEdges.forEach((e) => {
      if (!adj.has(e.source)) adj.set(e.source, []);
      adj.get(e.source)!.push(e.target);
    });
    // Add the hypothetical new edge
    if (!adj.has(sourceId)) adj.set(sourceId, []);
    adj.get(sourceId)!.push(targetId);

    // BFS from target: can we reach source?
    const visited = new Set<string>();
    const queue = [targetId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === sourceId) return true;
      if (visited.has(curr)) continue;
      visited.add(curr);
      (adj.get(curr) || []).forEach((next) => {
        if (!visited.has(next)) queue.push(next);
      });
    }
    return false;
  }, []);

  const startLineDraw = useCallback((nodeId: string, screenX: number, screenY: number) => {
    if (isDrawingRef.current) return;
    isDrawingRef.current = true;
    const posMap = new Map<string, { x: number; y: number }>();
    nodes.forEach((n) => posMap.set(n.id, { ...n.position }));
    nodePositionsRef.current = posMap;
    setTempLine({ sourceNodeId: nodeId, currentX: screenX, currentY: screenY });

    const clearHoverClasses = () => {
      document.querySelectorAll('.react-flow__node').forEach((n) => {
        n.classList.remove('can-connect', 'cannot-connect');
      });
    };

    const validateTarget = (targetId: string | null | undefined, inputHandle: Element | null | undefined): string | null => {
      if (!targetId) return '未找到目标节点';
      if (targetId === nodeId) return '不能将节点连接到自身';

      const effectiveInputHandle = inputHandle ?? document.querySelector(`.react-flow__node[data-id="${targetId}"] .image-node-handle.input-port`);
      const targetPortType = effectiveInputHandle?.getAttribute('data-port-type');
      if (targetPortType !== 'input') return '只能从输出端口连接到输入端口';

      const sourceDataType = (document.querySelector(`.react-flow__node[data-id="${nodeId}"] .output-port`) as HTMLElement | null)?.getAttribute('data-data-type');
      const targetDataType = (effectiveInputHandle as HTMLElement | null)?.getAttribute('data-data-type');
      if (sourceDataType !== targetDataType) return '只能连接相同类型的端口';

      if (wouldCreateCycle(nodeId, targetId, edges)) return '连接会形成环路';

      const alreadyConnected = edges.some((e) => e.source === nodeId && e.target === targetId);
      if (alreadyConnected) return '两个节点之间已存在连接';

      return null;
    };

    const handleMouseMove = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      setTempLine((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      // 恢复所有节点位置，阻止 React Flow 移动它们
      setNodes((nds) => nds.map((n) => {
        const original = nodePositionsRef.current.get(n.id);
        return original ? { ...n, position: original } : n;
      }));

      // 清除之前的 hover 状态
      clearHoverClasses();

      // 检测当前鼠标下方的节点，实时显示可连接/不可连接反馈
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const nodeEl = el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');
      if (targetId && nodeEl) {
        const error = validateTarget(targetId, null);
        if (error) {
          nodeEl.classList.add('cannot-connect');
          setRejectTooltip({ x: e.clientX, y: e.clientY, message: '无法连接' });
        } else {
          nodeEl.classList.add('can-connect');
          setRejectTooltip(null);
        }
      } else {
        setRejectTooltip(null);
      }
    };

    const handleMouseUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;

      window.removeEventListener('pointermove', handleMouseMove);
      window.removeEventListener('pointerup', handleMouseUp);
      clearHoverClasses();

      // 检测落点是否落在某个节点上（不限于 input port）
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const inputHandle = el?.closest('.image-node-handle');
      const nodeEl = inputHandle?.closest('.react-flow__node') ?? el?.closest('.react-flow__node');
      const targetId = nodeEl?.getAttribute('data-id');

      // ─── Connection validation ───
      const fail = (_reason: string) => {
        setRejectTooltip({ x: e.clientX, y: e.clientY, message: '无法连接' });
        setTimeout(() => setRejectTooltip((prev) => (prev ? null : prev)), 500);
        setTempLine(null);
      };

      if (!targetId) {
        setCreateMenu({ x: e.clientX, y: e.clientY, flowPos: screenToFlowPosition({ x: e.clientX, y: e.clientY }), sourceNodeId: nodeId });
        setTempLine(null);
        return;
      }

      // 如果没有直接落在 input port 上，从目标节点中自动查找 input port
      if (!nodeEl) { fail('未找到目标节点'); return; }
      const effectiveInputHandle = inputHandle ?? nodeEl.querySelector('.image-node-handle.input-port');
      const error = validateTarget(targetId, effectiveInputHandle);
      if (error) {
        fail(error);
        return;
      }

      // All checks passed — create edge
      setEdges((eds) => [...eds, { id: `e-${Date.now()}`, source: nodeId, target: targetId, sourceHandle: 'right-source', targetHandle: 'left-target', style: { stroke: '#555', strokeWidth: 1 } }]);
      setTempLine(null);
    };

    window.addEventListener('pointermove', handleMouseMove);
    window.addEventListener('pointerup', handleMouseUp);
  }, [screenToFlowPosition, nodes, edges, wouldCreateCycle]);

  // Update edge styles when node selection changes (connected edges turn cyan)
  const selectedIdsRef = useRef('');
  useEffect(() => {
    const ids = nodes.filter((n) => n.selected).map((n) => n.id).sort().join(',');
    if (ids === selectedIdsRef.current) return;
    selectedIdsRef.current = ids;

    const selectedNodeIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id));
    setEdges((eds) => eds.map((edge) => {
      const isConnected = selectedNodeIds.has(edge.source) || selectedNodeIds.has(edge.target);
      return {
        ...edge,
        selected: isConnected,
        style: isConnected ? { stroke: '#00d4ff', strokeWidth: 1 } : { stroke: '#555', strokeWidth: 1 },
      };
    }));
  }, [nodes]);

  const nodesWithCallbacks = useMemo(() => {
    return nodes.map((n) => ({
      ...n,
      data: { ...n.data, onStartLineDraw: startLineDraw },
    }));
  }, [nodes, startLineDraw]);

  // ─── Copy / Paste / Delete ───
  const clipboardRef = useRef<{ type: string; data: Record<string, unknown>; position: { x: number; y: number } }[]>([]);
  const pasteOffsetRef = useRef(0);

  const copyNodes = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (selected.length === 0) return;
    clipboardRef.current = selected.map((n) => ({
      type: n.type!,
      data: { ...n.data },
      position: { ...n.position },
    }));
    pasteOffsetRef.current = 0;
  }, [nodes]);

  const pasteNodes = useCallback(() => {
    if (clipboardRef.current.length === 0) return;
    pasteOffsetRef.current += 40;
    const offset = pasteOffsetRef.current;
    const pasted = clipboardRef.current.map((n, i) => ({
      id: `${n.type}-${Date.now()}-${i}`,
      type: n.type,
      position: { x: n.position.x + offset, y: n.position.y + offset },
      data: { ...n.data },
      selected: true,
    }));
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pasted]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    const hasSelectedNodes = nodes.some((n) => n.selected);
    const hasSelectedEdges = edges.some((e) => e.selected);
    if (!hasSelectedNodes && !hasSelectedEdges) return;
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [nodes, edges, setNodes, setEdges]);

  const duplicateNode = useCallback((id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: { x: node.position.x + 40, y: node.position.y + 40 },
      selected: true,
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), newNode]);
    setNodeContextMenu(null);
  }, [nodes, setNodes]);



  const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu(null);
    setNodeContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  // ─── Keyboard Shortcuts ───
  const copyRef = useRef(copyNodes);
  const pasteRef = useRef(pasteNodes);
  const deleteRef = useRef(deleteSelected);
  useEffect(() => { copyRef.current = copyNodes; }, [copyNodes]);
  useEffect(() => { pasteRef.current = pasteNodes; }, [pasteNodes]);
  useEffect(() => { deleteRef.current = deleteSelected; }, [deleteSelected]);

  // Prevent browser context menu on canvas area
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.react-flow__pane') || target.closest('.react-flow__renderer')) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handler, true);
    return () => document.removeEventListener('contextmenu', handler, true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        copyRef.current();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        pasteRef.current();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const target = e.target as HTMLElement;
        const tag = target.tagName.toLowerCase();
        const isEditing = tag === 'input' || tag === 'textarea' || target.isContentEditable;
        if (!isEditing) {
          deleteRef.current();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Drag & Drop State ───
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadToast, setUploadToast] = useState<{ msg: string; type: 'loading' | 'success' } | null>(null);
  const dragLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Toolbar State ───
  const [showMinimap, setShowMinimap] = useState(false);
  const [snapGrid, setSnapGrid] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showHelp, setShowHelp] = useState(false);

  const onViewportChange = useCallback((v: { x: number; y: number; zoom: number }) => {
    setZoom(v.zoom);
  }, []);

  const handleReset = useCallback(() => {
    fitView({ duration: 400 });
  }, [fitView]);

  const handleZoomSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    const current = getViewport();
    setViewport({ x: current.x, y: current.y, zoom: newZoom }, { duration: 0 });
  }, [setViewport, getViewport]);

  const addNode = useCallback(
    (type: string, pos?: { x: number; y: number }, customLabel?: string) => {
      const position = pos || { x: 400 + Math.random() * 100, y: 200 + Math.random() * 100 };
      const labels: Record<string, string> = {
        text: '文本节点',
        image: '图片生成',
        upscale: '高清放大',
        video: '视频生成',
        audio: '音频节点',
        script: '脚本节点',
        'video-merge': '视频合成',
      };
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: customLabel || labels[type] || type, ...(type === 'image' ? getRoleData(null) : {}) },
      };
      setNodes((nds) => [...nds, newNode]);
      setContextMenu(null);
    },
    [setNodes]
  );

  const handleDropFiles = useCallback(
    (files: FileList, screenX: number, screenY: number) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
      if (imageFiles.length === 0) return;

      const basePos = screenToFlowPosition({ x: screenX, y: screenY });
      setUploadToast({ msg: '上传中...', type: 'loading' });

      Promise.all(
        imageFiles.map((file, index) => {
          return new Promise<void>((resolve) => {
            const url = URL.createObjectURL(file);
            const imgEl = new window.Image();
            imgEl.onload = () => {
              const offsetX = index * 40;
              const offsetY = index * 40;
              const position = { x: basePos.x + offsetX, y: basePos.y + offsetY };
              const newNode: Node = {
                id: `image-${Date.now()}-${index}`,
                type: 'image',
                position,
                data: {
                  label: file.name.replace(/\.[^/.]+$/, ''),
                  image: url,
                  width: imgEl.width,
                  height: imgEl.height,
                  ...getRoleData(null),
                },
                selected: index === 0,
              };
              setNodes((nds) => [
                ...nds.map((n) => ({ ...n, selected: false })),
                newNode,
              ]);
              resolve();
            };
            imgEl.src = url;
          });
        })
      ).then(() => {
        setUploadToast({ msg: '上传并成功创建节点', type: 'success' });
        setTimeout(() => setUploadToast(null), 2500);
      });
    },
    [screenToFlowPosition, setNodes]
  );



  const sidebarTools = [
    { id: 'add', icon: Plus, label: '添加节点', active: activePanel === 'add' },
    { id: 'assets', icon: FolderOpen, label: '我的素材', active: activePanel === 'assets' },
    { id: 'skills', icon: ListTree, label: 'AI工具箱', active: activePanel === 'skills' },
    { id: 'support', icon: MessageCircle, label: '客服', active: activePanel === 'support' },
    { id: 'history', icon: History, label: '历史记录', active: activePanel === 'history' },
  ];

  return (
    <div className="h-screen relative" style={{ background: '#000' }}>
      <Navbar variant="canvas" projectName={projectName} />

      {/* Global style overrides */}
      <style>{`
        .react-flow__node {
          transition: box-shadow 200ms ease;
        }
        .react-flow__attribution {
          display: none !important;
        }
        /* Image node handles — hidden by default, shown on hover or when selected */
        .image-node-handle {
          opacity: 0;
          transition: opacity 200ms ease;
          pointer-events: auto;
          cursor: crosshair;
        }
        .react-flow__node:hover .image-node-handle,
        .react-flow__node.selected .image-node-handle,
        .image-node-handle:hover {
          opacity: 1;
        }
        .image-role-tag-button:hover {
          border-color: rgba(0,212,255,0.62) !important;
          color: #ffffff !important;
        }
        /* Edge colors — gray by default, cyan when selected */
        .react-flow__edge-path {
          stroke: #555;
          stroke-width: 1;
        }
        .react-flow__edge.selected .react-flow__edge-path {
          stroke: #00d4ff !important;
          stroke-width: 2px !important;
          filter: drop-shadow(0 0 6px rgba(0,212,255,0.6));
        }
        /* Hide default edge markers if any */
        .react-flow__edge .react-flow__edge-interaction {
          stroke: transparent;
        }
        /* Hide the persistent selection rect around selected nodes after box selection */
        .react-flow__nodesselection-rect {
          border: none !important;
          background: transparent !important;
        }
        /* Connection hover feedback on nodes */
        .react-flow__node.can-connect {
          box-shadow: 0 0 0 2px #00d4ff, 0 0 16px rgba(0, 212, 255, 0.5) !important;
          border-radius: 16px;
        }
        .react-flow__node.cannot-connect {
          box-shadow: 0 0 0 2px #ff4444, 0 0 20px rgba(255, 68, 68, 0.6) !important;
          border-radius: 16px;
        }
      `}</style>

      {/* Canvas */}
      <div
        className="absolute inset-0"
        style={{ cursor: tempLine ? 'crosshair' : 'default' }}
        onContextMenu={(e) => {
          if (isDrawingRef.current) { e.preventDefault(); return; }
          const target = e.target as HTMLElement;
          if (target.closest('.react-flow__node')) return;
          e.preventDefault();
          setNodeContextMenu(null);
          const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          setContextMenu({ x: e.clientX, y: e.clientY, flowPos: pos });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
          setIsDragOver(true);
        }}
        onDragLeave={(_e) => {
          if (dragLeaveTimer.current) clearTimeout(dragLeaveTimer.current);
          dragLeaveTimer.current = setTimeout(() => setIsDragOver(false), 50);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          handleDropFiles(e.dataTransfer.files, e.clientX, e.clientY);
        }}
      >
        {/* Drop overlay */}
        {isDragOver && (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center"
            style={{ background: 'rgba(10,10,15,0.75)', backdropFilter: 'blur(4px)' }}
          >
            <div
              className="px-6 py-4 rounded-2xl text-sm font-medium"
              style={{ background: '#252526', border: '1px solid #2a2a35', color: '#fff' }}
            >
              Drop images or videos here to upload
            </div>
          </div>
        )}

        {/* Temporary connection line (drawn while dragging from output port) */}
        <TempConnectionLine tempLine={tempLine} />

        {/* Connection rejected tooltip */}
        {rejectTooltip && (
          <div
            className="absolute z-50 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap pointer-events-none"
            style={{
              left: rejectTooltip.x,
              top: rejectTooltip.y,
              transform: 'translate(-50%, -140%)',
              background: '#252526',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {rejectTooltip.message}
          </div>
        )}

        <ReactFlow
          nodes={nodesWithCallbacks}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeContextMenu={onNodeContextMenu}
          onViewportChange={onViewportChange}
          onEdgeClick={(_event, edge) => {
            setEdges((eds) => eds.map((e) => ({ ...e, selected: e.id === edge.id })));
            setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
          }}
          onPaneClick={() => {
            setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
            setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
          }}
          nodeTypes={nodeTypes}
          snapToGrid={snapGrid}
          snapGrid={[24, 24]}
          selectionOnDrag
          panOnDrag={[1, 2]}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
          minZoom={0.2}
          maxZoom={4}
          attributionPosition="bottom-right"
          multiSelectionKeyCode={['Shift']}
        >
          <Background color={snapGrid ? 'rgba(42,42,53,0.6)' : '#2a2a35'} gap={24} size={1} variant={BackgroundVariant.Dots} />

          {/* MiniMap */}
          <Panel position="bottom-left" style={{ left: 16, bottom: 72, margin: 0 }}>
            <div
              className="transition-all duration-300 ease-out"
              style={{
                transform: showMinimap ? 'translateY(0)' : 'translateY(12px)',
                opacity: showMinimap ? 1 : 0,
                pointerEvents: showMinimap ? 'auto' : 'none',
              }}
            >
              <MiniMap
                style={{
                  position: 'relative',
                  left: 'auto',
                  bottom: 'auto',
                  right: 'auto',
                  top: 'auto',
                  width: 180,
                  height: 120,
                  background: '#252526',
                  border: '1px solid #2a2a35',
                  borderRadius: 12,
                  margin: 0,
                }}
                nodeColor={() => '#3a3a4a'}
                maskColor="rgba(10, 10, 15, 0.7)"
                maskStrokeColor="rgba(255,255,255,0.3)"
                maskStrokeWidth={2}
              />
            </div>
          </Panel>
        </ReactFlow>

        {/* Upload status toast */}
        {uploadToast && (
          <div
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2"
            style={{
              background: '#252526',
              border: '1px solid #2a2a35',
              color: uploadToast.type === 'success' ? '#22c55e' : '#fff',
            }}
          >
            {uploadToast.type === 'loading' && (
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            )}
            {uploadToast.type === 'success' && (
              <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            )}
            {uploadToast.msg}
          </div>
        )}
      </div>

      {/* Left Sidebar Pill */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-20">
        <div
          className="flex flex-col items-center py-3 gap-2 rounded-2xl"
          style={{
            width: 52,
            background: '#252526',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          <button
            onClick={() => setActivePanel(activePanel === 'add' ? null : 'add')}
            className="w-9 h-9 rounded-full flex items-center justify-center mb-1 transition-all relative"
            style={{ background: '#f0f0f0' }}
          >
            <Plus className="w-4 h-4 text-[#0a0a0f]" strokeWidth={2.5} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: '#00d4ff', border: '2px solid rgba(30, 30, 40, 0.75)' }}
            />
          </button>

          <div className="w-6 h-px bg-[#2a2a35]/50" />

          {sidebarTools.slice(1).map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActivePanel(activePanel === tool.id ? null : tool.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ color: tool.active ? '#00d4ff' : '#6a6a7a' }}
              title={tool.label}
            >
              <tool.icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          ))}

          <div className="w-6 h-px bg-[#2a2a35]/50" />

          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white"
            style={{
              background: '#2a2a35',
              border: '1.5px solid rgba(0, 212, 255, 0.25)',
            }}
          >
            B
          </div>
        </div>
      </div>

      {/* Side Panel */}
      {activePanel && (
        <div
          className="fixed z-10 overflow-y-auto nowheel"
          style={{
            left: 72,
            top: 56,
            bottom: 0,
            width: 280,
            background: '#252526',
            borderRight: '1px solid #2a2a35',
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a35]">
            <span className="text-sm font-medium text-white">
              {sidebarTools.find((t) => t.id === activePanel)?.label}
            </span>
            <button
              onClick={() => setActivePanel(null)}
              className="w-6 h-6 rounded flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {activePanel === 'add' && (
              <div className="space-y-2">
                <p className="text-xs text-[#6a6a7a] mb-2">添加节点</p>
                {[
                  { type: 'image', label: '图片节点', icon: Image, color: '#22d3ee' },
                  { type: 'upscale', label: '高清放大', icon: Image, color: '#a855f7' },
                ].map((item) =>(
                  <button
                    key={item.type}
                    onClick={() => addNode(item.type)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1e1e28] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                      <item.icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-white">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
            {activePanel === 'skills' && (
              <div className="text-center py-8">
                <Wand2 className="w-10 h-10 text-[#3a3a4a] mx-auto mb-3" />
                <p className="text-sm text-[#6a6a7a]">AI工具箱</p>
                <p className="text-xs text-[#3a3a4a] mt-1">选择节点后查看可用技能</p>
              </div>
            )}
            {activePanel === 'assets' && (
              <div>
                <div className="flex gap-2 mb-3">
                  {['全部', '人物', '场景', '物品', '风格', '音效', '其他'].map((tab) => (
                    <button key={tab} className="px-2 py-1 rounded text-[10px] text-[#a0a0b0] hover:bg-[#1e1e28] transition-colors">
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="text-center py-8">
                  <Image className="w-8 h-8 text-[#3a3a4a] mx-auto mb-2" />
                  <p className="text-xs text-[#6a6a7a]">暂无素材</p>
                </div>
              </div>
            )}
            {activePanel === 'history' && (
              <div>
                <div className="flex gap-4 mb-3 text-xs">
                  <span className="text-white">图片历史(6)</span>
                  <span className="text-[#6a6a7a]">视频历史(0)</span>
                  <span className="text-[#6a6a7a]">音频历史(0)</span>
                </div>
                <p className="text-[10px] text-[#6a6a7a] mb-2">2026-04-23</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square rounded-lg bg-[#1e1e28] overflow-hidden">
                      <img src={`/images/show-cover-${i}.jpg`} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activePanel === 'support' && (
              <div className="text-center py-8">
                <Headphones className="w-10 h-10 text-[#3a3a4a] mx-auto mb-3" />
                <p className="text-sm text-[#6a6a7a]">联系客服</p>
                <p className="text-xs text-[#3a3a4a] mt-1">客服在线时间 9:00-21:00</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Context Menu (right-click on canvas) */}
      {contextMenu && (
        <>
          <div
            className="fixed z-50 py-2 rounded-xl"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
              background: '#252526',
              border: '1px solid #2a2a35',
              boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
              minWidth: 280,
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
              setContextMenu({ x: e.clientX, y: e.clientY, flowPos: pos });
            }}
          >
            <div className="px-5 py-2.5 text-[13px] text-[#6a6a7a] uppercase tracking-wider">添加节点</div>
            {[
              { type: 'image', label: '图片节点', icon: Image, color: '#22d3ee' },
              { type: 'upscale', label: '高清放大', icon: Image, color: '#a855f7' },
            ].map((item, index) => (
              <button
                key={`${item.type}-${index}`}
                onClick={() => addNode(item.type, contextMenu.flowPos, item.label)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left text-[16px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
              >
                <item.icon className="w-5 h-5" style={{ color: item.color }} />
                {item.label}
              </button>
            ))}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null); }} />
        </>
      )}

      {/* Create Node Menu (drop on empty canvas during connection) */}
      {createMenu && (
        <>
          <div
            className="fixed z-50 py-2 rounded-xl"
            style={{
              left: createMenu.x,
              top: createMenu.y,
              background: '#252526',
              border: '1px solid #2a2a35',
              boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
              minWidth: 200,
            }}
          >
            <div className="px-4 py-2 text-[13px] text-[#6a6a7a] uppercase tracking-wider">创建节点并连接</div>
            <button
              onClick={() => {
                const newNodeId = `image-${Date.now()}`;
                const newNode: Node = {
                  id: newNodeId,
                  type: 'image',
                  position: createMenu.flowPos,
                  data: { label: '图片节点', ...getRoleData(null) },
                };
                setNodes((nds) => [...nds, newNode]);
                setEdges((eds) => [...eds, { id: `e-${Date.now()}`, source: createMenu.sourceNodeId, target: newNodeId }]);
                setCreateMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Image className="w-4 h-4" style={{ color: '#22d3ee' }} /> 图片节点
            </button>
            <button
              onClick={() => {
                const newNodeId = `upscale-${Date.now()}`;
                const newNode: Node = {
                  id: newNodeId,
                  type: 'upscale',
                  position: createMenu.flowPos,
                  data: { label: '高清放大' },
                };
                setNodes((nds) => [...nds, newNode]);
                setEdges((eds) => [...eds, { id: `e-${Date.now()}`, source: createMenu.sourceNodeId, target: newNodeId }]);
                setCreateMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Image className="w-4 h-4" style={{ color: '#a855f7' }} /> 高清放大
            </button>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => { setContextMenu(null); setNodeContextMenu(null); setCreateMenu(null); }} onContextMenu={(e) => { e.preventDefault(); setCreateMenu(null); }} />
        </>
      )}

      {/* Node Context Menu (right-click on node) */}
      {nodeContextMenu && (
        <>
          <div
            className="fixed z-50 py-1.5 rounded-xl"
            onContextMenu={(e) => {
              e.preventDefault();
              setNodeContextMenu({ x: e.clientX, y: e.clientY, nodeId: nodeContextMenu.nodeId });
            }}
            style={{
              left: nodeContextMenu.x,
              top: nodeContextMenu.y,
              background: '#252526',
              border: '1px solid #2a2a35',
              boxShadow: '0 12px 32px rgba(0,0,0,0.55)',
              minWidth: 200,
            }}
          >
            <button
              onClick={() => { setNodeContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> 保存到素材库
            </button>
            <button
              onClick={() => { duplicateNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> 复制</span>
              <span className="text-[11px] text-[#6a6a7a]">Ctrl+C</span>
            </button>
            <button
              onClick={() => { pasteNodes(); setNodeContextMenu(null); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <span className="flex items-center gap-2"><ClipboardPaste className="w-3.5 h-3.5" /> 粘贴</span>
              <span className="text-[11px] text-[#6a6a7a]">Ctrl+V</span>
            </button>
            <button
              onClick={() => { duplicateNode(nodeContextMenu.nodeId); setNodeContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> 副本
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
            <button
              onClick={() => {
                const id = nodeContextMenu.nodeId;
                setNodes((nds) => nds.filter((n) => n.id !== id));
                setNodeContextMenu(null);
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-left text-[14px] text-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] transition-colors"
            >
              <span className="flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> 删除</span>
              <span className="text-[11px] text-[#6a6a7a]">⌫,del</span>
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
            <button
              onClick={() => { copyNodes(); setNodeContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Copy className="w-3.5 h-3.5" /> 复制到剪贴板
            </button>
            <button
              onClick={() => { setNodeContextMenu(null); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#a0a0b0] hover:bg-white/5 hover:text-white transition-colors"
            >
              <Bug className="w-3.5 h-3.5" /> 问题反馈
            </button>
          </div>
          <div className="fixed inset-0 z-40" onClick={() => { setContextMenu(null); setNodeContextMenu(null); }} onContextMenu={(e) => { e.preventDefault(); setNodeContextMenu(null); }} />
        </>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2"
          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
          {toastMsg}
        </div>
      )}

      {/* Bottom Toolbar */}
      <div
        className="fixed z-20 flex items-center gap-1 px-2 py-1.5 rounded-xl"
        style={{
          left: 16,
          bottom: 16,
          background: '#252526',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* 小地图开关 */}
        <button
          onClick={() => setShowMinimap((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${showMinimap ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="小地图"
        >
          <MapIcon className="w-4 h-4" />
        </button>

        {/* 网格吸附 */}
        <button
          onClick={() => setSnapGrid((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${snapGrid ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="网格吸附"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>

        {/* 重置视图 */}
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* 缩放滑块 */}
        <div className="flex items-center gap-1.5 px-1" title="放大/缩小画布（Ctrl+滚轮）">
          <Minus className="w-3 h-3 text-[#e0e0e0]" />
          <input
            type="range"
            min={0.4}
            max={4}
            step={0.05}
            value={zoom}
            onChange={handleZoomSlider}
            className="w-20 h-1 cursor-pointer"
            style={{ accentColor: '#22d3ee' }}
          />
          <Plus className="w-3 h-3 text-[#e0e0e0]" />
        </div>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* 帮助按钮 */}
        <button
          onClick={() => setShowHelp(true)}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title="快捷键帮助"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowHelp(false)}>
          <div
            className="w-72 rounded-xl p-5"
            style={{ background: '#252526', border: '1px solid #2a2a35', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">快捷键</h3>
              <button onClick={() => setShowHelp(false)} className="text-[#e0e0e0] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              {[
                { key: '滚轮', action: '缩放画布' },
                { key: '中键拖拽', action: '平移画布' },
                { key: '左键拖拽空白处', action: '框选节点' },
                { key: 'Shift + 点击', action: '多选节点' },
                { key: 'Ctrl + C', action: '复制选中节点' },
                { key: 'Ctrl + V', action: '粘贴节点' },
                { key: 'Delete / Backspace', action: '删除选中节点' },
                { key: '右键画布', action: '添加节点菜单' },
                { key: '拖拽连接点', action: '建立连线' },
              ].map((item) => (
                <div key={item.key} className="flex justify-between">
                  <span className="text-[#6a6a7a]">{item.key}</span>
                  <span className="text-white">{item.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Wrapper ─── */

export default function CanvasPage() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
