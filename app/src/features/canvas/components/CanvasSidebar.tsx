import {
  Plus,
  FolderOpen,
  ListTree,
  MessageCircle,
  History,
  Wand2,
  Image,
  Video,
  Headphones,
  X,
} from 'lucide-react';
import { HistoryPanel } from './HistoryPanel';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { GeneratedImage, ResultSetBatch } from '../types/history.types';
import { BASIC_NODE_DEFINITIONS, type BasicNodeType } from '../constants/basicNodes';

function TextNodeIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="5.5" width="7" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="9" width="12" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="12.5" width="7" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

export interface CanvasSidebarProps {
  activePanel: string | null;
  onSetActivePanel: (panel: string | null) => void;
  onAddNode: (type: string) => void;
  onUseHistoryImages?: (images: GeneratedImage[], sourceBatch?: ResultSetBatch) => void;
}

export function CanvasSidebar({ activePanel, onSetActivePanel, onAddNode, onUseHistoryImages }: CanvasSidebarProps) {
  const { t } = useTranslation();
  const isHistoryOpen = activePanel === 'history';
  const basicNodeIcons: Record<BasicNodeType, typeof Image> = {
    text: TextNodeIcon as unknown as typeof Image,
    image: Image,
    video: Video,
  };

  useEffect(() => {
    if (!isHistoryOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onSetActivePanel(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHistoryOpen, onSetActivePanel]);

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
            <SidebarToolButton
              key={tool.id}
              active={activePanel === tool.id}
              label={tool.label}
              onClick={() => onSetActivePanel(activePanel === tool.id ? null : tool.id)}
              icon={<tool.icon className="w-[18px] h-[18px]" strokeWidth={1.75} />}
            />
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
      {isHistoryOpen && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center p-6"
          style={{
            background: 'rgba(0,0,0,0.58)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={() => onSetActivePanel(null)}
          onWheel={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="overflow-hidden rounded-[18px]"
            style={{
              width: 'min(88vw, 1120px)',
              height: 'min(84vh, 760px)',
              background: '#222222',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.45)',
            }}
            onClick={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <HistoryPanel scope="global" onClose={() => onSetActivePanel(null)} onUseImages={onUseHistoryImages} />
          </div>
        </div>
      )}

      {activePanel && activePanel !== 'history' && (
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
              {sidebarTools.find((toolItem) => toolItem.id === activePanel)?.label}
            </span>
            <button
              onClick={() => onSetActivePanel(null)}
              className="w-6 h-6 rounded flex items-center justify-center text-[#e0e0e0] hover:text-white hover:bg-[#1e1e28] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4">
            {activePanel === 'add' && (
              <div className="space-y-2">
                <p className="text-xs text-[#6a6a7a] mb-2">{t('sidebar.addNode')}</p>
                {BASIC_NODE_DEFINITIONS.map((item) => {
                  const ItemIcon = basicNodeIcons[item.type];
                  return (
                    <button
                      key={item.type}
                      onClick={() => onAddNode(item.type)}
                      className="w-full flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left transition-colors hover:border-white/[0.06] hover:bg-[#1e1e28]"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
                        <ItemIcon className="w-4 h-4" style={{ color: item.color }} />
                      </div>
                      <span className="text-sm text-white">{t(item.labelKey)}</span>
                    </button>
                  );
                })}
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

function SidebarToolButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-9 h-9 rounded-xl flex items-center justify-center transition-all"
      style={{
        color: active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.68)',
        background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
        border: active ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
      }}
      title={label}
      onMouseEnter={(event) => {
        if (active) return;
        event.currentTarget.style.color = 'rgba(255,255,255,0.9)';
        event.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={(event) => {
        if (active) return;
        event.currentTarget.style.color = 'rgba(255,255,255,0.68)';
        event.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
    </button>
  );
}
