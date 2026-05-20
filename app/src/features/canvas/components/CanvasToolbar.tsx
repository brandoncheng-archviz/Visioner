import {
  Plus,
  Minus,
  RotateCcw,
  Map as MapIcon,
  Grid3x3,
  HelpCircle,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        {/* Minimap toggle */}
        <button
          onClick={onToggleMinimap}
          className={`p-1.5 rounded-lg transition-colors ${showMinimap ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title={t('toolbar.minimap')}
        >
          <MapIcon className="w-5 h-5" />
        </button>

        {/* Snap grid */}
        <button
          onClick={onToggleSnapGrid}
          className={`p-1.5 rounded-lg transition-colors ${snapGrid ? 'text-white bg-white/10' : 'text-[#e0e0e0] hover:bg-white/5 hover:text-white'}`}
          title={t('toolbar.snapGrid')}
        >
          <Grid3x3 className="w-5 h-5" />
        </button>

        {/* Reset view */}
        <button
          onClick={onReset}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title={t('toolbar.resetView')}
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-1" />

        {/* Zoom slider */}
        <div className="flex items-center gap-1.5 px-1" title={t('toolbar.zoomInOut')}>
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

        {/* Help button */}
        <button
          onClick={onToggleHelp}
          className="p-1.5 rounded-lg text-[#e0e0e0] hover:bg-white/5 hover:text-white transition-colors"
          title={t('toolbar.shortcutHelp')}
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
              title={t('toolbar.close')}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="max-h-[calc(100vh-80px)] overflow-y-auto p-6 pt-14">
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-[#3a3a3a]">
                {/* Basics */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>{t('toolbar.basics')}</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label={t('toolbar.copy')} keys={['Ctrl', 'C']} />
                    <ShortcutRow label={t('toolbar.paste')} keys={['Ctrl', 'V']} />
                    <ShortcutRow label={t('toolbar.undo')} keys={['Ctrl', 'Z']} />
                    <ShortcutRow label={t('toolbar.redo')} keys={['Ctrl', 'Shift', 'Z']} />
                    <ShortcutRow label={t('toolbar.selectAll')} keys={['Ctrl', 'A']} />
                    <ShortcutRow label={t('toolbar.delete')} keys={['Del']} />
                    <ShortcutRow label={t('toolbar.deselect')} keys={['Esc']} />
                    <ShortcutRow label={t('toolbar.multiSelect')} keys={['Shift', t('toolbar.click')]} />
                    <ShortcutRow label={t('toolbar.boxSelect')} keys={[t('toolbar.leftDragEmpty')]} />
                  </div>
                </div>

                {/* Zoom */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>{t('toolbar.zoom')}</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label={t('toolbar.ctrlWheel')} keys={['Ctrl', t('toolbar.scrollWheel')]} />
                    <ShortcutRow label={t('toolbar.pinch')} keys={[t('toolbar.pinchGesture')]} />
                    <ShortcutRow label={t('toolbar.zoomIn')} keys={['+']} />
                    <ShortcutRow label={t('toolbar.zoomOut')} keys={['-']} />
                    <ShortcutRow label={t('toolbar.reset')} keys={['0']} />
                    <ShortcutRow label={t('toolbar.fitAll')} keys={['F', '1']} />
                  </div>
                </div>

                {/* Move canvas */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>{t('toolbar.moveCanvas')}</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label={t('toolbar.wheelPan')} keys={[t('toolbar.scrollWheel'), t('toolbar.twoFingerSwipe')]} />
                    <ShortcutRow label={t('toolbar.shiftWheel')} keys={['Shift', t('toolbar.scrollWheel')]} />
                    <ShortcutRow label={t('toolbar.middleDrag')} keys={[t('toolbar.middleDragKeys')]} />
                    <ShortcutRow label={t('toolbar.spaceDrag')} keys={[t('toolbar.spaceKey'), t('toolbar.drag')]} />
                    <ShortcutRow label={t('toolbar.arrowKeys')} keys={['↑', '↓', '←', '→']} />
                  </div>
                </div>

                {/* Prompt & Generate */}
                <div className="px-3 first:pl-0 last:pr-0">
                  <h4 className="mb-3 text-[13px] font-medium" style={{ color: '#00d4ff' }}>{t('toolbar.promptAndGenerate')}</h4>
                  <div className="space-y-0.5">
                    <ShortcutRow label={t('toolbar.referenceMaterial')} keys={['@']} />
                    <ShortcutRow label={t('toolbar.openPreset')} keys={['/']} />
                    <ShortcutRow label={t('toolbar.lineBreak')} keys={['Enter', 'Shift+Enter', 'Ctrl+Enter']} />
                    <ShortcutRow label={t('toolbar.generateImage')} keys={[t('toolbar.clickButton'), 'Ctrl+G']} />
                  </div>
                </div>
              </div>

              {/* Footer hint */}
              <div className="mt-4 flex items-center justify-end gap-2 px-3 text-[12px]" style={{ color: '#6a6a7a' }}>
                <span>{t('toolbar.closeModal')}</span>
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
