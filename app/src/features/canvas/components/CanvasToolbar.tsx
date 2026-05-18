import {
  Plus,
  Minus,
  RotateCcw,
  Map as MapIcon,
  Grid3x3,
  HelpCircle,
  X,
} from 'lucide-react';
import { ShortcutRow } from './ShortcutRow';

export interface CanvasToolbarProps {
  showMinimap: boolean;
  onToggleMinimap: () => void;
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  zoom: number;
  onZoomChange: (value: number) => void;
  onReset: () => void;
  showHelp: boolean;
  onToggleHelp: () => void;
}

export function CanvasToolbar({
  showMinimap,
  onToggleMinimap,
  snapGrid,
  onToggleSnapGrid,
  zoom,
  onZoomChange,
  onReset,
  showHelp,
  onToggleHelp,
}: CanvasToolbarProps) {
  return (
    <>
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
          onClick={onToggleMinimap}
          className={`p-1.5 rounded-lg transition-colors ${showMinimap ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="小地图"
        >
          <MapIcon className="w-5 h-5" />
        </button>

        {/* 网格吸附 */}
        <button
          onClick={onToggleSnapGrid}
          className={`p-1.5 rounded-lg transition-colors ${snapGrid ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title="网格吸附"
        >
          <Grid3x3 className="w-5 h-5" />
        </button>

        {/* 重置视图 */}
        <button
          onClick={onReset}
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
            onChange={(e) => onZoomChange(parseFloat(e.target.value))}
            className="w-20 h-1 cursor-pointer"
            style={{ accentColor: '#22d3ee' }}
          />
          <Plus className="w-3 h-3 text-[#e0e0e0]" />
        </div>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* 帮助按钮 */}
        <button
          onClick={onToggleHelp}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title="快捷键帮助"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onToggleHelp}>
          <div
            className="relative rounded-2xl p-6"
            style={{
              background: '#1e1e24',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 32px 64px rgba(0,0,0,0.6)',
              minWidth: 520,
              maxWidth: 600,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onToggleHelp}
              className="absolute top-4 right-4 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ width: 28, height: 28, color: '#888' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex gap-10">
              {/* ─── Left Column ─── */}
              <div className="flex-1">
                <h4 className="text-[13px] font-medium mb-4" style={{ color: '#888' }}>基础</h4>
                <div className="space-y-3 text-[13px]">
                  <ShortcutRow label="复制" keys={['Ctrl', 'C']} />
                  <ShortcutRow label="粘贴" keys={['Ctrl', 'V']} />
                  <ShortcutRow label="删除" keys={['Del']} />
                  <ShortcutRow label="多选" keys={['Shift', '点击']} />
                  <ShortcutRow label="框选" keys={['左键拖拽空白处']} />
                  <ShortcutRow label="添加节点" keys={['右键画布']} />
                  <ShortcutRow label="建立连线" keys={['拖拽连接点']} />
                </div>

                <h4 className="text-[13px] font-medium mt-6 mb-4" style={{ color: '#888' }}>缩放</h4>
                <div className="space-y-3 text-[13px]">
                  <ShortcutRow label="放大" keys={['+']} />
                  <ShortcutRow label="缩小" keys={['-']} />
                  <ShortcutRow label="重置" keys={['0']} />
                  <ShortcutRow label="鼠标滚轮" keys={['滚轮']} />
                  <ShortcutRow label="触控板" keys={['双指捏合']} />
                </div>
              </div>

              {/* ─── Right Column ─── */}
              <div className="flex-1">
                <h4 className="text-[13px] font-medium mb-4" style={{ color: '#888' }}>移动画布</h4>
                <div className="space-y-3 text-[13px]">
                  <ShortcutRow label="键盘" keys={['↑', '↓', '←', '→']} />
                  <ShortcutRow label="中键拖拽" keys={['中键拖拽']} />
                  <ShortcutRow label="空格 + 拖拽" keys={['Space', '拖拽']} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
