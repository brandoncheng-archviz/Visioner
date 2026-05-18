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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(10,10,15,0.62)', backdropFilter: 'blur(6px)' }}
          onClick={onToggleHelp}
        >
          <div
            className="relative max-h-[calc(100vh-48px)] w-full max-w-[1200px] overflow-hidden rounded-xl"
            style={{
              background: '#2a2a2a',
              border: '1px solid #3a3a3a',
              boxShadow: '0 28px 72px rgba(0,0,0,0.62)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={onToggleHelp}
              className="absolute right-4 top-4 z-10 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ width: 30, height: 30, color: '#a0a0b0' }}
              title="关闭"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="max-h-[calc(100vh-80px)] overflow-y-auto p-6 pt-14">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#3a3a3a]">
                {/* 基础 */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>基础</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label="复制" keys={['Ctrl', 'C']} />
                    <ShortcutRow label="粘贴" keys={['Ctrl', 'V']} />
                    <ShortcutRow label="撤销" keys={['Ctrl', 'Z']} />
                    <ShortcutRow label="重做" keys={['Ctrl', 'Shift', 'Z']} />
                    <ShortcutRow label="全选" keys={['Ctrl', 'A']} />
                    <ShortcutRow label="删除" keys={['Del']} />
                    <ShortcutRow label="取消选择" keys={['Esc']} />
                    <ShortcutRow label="多选" keys={['Shift', '点击']} />
                    <ShortcutRow label="框选" keys={['左键拖拽空白处']} />
                  </div>
                </div>

                {/* 缩放 */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>缩放</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label="Ctrl + 滚轮" keys={['Ctrl', '滚轮']} />
                    <ShortcutRow label="双指捏合" keys={['双指捏合']} />
                    <ShortcutRow label="放大" keys={['+']} />
                    <ShortcutRow label="缩小" keys={['-']} />
                    <ShortcutRow label="重置" keys={['0']} />
                    <ShortcutRow label="适应全部" keys={['F', '1']} />
                  </div>
                </div>

                {/* 移动画布 */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>移动画布</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label="滚轮 / 双指滑动" keys={['滚轮', '双指滑动']} />
                    <ShortcutRow label="Shift + 滚轮" keys={['Shift', '滚轮']} />
                    <ShortcutRow label="中键拖拽" keys={['中键拖拽']} />
                    <ShortcutRow label="空格 + 拖拽" keys={['Space', '拖拽']} />
                    <ShortcutRow label="方向键" keys={['↑', '↓', '←', '→']} />
                  </div>
                </div>

                {/* 提示词与生成 */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>提示词与生成</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label="引用素材" keys={['@']} />
                    <ShortcutRow label="打开预设" keys={['/']} />
                    <ShortcutRow label="换行" keys={['Enter', 'Shift+Enter', 'Ctrl+Enter']} />
                    <ShortcutRow label="生成图片" keys={['点击按钮', 'Ctrl+G']} />
                  </div>
                </div>
              </div>

              {/* Footer hint */}
              <div className="mt-4 flex items-center justify-end gap-2 px-3 text-[12px]" style={{ color: '#6a6a7a' }}>
                <span>关闭弹窗</span>
                <span
                  className="inline-flex items-center justify-center rounded text-[11px] font-medium"
                  style={{ background: '#3a3a3a', color: '#a0a0a0', padding: '2px 6px', height: 20, border: '1px solid #4a4a4a' }}
                >
                  Esc
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
