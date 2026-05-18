import { Crop, Box, Pencil, Lightbulb, MoreHorizontal, Maximize, Download, Maximize2 } from 'lucide-react';

export function ImageToolbar({ onFullscreen }: { onFullscreen: () => void }) {
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
