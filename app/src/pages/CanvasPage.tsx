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
  Bookmark,
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
  MapPin,
  Star,
  Eye,
  Mountain,
  ScanEye,
  User,
  Trash2 as TrashIcon,
} from 'lucide-react';
import { getProjectCanvasData, recentProjects } from '../data/siteData';

const IMAGE_NODE_PREVIEW_WIDTH = 410;
const IMAGE_NODE_EMPTY_HEIGHT = 230;
const IMAGE_NODE_MIN_IMAGE_SIZE = 180;
const IMAGE_NODE_MAX_IMAGE_WIDTH = 520;
const IMAGE_NODE_MAX_IMAGE_HEIGHT = 360;
const IMAGE_NODE_CONTROL_WIDTH = 640;
const IMAGE_NODE_CONTROL_HEIGHT = 252;
const IMAGE_NODE_CONTROL_EXPANDED_HEIGHT = 344;
const FLOATING_PANEL_BACKGROUND = '#252526';
const FLOATING_PANEL_BORDER = '1px solid rgba(255,255,255,0.08)';

const browserWindow = typeof window !== 'undefined'
  ? window as typeof window & { __visionerFullscreenDropForwarder?: boolean }
  : null;

if (browserWindow && !browserWindow.__visionerFullscreenDropForwarder) {
  browserWindow.__visionerFullscreenDropForwarder = true;

  const showFullscreenDropHint = () => {
    let hint = document.getElementById('visioner-fullscreen-drop-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'visioner-fullscreen-drop-hint';
      hint.textContent = '拖放图片或视频以上传';
      Object.assign(hint.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '9999',
        display: 'none',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3,3,7,0.62)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '700',
        pointerEvents: 'none',
      });
      const text = document.createElement('div');
      text.textContent = '拖放图片或视频以上传';
      Object.assign(text.style, {
        padding: '18px 28px',
        borderRadius: '14px',
        background: '#252526',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
      });
      hint.textContent = '';
      hint.appendChild(text);
      document.body.appendChild(hint);
    }
    hint.style.display = 'flex';
  };

  const hideFullscreenDropHint = () => {
    const hint = document.getElementById('visioner-fullscreen-drop-hint');
    if (hint) hint.style.display = 'none';
  };

  browserWindow.addEventListener('dragover', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    showFullscreenDropHint();
  }, true);

  browserWindow.addEventListener('drop', (event) => {
    if (!event.dataTransfer?.types.includes('Files')) return;
    if ((event as DragEvent & { __visionerForwardedDrop?: boolean }).__visionerForwardedDrop) {
      hideFullscreenDropHint();
      return;
    }

    hideFullscreenDropHint();
    const pane = document.querySelector('.react-flow__pane');
    if (!pane) return;

    event.preventDefault();
    event.stopPropagation();
    const forwardedDrop = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      dataTransfer: event.dataTransfer,
    });
    Object.defineProperty(forwardedDrop, '__visionerForwardedDrop', { value: true });
    pane.dispatchEvent(forwardedDrop);
  }, true);

  browserWindow.addEventListener('dragleave', (event) => {
    if (event.clientX <= 0 || event.clientY <= 0 || event.clientX >= browserWindow.innerWidth || event.clientY >= browserWindow.innerHeight) {
      hideFullscreenDropHint();
    }
  }, true);

  browserWindow.addEventListener('dragend', hideFullscreenDropHint, true);
}

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
    label: '氛围参考',
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

/* ─── Preset System ─── */
interface PresetItem {
  id: string;
  name: string;
  tabs: PresetTab[];
  category: 'realism' | 'mood' | 'environment' | 'perspective' | 'style';
  group: string;
  selectType: 'single' | 'multi';
  shortDescription: string;
  promptTemplate: string;
  tags: string[];
  thumbnail: string;
}

const PRESET_TABS = ['常用', '变真实', '换氛围', '换环境', '换视角', '风格', '我的'] as const;
type PresetTab = typeof PRESET_TABS[number];

const MAX_MULTI_PRESETS_BY_GROUP: Partial<Record<PresetItem['group'], number>> = {
  accent_style: 2,
  detail_realism: 2,
};

const PRESET_DATA: PresetItem[] = [
  // ── 变真实 ──
  {
    id: 'photorealistic',
    name: '照片般真实',
    tabs: ['常用', '变真实'],
    category: 'realism',
    group: 'main_realism',
    selectType: 'single',
    shortDescription: '全局真实度增强',
    promptTemplate: '整体处理为照片般真实的建筑可视化效果，增强材质真实度、自然光影与环境细节，减少AI生成感。',
    tags: ['照片', '真实', '写实'],
    thumbnail: '/images/show-cover-1.jpg',
  },
  {
    id: 'commercial_render',
    name: '商业渲染',
    tabs: ['变真实'],
    category: 'realism',
    group: 'main_realism',
    selectType: 'single',
    shortDescription: '高精度商业级表现',
    promptTemplate: '以商业建筑渲染标准处理画面，强调材质精度、灯光层次与空间品质感。',
    tags: ['商业', '渲染', '精度'],
    thumbnail: '/images/show-cover-2.jpg',
  },
  {
    id: 'material_enhance',
    name: '材质强化',
    tabs: ['常用', '变真实'],
    category: 'realism',
    group: 'detail_realism',
    selectType: 'multi',
    shortDescription: '玻璃 / 金属 / 混凝土',
    promptTemplate: '强化建筑材质的表现力，优化玻璃反射、金属光泽、混凝土纹理与木材肌理等细节。',
    tags: ['材质', '纹理', '反射'],
    thumbnail: '/images/show-cover-3.jpg',
  },
  {
    id: 'glass_reflection',
    name: '玻璃反射',
    tabs: ['变真实'],
    category: 'realism',
    group: 'detail_realism',
    selectType: 'multi',
    shortDescription: '优化玻璃镜面反射',
    promptTemplate: '重点优化玻璃幕墙的反射效果，增强环境映射与镜面真实感。',
    tags: ['玻璃', '反射', '幕墙'],
    thumbnail: '/images/show-cover-4.jpg',
  },
  {
    id: 'reduce_ai_feel',
    name: '降低AI感',
    tabs: ['变真实'],
    category: 'realism',
    group: 'detail_realism',
    selectType: 'multi',
    shortDescription: '弱化AI生成痕迹',
    promptTemplate: '降低画面的AI生成感，优化自然度与手工质感，使图像更接近真实摄影或手工渲染。',
    tags: ['AI感', '自然', '真实'],
    thumbnail: '/images/show-cover-5.jpg',
  },
  {
    id: 'unify_texture',
    name: '统一质感',
    tabs: ['变真实'],
    category: 'realism',
    group: 'detail_realism',
    selectType: 'multi',
    shortDescription: '统一材质表现语言',
    promptTemplate: '统一画面整体材质语言与质感表达，使不同材质之间的过渡更自然协调。',
    tags: ['统一', '质感', '协调'],
    thumbnail: '/images/show-cover-6.jpg',
  },
  // ── 换氛围 ──
  {
    id: 'sunset_mood',
    name: '黄昏氛围',
    tabs: ['常用', '换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '暖色天空 / 柔和侧光',
    promptTemplate: '将整体画面调整为黄昏氛围，呈现暖色天空、柔和侧光和傍晚情绪，保持建筑主体结构、相机角度和构图比例不变。',
    tags: ['黄昏', '傍晚', '暖色', '侧光'],
    thumbnail: '/images/show-cover-7.jpg',
  },
  {
    id: 'morning_mood',
    name: '清晨氛围',
    tabs: ['换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '柔和晨光 / 清新空气',
    promptTemplate: '营造清晨氛围，呈现柔和晨光、清新空气感与明亮温和的情绪，保持建筑主体结构、相机角度和构图比例不变。',
    tags: ['清晨', '晨光', '清新'],
    thumbnail: '/images/show-cover-8.jpg',
  },
  {
    id: 'afternoon_sun',
    name: '午后阳光',
    tabs: ['换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '强烈阳光 / 清晰阴影',
    promptTemplate: '调整为午后阳光氛围，呈现强烈阳光照射、清晰阴影与明亮通透的画面感。',
    tags: ['午后', '阳光', '明亮'],
    thumbnail: '/images/show-cover-9.jpg',
  },
  {
    id: 'night_lighting',
    name: '夜景灯光',
    tabs: ['常用', '换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '室内灯光 / 深蓝天空',
    promptTemplate: '转为夜景表现，增强室内灯光与建筑外立面照明效果，优化夜晚天空的深蓝调与城市光污染的层次。',
    tags: ['夜景', '灯光', '深蓝'],
    thumbnail: '/images/show-cover-10.jpg',
  },
  {
    id: 'soft_diffused',
    name: '柔和散射光',
    tabs: ['换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '阴天柔光 / 无硬边',
    promptTemplate: '使用柔和散射光处理画面，消除硬边阴影，呈现细腻均匀的光影过渡。',
    tags: ['柔和', '散射', '均匀'],
    thumbnail: '/images/show-cover-11.jpg',
  },
  {
    id: 'grey_mood',
    name: '高级灰氛围',
    tabs: ['换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '低饱和灰调 / 克制情绪',
    promptTemplate: '营造高级灰氛围，降低整体饱和度，使用克制、内敛的色调表达建筑情绪。',
    tags: ['高级灰', '低饱和', '克制'],
    thumbnail: '/images/show-cover-12.jpg',
  },
  {
    id: 'morning_fog',
    name: '清晨雾气',
    tabs: ['常用', '换氛围'],
    category: 'mood',
    group: 'main_mood',
    selectType: 'single',
    shortDescription: '薄雾 / 空气透视',
    promptTemplate: '添加柔和的清晨薄雾效果，降低远景对比度，增强空气透视感，使建筑在朦胧晨光中呈现诗意的氛围与层次感。',
    tags: ['雾气', '清晨', '朦胧'],
    thumbnail: '/images/show-cover-13.jpg',
  },
  // ── 换环境 ──
  {
    id: 'sunny',
    name: '晴天',
    tabs: ['换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '晴朗无云',
    promptTemplate: '将环境设为晴朗天气，呈现明亮通透的天空与清晰的光影关系。',
    tags: ['晴天', '晴朗', '明亮'],
    thumbnail: '/images/show-cover-14.jpg',
  },
  {
    id: 'cloudy',
    name: '阴天',
    tabs: ['换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '多云覆盖',
    promptTemplate: '将环境设为阴天，呈现多云覆盖的天空与柔和均匀的光线。',
    tags: ['阴天', '多云', '柔和'],
    thumbnail: '/images/show-cover-15.jpg',
  },
  {
    id: 'after_rain',
    name: '雨后',
    tabs: ['常用', '换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '湿润路面 / 反射细节',
    promptTemplate: '呈现雨后环境，湿润路面与反射细节，空气清透，云层富有层次。',
    tags: ['雨后', '湿润', '反射'],
    thumbnail: '/images/show-cover-16.jpg',
  },
  {
    id: 'light_rain',
    name: '小雨',
    tabs: ['换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '细雨氛围',
    promptTemplate: '添加小雨氛围，呈现细雨、湿润感与柔和的环境反射。',
    tags: ['小雨', '细雨', '湿润'],
    thumbnail: '/images/show-cover-17.jpg',
  },
  {
    id: 'snow_scene',
    name: '雪景',
    tabs: ['常用', '换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '积雪覆盖 / 冬季冷调',
    promptTemplate: '添加积雪覆盖效果，优化雪的质感与厚度分布，增强冬季冷色调氛围。',
    tags: ['雪景', '冬季', '积雪'],
    thumbnail: '/images/show-cover-18.jpg',
  },
  {
    id: 'foggy',
    name: '雾气',
    tabs: ['换环境'],
    category: 'environment',
    group: 'weather',
    selectType: 'single',
    shortDescription: '浓雾 / 朦胧远景',
    promptTemplate: '添加浓雾效果，营造朦胧远景与神秘氛围，降低远景清晰度。',
    tags: ['雾气', '朦胧', '远景'],
    thumbnail: '/images/show-cover-19.jpg',
  },
  {
    id: 'spring',
    name: '春季',
    tabs: ['换环境'],
    category: 'environment',
    group: 'season',
    selectType: 'single',
    shortDescription: '生机 / 绿意',
    promptTemplate: '呈现春季环境，增强绿意与生机感，优化植物色彩与光线温度。',
    tags: ['春季', '生机', '绿意'],
    thumbnail: '/images/show-cover-20.jpg',
  },
  {
    id: 'summer',
    name: '夏季',
    tabs: ['换环境'],
    category: 'environment',
    group: 'season',
    selectType: 'single',
    shortDescription: '浓绿 / 强烈阳光',
    promptTemplate: '呈现夏季环境，浓绿植被与强烈阳光，增强画面的活力与饱和度。',
    tags: ['夏季', '浓绿', '阳光'],
    thumbnail: '/images/show-cover-1.jpg',
  },
  {
    id: 'autumn',
    name: '秋季',
    tabs: ['常用', '换环境'],
    category: 'environment',
    group: 'season',
    selectType: 'single',
    shortDescription: '金黄 / 温暖色调',
    promptTemplate: '呈现秋季环境，金黄植被与温暖色调，优化落叶与光线氛围。',
    tags: ['秋季', '金黄', '温暖'],
    thumbnail: '/images/show-cover-2.jpg',
  },
  {
    id: 'winter',
    name: '冬季',
    tabs: ['换环境'],
    category: 'environment',
    group: 'season',
    selectType: 'single',
    shortDescription: '萧瑟 / 冷色调',
    promptTemplate: '呈现冬季环境，萧瑟景观与冷色调，优化枯枝与清冷光线。',
    tags: ['冬季', '萧瑟', '冷调'],
    thumbnail: '/images/show-cover-3.jpg',
  },
  // ── 换视角 ──
  {
    id: 'human_eye',
    name: '人视角',
    tabs: ['换视角'],
    category: 'perspective',
    group: 'perspective',
    selectType: 'single',
    shortDescription: '1.6m 眼高 / 自然透视',
    promptTemplate: '调整为人视角（约1.6m眼高），呈现自然的人体透视与尺度感，尽量保持建筑主体设计、体量关系、材质逻辑和设计语言一致。',
    tags: ['人视角', '眼高', '自然'],
    thumbnail: '/images/show-cover-4.jpg',
  },
  {
    id: 'street_view',
    name: '街景视角',
    tabs: ['换视角'],
    category: 'perspective',
    group: 'perspective',
    selectType: 'single',
    shortDescription: '街道水平视角',
    promptTemplate: '调整为街景视角，呈现街道水平观察角度与城市环境关系，尽量保持建筑主体设计、体量关系、材质逻辑和设计语言一致。',
    tags: ['街景', '街道', '水平'],
    thumbnail: '/images/show-cover-5.jpg',
  },
  {
    id: 'entrance_closeup',
    name: '入口特写',
    tabs: ['换视角'],
    category: 'perspective',
    group: 'perspective',
    selectType: 'single',
    shortDescription: '入口区域聚焦',
    promptTemplate: '调整为入口特写视角，聚焦建筑入口区域的空间细节与材质表现，尽量保持建筑主体设计、体量关系、材质逻辑和设计语言一致。',
    tags: ['入口', '特写', '聚焦'],
    thumbnail: '/images/show-cover-6.jpg',
  },
  {
    id: 'drone_view',
    name: '无人机视角',
    tabs: ['常用', '换视角'],
    category: 'perspective',
    group: 'perspective',
    selectType: 'single',
    shortDescription: '鸟瞰 / 半鸟瞰',
    promptTemplate: '调整为无人机视角（鸟瞰或半鸟瞰），呈现建筑整体布局与周边环境关系，尽量保持建筑主体设计、体量关系、材质逻辑和设计语言一致。',
    tags: ['无人机', '鸟瞰', '俯瞰'],
    thumbnail: '/images/show-cover-7.jpg',
  },
  // ── 风格 ──
  {
    id: 'mir_style',
    name: 'MIR风格',
    tabs: ['风格'],
    category: 'style',
    group: 'main_style',
    selectType: 'single',
    shortDescription: 'MIR 建筑表现风格',
    promptTemplate: '以MIR建筑表现工作室风格处理画面，强调艺术化表达、戏剧化光线与精致的环境叙事。',
    tags: ['MIR', '艺术', '戏剧'],
    thumbnail: '/images/show-cover-8.jpg',
  },
  {
    id: 'binyan_style',
    name: 'BINYAN风格',
    tabs: ['风格'],
    category: 'style',
    group: 'main_style',
    selectType: 'single',
    shortDescription: 'BINYAN 表现风格',
    promptTemplate: '以BINYAN建筑表现风格处理画面，强调清晰的材质表达、现代感构图与干净的光影。',
    tags: ['BINYAN', '现代', '清晰'],
    thumbnail: '/images/show-cover-9.jpg',
  },
  {
    id: 'magazine_style',
    name: '杂志感',
    tabs: ['风格'],
    category: 'style',
    group: 'main_style',
    selectType: 'single',
    shortDescription: '建筑杂志排版感',
    promptTemplate: '以建筑杂志视觉风格处理画面，强调构图的排版感、留白与精致的视觉层次。',
    tags: ['杂志', '排版', '留白'],
    thumbnail: '/images/show-cover-10.jpg',
  },
  {
    id: 'nature_forest',
    name: '自然森系',
    tabs: ['风格'],
    category: 'style',
    group: 'main_style',
    selectType: 'single',
    shortDescription: '自然 / 生态 / 有机',
    promptTemplate: '以自然森系风格处理画面，强调生态有机感、植物与建筑的融合以及自然光线。',
    tags: ['自然', '森系', '生态'],
    thumbnail: '/images/show-cover-11.jpg',
  },
  {
    id: 'cold_tech',
    name: '冷调科技',
    tabs: ['风格'],
    category: 'style',
    group: 'main_style',
    selectType: 'single',
    shortDescription: '冷色调 / 科技感',
    promptTemplate: '以冷调科技风格处理画面，使用冷色调、简洁线条与未来感材质表达。',
    tags: ['冷调', '科技', '未来'],
    thumbnail: '/images/show-cover-12.jpg',
  },
  {
    id: 'low_saturation',
    name: '低饱和',
    tabs: ['常用', '风格'],
    category: 'style',
    group: 'accent_style',
    selectType: 'multi',
    shortDescription: '低饱和度 / 克制',
    promptTemplate: '降低画面饱和度，呈现克制、内敛的视觉风格。',
    tags: ['低饱和', '克制', '内敛'],
    thumbnail: '/images/show-cover-13.jpg',
  },
  {
    id: 'grey_style',
    name: '高级灰',
    tabs: ['风格'],
    category: 'style',
    group: 'accent_style',
    selectType: 'multi',
    shortDescription: '高级灰色调',
    promptTemplate: '使用高级灰色调处理画面，呈现优雅、克制的色彩关系。',
    tags: ['高级灰', '优雅', '克制'],
    thumbnail: '/images/show-cover-14.jpg',
  },
  {
    id: 'warm_estate',
    name: '暖调地产',
    tabs: ['风格'],
    category: 'style',
    group: 'accent_style',
    selectType: 'multi',
    shortDescription: '温暖色调 / 地产感',
    promptTemplate: '使用温暖色调处理画面，呈现地产宣传图常见的温馨、舒适与品质感。',
    tags: ['暖调', '地产', '温馨'],
    thumbnail: '/images/show-cover-15.jpg',
  },
  {
    id: 'low_saturation_realism',
    name: '低饱和写实',
    tabs: ['常用'],
    category: 'style',
    group: 'accent_style',
    selectType: 'multi',
    shortDescription: '低饱和 / 写实',
    promptTemplate: '以低饱和写实风格处理画面，克制色调与真实质感相结合。',
    tags: ['低饱和', '写实', '克制'],
    thumbnail: '/images/show-cover-16.jpg',
  },
];

const PRESET_BY_ID = new Map(PRESET_DATA.map((preset) => [preset.id, preset]));

const getPresetById = (id: string) => PRESET_BY_ID.get(id);

function buildFinalPrompt(userText: string, selectedPresetIds: string[]): string {
  const trimmedUserText = userText.trim();
  const presetPrompts = selectedPresetIds
    .map(getPresetById)
    .filter((preset): preset is PresetItem => Boolean(preset))
    .map((preset) => preset.promptTemplate);

  return [trimmedUserText, ...presetPrompts].filter(Boolean).join('。');
}

/* ─── Mark System ─── */
type MarkAction = 'reference' | 'keep' | 'enhance' | 'weaken' | 'replace' | 'delete' | 'constraint';

interface MarkItem {
  id: string;
  name: string;
  action: MarkAction;
  sourceIndex: number;
  description: string;
}

const MARK_ACTION_LABELS: Record<MarkAction, string> = {
  reference: '参考',
  keep: '保留',
  enhance: '强化',
  weaken: '弱化',
  replace: '替换',
  delete: '删除',
  constraint: '约束',
};

const MARK_ACTION_COLORS: Record<MarkAction, string> = {
  reference: '#4aa3ff',
  keep: '#4ade80',
  enhance: '#f59e0b',
  weaken: '#a78bfa',
  replace: '#fb923c',
  delete: '#ef4444',
  constraint: '#22d3ee',
};

/* ─── Model Params ─── */
interface ModelParams {
  model: string;
  ratio: string;
  resolution: string;
  lens: string;
  count: string;
}

const DEFAULT_MODEL_PARAMS: ModelParams = {
  model: 'Nano Banana 2',
  ratio: '1:1',
  resolution: '2K',
  lens: '标准',
  count: '1张',
};

const MODEL_OPTIONS = [
  { name: 'Nano Banana 2', icon: 'G', iconBg: '#4285f4', tags: ['Precise', 'Quality', 'Fast'], time: '25s' },
  { name: 'Nano Banana Pro', icon: 'G', iconBg: '#34a853', tags: ['Precise', 'Quality'], time: '50s' },
  { name: 'GPT Image 2', icon: '◎', iconBg: '#10a37f', tags: ['Style'], time: '40s' },
];

const RESOLUTION_OPTIONS = ['1K', '2K', '4K'];

const RATIO_OPTIONS = [
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

const COUNT_OPTIONS = ['1张', '2张', '4张'];

/* ─── Reference Info Type ─── */
interface ReferenceInfo {
  nodeId: string;
  index: number;
  role: ImageRole | null;
  roleLabel: string;
  imageUrl: string;
}

function getReferencePromptText(reference: ReferenceInfo) {
  const label = reference.roleLabel || '引用素材';
  if (reference.role === 'primary_building' || label.includes('主体建筑')) {
    return `@${label}（@${reference.index}） 保持建筑结构、视角、构图。`;
  }
  if (label.includes('整体')) {
    return `@${label}（@${reference.index}） 参考整体氛围、时间段、灯光。`;
  }
  if (label.includes('天空')) {
    return `@${label}（@${reference.index}） 参考天空颜色、云层和光照氛围。`;
  }
  if (label.includes('材质')) {
    return `@${label}（@${reference.index}） 参考材质纹理、反射和细节质感。`;
  }
  if (label.includes('景观') || label.includes('植物')) {
    return `@${label}（@${reference.index}） 参考景观层次、植物配置和环境氛围。`;
  }
  return `@${label}（@${reference.index}） 参考该素材的关键视觉特征。`;
}

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
            background: FLOATING_PANEL_BACKGROUND,
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

/* ─── Image Node Control Panel ─── */
function ImageNodeControlPanel({
  promptText,
  onPromptChange,
  marks,
  onMarksChange,
  selectedPresets,
  onPresetsChange,
  modelParams,
  onModelParamsChange,
  onGenerate,
  canGenerate,
  references,
  onRemoveReference,
  onUseReference,
  onAssignReferenceRole,
}: {
  promptText: string;
  onPromptChange: (value: string) => void;
  marks: MarkItem[];
  onMarksChange: (marks: MarkItem[]) => void;
  selectedPresets: string[];
  onPresetsChange: (presets: string[]) => void;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  references: ReferenceInfo[];
  onRemoveReference: (nodeId: string) => void;
  onUseReference: (reference: ReferenceInfo) => void;
  onAssignReferenceRole: (nodeId: string, role: ImageRole) => ReferenceInfo | null;
}) {
  const [showMarkPanel, setShowMarkPanel] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState<PresetTab>('常用');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [pendingReference, setPendingReference] = useState<ReferenceInfo | null>(null);
  const [markName, setMarkName] = useState('');
  const [markAction, setMarkAction] = useState<MarkAction>('enhance');
  const [markDesc, setMarkDesc] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const selectedModel = MODEL_OPTIONS.find((m) => m.name === modelParams.model) || MODEL_OPTIONS[0];
  const visiblePresets = useMemo(
    () => PRESET_DATA.filter((preset) => preset.tabs.includes(activePresetTab)),
    [activePresetTab],
  );
  const slashFilteredPresets = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    if (!query) return PRESET_DATA;

    return PRESET_DATA.filter((preset) => (
      preset.name.toLowerCase().includes(query)
      || preset.tags.some((tag) => tag.toLowerCase().includes(query))
    ));
  }, [slashQuery]);

  const selectPreset = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset) return;

    if (selectedPresets.includes(presetId)) {
      removePreset(presetId);
      return;
    }

    let nextPresets = selectedPresets.filter((id) => {
      const selectedPreset = getPresetById(id);
      if (!selectedPreset) return false;
      if (selectedPreset.group !== preset.group) return true;
      return preset.selectType === 'multi';
    });

    if (preset.id === 'snow_scene') {
      nextPresets = nextPresets.filter((id) => id !== 'summer');
    } else if (preset.id === 'summer') {
      nextPresets = nextPresets.filter((id) => id !== 'snow_scene');
    }

    const groupLimit = MAX_MULTI_PRESETS_BY_GROUP[preset.group];
    if (preset.selectType === 'multi' && groupLimit) {
      const presetsInGroup = nextPresets.filter((id) => getPresetById(id)?.group === preset.group);
      const overflowCount = presetsInGroup.length - groupLimit + 1;
      if (overflowCount > 0) {
        const idsToRemove = new Set(presetsInGroup.slice(0, overflowCount));
        nextPresets = nextPresets.filter((id) => !idsToRemove.has(id));
      }
    }

    onPresetsChange([...nextPresets, presetId]);
  };

  const removePreset = (presetId: string) => {
    onPresetsChange(selectedPresets.filter((id) => id !== presetId));
  };

  const addMark = () => {
    if (!markName.trim()) return;
    const newMark: MarkItem = {
      id: `mark-${Date.now()}`,
      name: markName.trim(),
      action: markAction,
      sourceIndex: 1,
      description: markDesc.trim(),
    };
    onMarksChange([...marks, newMark]);
    // 只插入元素锚点，不自动追加动作描述
    const markPrompt = `@${newMark.name}（@${newMark.sourceIndex}）`;
    const newText = promptText ? `${promptText}\n\n${markPrompt}` : markPrompt;
    onPromptChange(newText);
    setMarkName('');
    setMarkDesc('');
    setShowMarkPanel(false);
  };

  const removeMark = (markId: string) => {
    onMarksChange(marks.filter((m) => m.id !== markId));
  };

  const closeReferenceMenus = () => {
    setShowReferenceMenu(false);
    setPendingReference(null);
  };

  const focusReferencePrompt = (reference: ReferenceInfo) => {
    const text = getReferencePromptText(reference);
    const existingIndex = promptText.indexOf(text);
    if (existingIndex < 0) return false;

    requestAnimationFrame(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.setSelectionRange(existingIndex, existingIndex + text.length);
    });
    return true;
  };

  const insertReferencePrompt = (reference: ReferenceInfo) => {
    const text = getReferencePromptText(reference);
    if (focusReferencePrompt(reference)) {
      closeReferenceMenus();
      return;
    }

    const input = promptInputRef.current;
    const selectionStart = input?.selectionStart ?? promptText.length;
    const selectionEnd = input?.selectionEnd ?? selectionStart;
    const atStart = selectionStart > 0 && promptText[selectionStart - 1] === '@' ? selectionStart - 1 : selectionStart;
    const prefix = promptText.slice(0, atStart);
    const suffix = promptText.slice(selectionEnd);
    const spacerBefore = prefix.trim().length > 0 && !prefix.endsWith('\n') ? '\n\n' : '';
    const spacerAfter = suffix.trim().length > 0 && !suffix.startsWith('\n') ? '\n\n' : '';
    const nextText = `${prefix}${spacerBefore}${text}${spacerAfter}${suffix}`;
    const nextCursor = prefix.length + spacerBefore.length + text.length;

    onPromptChange(nextText);
    closeReferenceMenus();
    requestAnimationFrame(() => {
      promptInputRef.current?.focus();
      promptInputRef.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const requestReferenceInsert = (reference: ReferenceInfo) => {
    if (!reference.role) {
      setPendingReference(reference);
      setShowReferenceMenu(false);
      return;
    }
    onUseReference(reference);
    insertReferencePrompt(reference);
  };

  const handleReferenceRoleSelect = (role: ImageRole) => {
    if (!pendingReference) return;
    const roleLabel = imageRoleOptions.find((option) => option.value === role)?.label || pendingReference.roleLabel;
    const updatedReference = onAssignReferenceRole(pendingReference.nodeId, role) || { ...pendingReference, role, roleLabel };
    requestReferenceInsert(updatedReference);
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSlashMenu) {
      if (slashFilteredPresets.length === 0) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlashMenu();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashIndex((index) => (index + 1) % slashFilteredPresets.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashIndex((index) => (index - 1 + slashFilteredPresets.length) % slashFilteredPresets.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const preset = slashFilteredPresets[slashIndex];
        if (preset) {
          insertSlashPreset(preset.id);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    if (showReferenceMenu && references.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index + 1) % references.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index - 1 + references.length) % references.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        requestReferenceInsert(references[activeReferenceIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReferenceMenus();
      }
    }

    if (pendingReference && event.key === 'Escape') {
      event.preventDefault();
      closeReferenceMenus();
    }
  };

  const closeSlashMenu = () => {
    setShowSlashMenu(false);
    setSlashQuery('');
    setSlashIndex(0);
  };

  const insertSlashPreset = (presetId: string) => {
    selectPreset(presetId);
    closeSlashMenu();
    // Remove the slash query from prompt text
    const input = promptInputRef.current;
    const cursor = input?.selectionStart ?? promptText.length;
    const textBefore = promptText.slice(0, cursor);
    const textAfter = promptText.slice(cursor);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      const newText = promptText.slice(0, lastSlashIndex) + textAfter;
      onPromptChange(newText);
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
        promptInputRef.current?.setSelectionRange(lastSlashIndex, lastSlashIndex);
      });
    }
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = event.target.value;
    const cursor = event.target.selectionStart;
    onPromptChange(nextText);

    // Detect /
    const textBeforeCursor = nextText.slice(0, cursor);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastNewline = textBeforeCursor.lastIndexOf('\n');

    if (lastSlash >= 0 && lastSlash > lastAt && lastSlash > lastNewline) {
      const query = textBeforeCursor.slice(lastSlash + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setSlashQuery(query);
        setSlashIndex(0);
        setShowSlashMenu(true);
      } else {
        closeSlashMenu();
      }
    } else {
      closeSlashMenu();
    }

    if (nextText[cursor - 1] === '@' && references.length > 0) {
      setActiveReferenceIndex(0);
      setPendingReference(null);
      setShowReferenceMenu(true);
      return;
    }
    if (showReferenceMenu && nextText[cursor - 1] !== '@') {
      setShowReferenceMenu(false);
    }
  };

  return (
    <div
      className="nodrag nowheel"
      style={{
        width: IMAGE_NODE_CONTROL_WIDTH,
        minHeight: promptExpanded ? IMAGE_NODE_CONTROL_EXPANDED_HEIGHT : IMAGE_NODE_CONTROL_HEIGHT,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        borderRadius: 12,
        marginTop: 8,
        boxShadow: '0 16px 40px rgba(0,0,0,0.42)',
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 14px 8px' }}>
        <div className="flex items-center gap-2">
          {/* 标记 */}
          <div className="relative">
            <button
              onClick={() => { setShowMarkPanel(!showMarkPanel); setShowPresetMenu(false); }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ width: 54, height: 50, padding: '4px', background: marks.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)', border: FLOATING_PANEL_BORDER }}
            >
              <MapPin className="w-4 h-4" style={{ color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: 12, color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.72)' }}>标记</span>
            </button>
            {showMarkPanel && (
              <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 220 }}>
                <div className="text-[12px] text-white/55 mb-2">添加元素标记</div>
                <input value={markName} onChange={(e) => setMarkName(e.target.value)} placeholder="元素名称" className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <select value={markAction} onChange={(e) => setMarkAction(e.target.value as MarkAction)} className="w-full bg-transparent text-[13px] mb-2 outline-none" style={{ color: 'rgba(255,255,255,0.9)', background: FLOATING_PANEL_BACKGROUND }} onPointerDown={(e) => e.stopPropagation()}>
                  {Object.entries(MARK_ACTION_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
                <input value={markDesc} onChange={(e) => setMarkDesc(e.target.value)} placeholder="动作描述" className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <button onClick={addMark} className="w-full text-center text-[12px] py-1.5 rounded bg-white/10 text-white/90 hover:bg-white/15 transition-colors">添加</button>
                {marks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {marks.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[12px]">
                        <span style={{ color: MARK_ACTION_COLORS[m.action] }}>@{m.name}（{MARK_ACTION_LABELS[m.action]}）</span>
                        <button onClick={() => removeMark(m.id)} className="text-white/30 hover:text-white/60">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 预设 */}
          <div className="relative">
            <button
              onClick={() => { setShowPresetMenu(!showPresetMenu); setShowMarkPanel(false); }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ width: 54, height: 50, padding: '4px', background: selectedPresets.length > 0 ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.025)', border: FLOATING_PANEL_BORDER }}
            >
              <Bookmark className="w-4 h-4" style={{ color: selectedPresets.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: 12, color: selectedPresets.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.72)' }}>预设</span>
            </button>
            {showPresetMenu && (
              <div
                className="absolute top-full left-0 mt-1 rounded-xl z-30 overflow-hidden flex flex-col"
                style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 16px 40px rgba(0,0,0,0.48)', width: 420, maxHeight: 520 }}
              >
                {/* Tabs */}
                <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {PRESET_TABS.map((tab) => {
                    const isActive = activePresetTab === tab;
                    const TabIcon = tab === '常用' ? Star : tab === '变真实' ? Eye : tab === '换氛围' ? Sun : tab === '换环境' ? Mountain : tab === '换视角' ? ScanEye : tab === '风格' ? Palette : User;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActivePresetTab(tab)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${isActive ? 'text-white font-medium' : 'text-white/45 hover:text-white/70 hover:bg-white/5'}`}
                        style={isActive ? { background: 'rgba(167,139,250,0.18)' } : {}}
                      >
                        <TabIcon className="w-3 h-3" />
                        {tab}
                      </button>
                    );
                  })}
                </div>
                {/* Cards */}
                <div className="p-3 overflow-y-auto">
                  {activePresetTab === '我的' ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Bookmark className="w-10 h-10 text-white/10 mb-3" />
                      <div className="text-[13px] text-white/40">暂无自定义预设</div>
                      <div className="text-[11px] text-white/25 mt-1">你可以将当前预设组合保存到这里</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {visiblePresets.map((preset) => {
                        const isSelected = selectedPresets.includes(preset.id);
                        return (
                          <button
                            key={preset.id}
                            onClick={() => selectPreset(preset.id)}
                            className={`relative group rounded-xl overflow-hidden text-left transition-all border ${isSelected ? 'border-[#a78bfa]' : 'border-white/[0.06] hover:border-white/15'}`}
                            style={{ background: 'rgba(30,30,40,0.6)' }}
                          >
                            {/* Thumbnail */}
                            <div className="relative w-full overflow-hidden" style={{ height: 88 }}>
                              <img
                                src={preset.thumbnail}
                                alt={preset.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />
                              {/* Check indicator */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: '#a78bfa', boxShadow: '0 2px 8px rgba(167,139,250,0.4)' }}>
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="p-2">
                              <div className="text-[12px] font-medium text-white/90 truncate">{preset.name}</div>
                              <div className="text-[11px] text-white/40 truncate mt-0.5">{preset.shortDescription}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Selected presets footer */}
                {selectedPresets.length > 0 && (
                  <div className="shrink-0 px-3 py-2.5 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    <span className="text-[11px] text-white/35 shrink-0">已选预设</span>
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {selectedPresets.map((presetId) => {
                        const preset = getPresetById(presetId);
                        if (!preset) return null;
                        return (
                          <span
                            key={presetId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
                            style={{ background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.22)' }}
                          >
                            {preset.name}
                            <button
                              onClick={(e) => { e.stopPropagation(); removePreset(presetId); }}
                              className="hover:text-white transition-colors"
                              style={{ color: 'rgba(196,181,253,0.7)' }}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => onPresetsChange([])}
                      className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors shrink-0"
                    >
                      <TrashIcon className="w-3 h-3" />
                      清空
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 引用缩略图 */}
          <div className="flex items-center gap-2 ml-1">
            {references.slice(0, 3).map((ref) => (
              <div
                key={ref.nodeId}
                role="button"
                tabIndex={0}
                onClick={() => requestReferenceInsert(ref)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') requestReferenceInsert(ref);
                }}
                className="group/ref relative flex-shrink-0 cursor-pointer rounded-md outline-none"
              >
                {ref.imageUrl && (
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 overflow-hidden rounded-xl group-hover/ref:block"
                    style={{
                      width: 156,
                      background: FLOATING_PANEL_BACKGROUND,
                      border: FLOATING_PANEL_BORDER,
                      boxShadow: '0 14px 32px rgba(0,0,0,0.48)',
                    }}
                  >
                    <img src={ref.imageUrl} alt="" className="h-[94px] w-full object-cover" />
                    <div className="truncate px-2 py-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      @{ref.roleLabel || '引用素材'}
                    </div>
                  </div>
                )}
                {ref.imageUrl ? (
                  <img src={ref.imageUrl} alt="" className="rounded-md object-cover" style={{ width: 50, height: 50 }} />
                ) : (
                  <div className="rounded-md flex items-center justify-center" style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.05)' }}>
                    <Image className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                )}
                <span className="absolute -top-1 -right-1 flex items-center justify-center text-[8px] font-bold rounded-full" style={{ width: 14, height: 14, background: '#fff', color: '#000' }}>{ref.index}</span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveReference(ref.nodeId);
                  }}
                  className="absolute -right-1.5 -top-1.5 hidden items-center justify-center rounded-full text-white transition-colors hover:bg-black group-hover/ref:flex"
                  style={{ width: 16, height: 16, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                  title="删除引用"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
        {/* Expand */}
        <button
          onClick={() => setPromptExpanded((value) => !value)}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ width: 32, height: 32, color: promptExpanded ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
          title={promptExpanded ? '收起提示词框' : '展开提示词框'}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Prompt input */}
      <div style={{ padding: '4px 14px 12px' }}>
        <div className="relative">
        <textarea
          ref={promptInputRef}
          value={promptText}
          onChange={handlePromptChange}
          onKeyDown={handlePromptKeyDown}
          placeholder="描述你想要生成的画面内容，按/呼出指令，@引用素材"
          className="w-full bg-transparent resize-none outline-none placeholder:text-[rgba(255,255,255,0.38)] nowheel"
          style={{ color: 'rgba(255,255,255,0.94)', fontSize: 14, lineHeight: 1.58, minHeight: promptExpanded ? 176 : 104 }}
          rows={promptExpanded ? 7 : 4}
          onPointerDown={(e) => e.stopPropagation()}
        />
        {/* Slash menu */}
        {showSlashMenu && (
          <div
            className="absolute left-0 z-40 overflow-hidden rounded-xl py-1"
            style={{
              top: 0,
              width: 260,
              maxHeight: 240,
              overflowY: 'auto',
              background: FLOATING_PANEL_BACKGROUND,
              border: FLOATING_PANEL_BORDER,
              boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
            }}
          >
            {(() => {
              if (slashFilteredPresets.length === 0) {
                return <div className="px-3 py-2 text-[13px] text-white/40">无匹配预设</div>;
              }
              return slashFilteredPresets.map((preset, index) => (
                <button
                  key={preset.id}
                  onClick={() => insertSlashPreset(preset.id)}
                  onMouseEnter={() => setSlashIndex(index)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${index === slashIndex ? 'bg-white/8' : 'hover:bg-white/5'}`}
                >
                  <span className="text-[13px] text-white/90">{preset.name}</span>
                  <span className="text-[11px] text-white/40">{preset.shortDescription}</span>
                </button>
              ));
            })()}
          </div>
        )}
        {showReferenceMenu && references.length > 0 && (
          <div
            className="absolute left-0 top-7 z-40 overflow-hidden rounded-xl py-1"
            style={{
              width: 260,
              background: FLOATING_PANEL_BACKGROUND,
              border: FLOATING_PANEL_BORDER,
              boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
            }}
          >
            {references.map((reference, index) => (
              <button
                key={reference.nodeId}
                onMouseEnter={() => setActiveReferenceIndex(index)}
                onClick={() => requestReferenceInsert(reference)}
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors"
                style={{
                  background: activeReferenceIndex === index ? 'rgba(255,255,255,0.08)' : 'transparent',
                  color: 'rgba(255,255,255,0.9)',
                }}
              >
                {reference.imageUrl ? (
                  <img src={reference.imageUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <Image className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{reference.roleLabel || '未定义用途'}</span>
                <span className="flex-shrink-0 text-[13px]" style={{ color: 'rgba(255,255,255,0.52)' }}>
                  (@{reference.index})
                </span>
              </button>
            ))}
          </div>
        )}
        {pendingReference && (
          <div
            className="absolute left-0 top-7 z-40 overflow-hidden rounded-xl py-1"
            style={{
              width: 260,
              maxHeight: 300,
              overflowY: 'auto',
              background: FLOATING_PANEL_BACKGROUND,
              border: FLOATING_PANEL_BORDER,
              boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
            }}
          >
            <div className="px-3 py-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.58)' }}>选择图片用途</div>
            {imageRoleOptions.map((option) => {
              const RoleIcon = option.Icon;
              return (
                <button
                  key={option.value}
                  onClick={() => handleReferenceRoleSelect(option.value)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/5"
                  style={{ color: 'rgba(255,255,255,0.86)' }}
                >
                  <RoleIcon className="h-4 w-4" style={{ color: roleColorMap[option.value] }} />
                  {option.label}
                </button>
              );
            })}
          </div>
        )}
        </div>
      </div>

      {/* Bottom params bar */}
      <div className="flex items-center justify-between" style={{ padding: '4px 14px 14px' }}>
        <div className="flex items-center gap-4">
          {/* Model */}
          <div className="relative">
            <button onClick={() => { setShowModelMenu(!showModelMenu); setShowRatioMenu(false); setShowCountMenu(false); }} className="flex items-center gap-1.5 transition-colors hover:text-white" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ color: 'rgba(255,255,255,0.72)' }}>×</span>
              <span className="truncate" style={{ maxWidth: 150 }}>{selectedModel.name}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {showModelMenu && (
              <div className="absolute bottom-full left-0 mb-1 py-1 rounded-lg z-30 overflow-hidden" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 190 }}>
                {MODEL_OPTIONS.map((m) => (
                  <button key={m.name} onClick={() => { onModelParamsChange({ ...modelParams, model: m.name }); setShowModelMenu(false); }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${modelParams.model === m.name ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="flex-shrink-0 flex items-center justify-center rounded text-[8px] font-bold text-white" style={{ width: 18, height: 18, background: m.iconBg }}>{m.icon}</span>
                    <span className="text-[13px] text-white/85">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Ratio · Resolution */}
          <div className="relative">
            <button onClick={() => { setShowRatioMenu(!showRatioMenu); setShowModelMenu(false); setShowCountMenu(false); }} className="flex items-center gap-1.5 transition-colors hover:text-white" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              <Maximize className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.68)' }} />
              <span>{modelParams.ratio} · {modelParams.resolution}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {showRatioMenu && (
              <div className="absolute bottom-full left-0 mb-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 16px 34px rgba(0,0,0,0.48)', width: 326, padding: 8 }}>
                <div className="pb-2">
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>分辨率</div>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => onModelParamsChange({ ...modelParams, resolution: r })}
                        className="h-9 rounded-md text-[14px] font-medium transition-colors"
                        style={{
                          color: modelParams.resolution === r ? '#ffffff' : 'rgba(255,255,255,0.54)',
                          background: 'rgba(255,255,255,0.035)',
                          border: modelParams.resolution === r ? '1px solid rgba(255,255,255,0.9)' : FLOATING_PANEL_BORDER,
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-1">
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>比例</div>
                  <div className="grid grid-cols-5 gap-2">
                    {RATIO_OPTIONS.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => { onModelParamsChange({ ...modelParams, ratio: ar.value }); setShowRatioMenu(false); }}
                        className="flex h-[64px] flex-col items-center justify-center gap-2 rounded-md transition-colors"
                        style={{
                          color: modelParams.ratio === ar.value ? '#ffffff' : 'rgba(255,255,255,0.58)',
                          background: 'rgba(255,255,255,0.035)',
                          border: modelParams.ratio === ar.value ? '1px solid rgba(255,255,255,0.9)' : FLOATING_PANEL_BORDER,
                        }}
                      >
                        <div className="border border-current rounded-[2px]" style={{ width: ar.icon === 'portrait' ? 9 : ar.icon === 'landscape' ? 14 : ar.icon === 'ultrawide' ? 17 : 11, height: ar.icon === 'portrait' ? 15 : ar.icon === 'landscape' ? 8 : ar.icon === 'ultrawide' ? 5 : 11, opacity: 0.78 }} />
                        <span className="text-[13px]">{ar.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Generate button */}
        <div className="relative flex items-center gap-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: FLOATING_PANEL_BORDER, padding: '5px 6px 5px 12px' }}>
          <button
            onClick={() => { setShowCountMenu(!showCountMenu); setShowModelMenu(false); setShowRatioMenu(false); }}
            className="flex items-center gap-1 transition-colors hover:text-white"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
          >
            {modelParams.count}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          {showCountMenu && (
            <div className="absolute bottom-full right-10 mb-2 py-1 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', minWidth: 80 }}>
              {COUNT_OPTIONS.map((c) => (
                <button key={c} onClick={() => { onModelParamsChange({ ...modelParams, count: c }); setShowCountMenu(false); }} className={`w-full px-3 py-2 text-left text-[14px] transition-colors ${modelParams.count === c ? 'text-white bg-white/10' : 'text-white/75 hover:bg-white/5'}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.62)' }}>
            <Zap className="w-3.5 h-3.5" />
            <span style={{ fontSize: 15 }}>14</span>
          </div>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 34,
              height: 34,
              background: canGenerate ? '#ffffff' : 'rgba(255,255,255,0.14)',
              opacity: canGenerate ? 1 : 0.45,
            }}
            title="生成"
          >
            <ArrowUp className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Image Node ─── */
function ImageNode({ data, selected, id }: NodeProps) {
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
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
  const { setNodes, setEdges } = useReactFlow();

  /* ─── Extended node state ─── */
  const [promptText, setPromptText] = useState((data.prompt as string) || '');
  const [marks, setMarks] = useState<MarkItem[]>((data.marks as MarkItem[]) || []);
  const [selectedPresets, setSelectedPresets] = useState<string[]>((data.selectedPresets as string[]) || []);
  const [modelParams, setModelParams] = useState<ModelParams>((data.modelParams as ModelParams) || DEFAULT_MODEL_PARAMS);
  const [generatedImages, setGeneratedImages] = useState<string[]>((data.generatedImages as string[]) || []);

  /* ─── Reference tracking ─── */
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);
  const inputEdges = allEdges.filter((e) => e.target === id);
  const references: ReferenceInfo[] = inputEdges.map((edge, idx) => {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    const sourceRole = (sourceNode?.data?.role as ImageRole | null) || null;
    const roleOpt = sourceRole ? imageRoleOptions.find((o) => o.value === sourceRole) : null;
    return {
      nodeId: edge.source,
      index: idx + 1,
      role: sourceRole,
      roleLabel: roleOpt?.label || '未定义用途',
      imageUrl: sourceNode?.data?.image as string,
    };
  });

  const canGenerate = references.length > 0 || role !== null || marks.length > 0 || selectedPresets.length > 0 || promptText.trim().length > 0;

  const handleGenerate = () => {
    const finalPrompt = buildFinalPrompt(promptText, selectedPresets);
    const mockResult = `/images/show-cover-${Math.floor(Math.random() * 5) + 1}.jpg`;
    const nextGeneratedImages = [...generatedImages, mockResult];
    setPreviewImage(mockResult);
    setGeneratedImages(nextGeneratedImages);
    const resultImage = new window.Image();
    resultImage.onload = () => {
      setImgSize({ width: resultImage.width, height: resultImage.height });
    };
    resultImage.src = mockResult;
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, image: mockResult, finalPrompt, generatedImages: nextGeneratedImages, width: 1024, height: 1024 } } : n));
  };

  const handlePromptChange = (value: string) => {
    setPromptText(value);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, prompt: value } } : n));
  };

  const handleMarksChange = (newMarks: MarkItem[]) => {
    setMarks(newMarks);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, marks: newMarks } } : n));
  };

  const handlePresetsChange = (presets: string[]) => {
    setSelectedPresets(presets);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, selectedPresets: presets } } : n));
  };

  const handleModelParamsChange = (params: ModelParams) => {
    setModelParams(params);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, modelParams: params } } : n));
  };

  const handleRemoveReference = (sourceNodeId: string) => {
    setEdges((eds) => eds.filter((edge) => !(edge.source === sourceNodeId && edge.target === id)));
  };

  const handleUseReference = () => {
    // Shared entry point for top thumbnails and the @ reference menu.
  };

  const handleAssignReferenceRole = (sourceNodeId: string, nextRole: ImageRole) => {
    const roleOption = imageRoleOptions.find((option) => option.value === nextRole);
    setNodes((nds) => nds.map((node) => (
      node.id === sourceNodeId ? { ...node, data: { ...node.data, ...getRoleData(nextRole) } } : node
    )));

    const existingReference = references.find((reference) => reference.nodeId === sourceNodeId);
    if (!existingReference) return null;
    return {
      ...existingReference,
      role: nextRole,
      roleLabel: roleOption?.label || existingReference.roleLabel,
    };
  };

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
  const sourceWidth = imgSize?.width || (data.width as number) || 1;
  const sourceHeight = imgSize?.height || (data.height as number) || 1;
  const aspectRatio = sourceWidth / sourceHeight;
  const imageDisplayScale = displayImage
    ? Math.min(
        IMAGE_NODE_MAX_IMAGE_WIDTH / sourceWidth,
        IMAGE_NODE_MAX_IMAGE_HEIGHT / sourceHeight,
        Math.max(
          IMAGE_NODE_MIN_IMAGE_SIZE / sourceWidth,
          IMAGE_NODE_MIN_IMAGE_SIZE / sourceHeight,
        ),
      )
    : 1;
  const cardWidth = displayImage ? Math.round(sourceWidth * imageDisplayScale) : IMAGE_NODE_PREVIEW_WIDTH;
  const cardHeight = displayImage
    ? Math.max(120, Math.min(Math.round(cardWidth / aspectRatio), 320))
    : IMAGE_NODE_EMPTY_HEIGHT;
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
          className="w-full rounded-xl flex items-center justify-center transition-all overflow-hidden"
          style={{
            width: cardWidth,
            height: displayImage ? Math.round(sourceHeight * imageDisplayScale) : cardHeight,
            background: '#252526',
            border: `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.06)'}`,
            boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
          }}
        >
          {displayImage ? (
            <img src={displayImage} alt="" className="w-full h-full object-contain" />
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

      {/* Control panel — below the preview area */}
      {/* 空节点或有生成历史的节点才显示控制面板；纯上传/拖入的素材节点隐藏 */}
      {selected && (!displayImage || generatedImages.length > 0) && (
        <>
      <div
        className="absolute z-30"
        style={{
          top: cardHeight + 12 / zoom,
          left: cardWidth / 2,
          width: IMAGE_NODE_CONTROL_WIDTH,
          transform: `translateX(-50%) scale(${inverseScale})`,
          transformOrigin: 'top center',
        }}
      >
        <ImageNodeControlPanel
          promptText={promptText}
          onPromptChange={handlePromptChange}
          marks={marks}
          onMarksChange={handleMarksChange}
          selectedPresets={selectedPresets}
          onPresetsChange={handlePresetsChange}
          modelParams={modelParams}
          onModelParamsChange={handleModelParamsChange}
              onGenerate={handleGenerate}
              canGenerate={canGenerate}
              references={references}
              onRemoveReference={handleRemoveReference}
              onUseReference={handleUseReference}
              onAssignReferenceRole={handleAssignReferenceRole}
            />
      </div>

      <div style={{ height: (IMAGE_NODE_CONTROL_HEIGHT + 22) / zoom }} />
        </>
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
  const displayImage = data.image as string | undefined;
  const sourceWidth = (data.width as number) || 1;
  const sourceHeight = (data.height as number) || 1;

  const cardWidth = displayImage
    ? Math.round((sourceWidth * Math.min(
        IMAGE_NODE_MAX_IMAGE_WIDTH / sourceWidth,
        IMAGE_NODE_MAX_IMAGE_HEIGHT / sourceHeight,
        Math.max(
          IMAGE_NODE_MIN_IMAGE_SIZE / sourceWidth,
          IMAGE_NODE_MIN_IMAGE_SIZE / sourceHeight,
        ),
      )))
    : IMAGE_NODE_PREVIEW_WIDTH;
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
      const fail = () => {
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
      if (!nodeEl) { fail(); return; }
      const effectiveInputHandle = inputHandle ?? nodeEl.querySelector('.image-node-handle.input-port');
      const error = validateTarget(targetId, effectiveInputHandle);
      if (error) {
        fail();
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
        onDragLeave={() => {
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
              拖放图片或视频以上传
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
          transform: 'scale(0.8)',
          transformOrigin: 'bottom left',
        }}
      >
        {/* 小地图开关 */}
        <button
          onClick={() => setShowMinimap((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${showMinimap ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="小地图"
        >
          <MapIcon className="w-5 h-5" />
        </button>

        {/* 网格吸附 */}
        <button
          onClick={() => setSnapGrid((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${snapGrid ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="网格吸附"
        >
          <Grid3x3 className="w-5 h-5" />
        </button>

        {/* 重置视图 */}
        <button
          onClick={handleReset}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title="重置视图"
        >
          <RotateCcw className="w-5 h-5" />
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
          <HelpCircle className="w-5 h-5" />
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
