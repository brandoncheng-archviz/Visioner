import {
  Plus,
  FolderOpen,
  ListTree,
  MessageCircle,
  History,
  Wand2,
  Image,
  Headphones,
  X,
} from 'lucide-react';
import { HistoryPanel } from './HistoryPanel';
import { useTranslation } from 'react-i18next';

export interface CanvasSidebarProps {
  activePanel: string | null;
  onSetActivePanel: (panel: string | null) => void;
  onAddNode: (type: string) => void;
}

export function CanvasSidebar({ activePanel, onSetActivePanel, onAddNode }: CanvasSidebarProps) {
  const { t } = useTranslation();

  const sidebarTools = [
    { id: 'add', icon: Plus, label: t('sidebar.addNode') },
    { id: 'assets', icon: FolderOpen, label: t('sidebar.myAssets') },
    { id: 'skills', icon: ListTree, label: t('sidebar.aiToolbox') },
    { id: 'support', icon: MessageCircle, label: t('sidebar.support') },
    { id: 'history', icon: History, label: t('sidebar.history') },
  ];

  return (
    <>
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
            onClick={() => onSetActivePanel(activePanel === 'add' ? null : 'add')}
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
              onClick={() => onSetActivePanel(activePanel === tool.id ? null : tool.id)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{ color: activePanel === tool.id ? '#00d4ff' : '#6a6a7a' }}
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
            width: activePanel === 'history' ? 720 : 280,
            background: '#252526',
            borderRight: '1px solid #2a2a35',
          }}
          onWheel={(e) => e.stopPropagation()}
        >
          {activePanel !== 'history' && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a35]">
              <span className="text-sm font-medium text-white">
                {sidebarTools.find((toolItem) => toolItem.id === activePanel)?.label}
              </span>
              <button
                onClick={() => onSetActivePanel(null)}
                className="w-6 h-6 rounded flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className={activePanel === 'history' ? 'h-full' : 'p-4'}>
            {activePanel === 'add' && (
              <div className="space-y-2">
                <p className="text-xs text-[#6a6a7a] mb-2">{t('sidebar.addNode')}</p>
                {[
                  { type: 'image', label: t('sidebar.imageNode'), icon: Image, color: '#22d3ee' },
                ].map((item) =>(
                  <button
                    key={item.type}
                    onClick={() => onAddNode(item.type)}
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
                <p className="text-sm text-[#6a6a7a]">{t('sidebar.aiToolboxEmpty')}</p>
                <p className="text-xs text-[#3a3a4a] mt-1">{t('sidebar.aiToolboxHint')}</p>
              </div>
            )}
            {activePanel === 'assets' && (
              <div>
                <div className="flex gap-2 mb-3">
                  {[t('common.all'), t('sidebar.character'), t('sidebar.scene'), t('sidebar.item'), t('sidebar.style'), t('sidebar.sound'), t('sidebar.other')].map((tab) => (
                    <button key={tab} className="px-2 py-1 rounded text-[10px] text-[#a0a0b0] hover:bg-[#1e1e28] transition-colors">
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="text-center py-8">
                  <Image className="w-8 h-8 text-[#3a3a4a] mx-auto mb-2" />
                  <p className="text-xs text-[#6a6a7a]">{t('sidebar.noAssets')}</p>
                </div>
              </div>
            )}
            {activePanel === 'history' && (
              <div className="h-full">
                <HistoryPanel scope="global" onClose={() => onSetActivePanel(null)} />
              </div>
            )}
            {activePanel === 'support' && (
              <div className="text-center py-8">
                <Headphones className="w-10 h-10 text-[#3a3a4a] mx-auto mb-3" />
                <p className="text-sm text-[#6a6a7a]">{t('sidebar.contactSupport')}</p>
                <p className="text-xs text-[#3a3a4a] mt-1">{t('sidebar.supportHours')}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
