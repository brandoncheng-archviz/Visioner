import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Bookmark, Plus, Pencil } from 'lucide-react';

import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { PRESET_DATA, PRESET_TABS, getPresetById } from '../constants/presets';
import { CustomPresetFallbackCover } from './CustomPresetFallbackCover';
import type { PresetItem } from '../types/imageNode.types';
import { getPresetPromptText } from '../utils/promptUtils';
import {
  deleteUserPreset,
  loadUserPresets,
  setUserPresetFavorite,
  upsertUserPreset,
} from '../utils/userPresets';

const FAVORITES_STORAGE_KEY = 'visioner_preset_favorites';
type PresetTab = (typeof PRESET_TABS)[number];

function loadUserFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveUserFavorites(favorites: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(favorites)));
  } catch { /* ignore */ }
}

const PRESET_TAB_HINTS: Record<PresetTab, string> = {
  真实增强: '提升画面真实度、材质、曝光和成片质量，适合从草图、白模或初稿进入高质量表达。',
  光照氛围: '调整时间、天气、季节、亮度和空气感，控制画面的光影关系与情绪基调。',
  镜头视角: '切换观察角度或镜头距离，用于强调体块、细节、活动、配景或总图关系。',
  建筑表达: '转换表达方式，例如展板、轴测、蓝图、草图、Logo 或样机化呈现。',
  场景配景: '添加或优化人物、车辆、植物、鸟类等配景元素，增强尺度感和场景完整度。',
  我的收藏: '显示你收藏的系统预设，以及你添加的自定义预设。',
};

function getPresetName(preset: PresetItem): string {
  return preset.title || preset.name;
}

function getPresetShortDesc(preset: PresetItem): string {
  return preset.description || preset.shortDescription || (preset.owner === 'user' ? '用户自定义' : '');
}

export function PresetPickerModal({
  open,
  onApply,
  onClose,
}: {
  open: boolean;
  selectedPresetIds: string[];
  onApply: (presetIds: string[], presets?: PresetItem[]) => void;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<PresetTab>('真实增强');
  const [userFavorites, setUserFavorites] = useState<Set<string>>(() => loadUserFavorites());
  const [userPresets, setUserPresets] = useState<PresetItem[]>(() => loadUserPresets());
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [presetTitle, setPresetTitle] = useState('');
  const [presetPrompt, setPresetPrompt] = useState('');
  const [presetThumbnail, setPresetThumbnail] = useState('');

  const allPresets = useMemo(() => [...PRESET_DATA, ...userPresets], [userPresets]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const openCreateEditor = useCallback(() => {
    setEditingPreset(null);
    setPresetTitle('');
    setPresetPrompt('');
    setPresetThumbnail('');
    setShowPresetEditor(true);
  }, []);

  const openEditEditor = useCallback((preset: PresetItem) => {
    setEditingPreset(preset);
    setPresetTitle(preset.name);
    setPresetPrompt(typeof preset.promptTemplate === 'string' ? preset.promptTemplate : preset.detailDescription || '');
    setPresetThumbnail(preset.thumbnail || '');
    setShowPresetEditor(true);
  }, []);

  const closePresetEditor = useCallback(() => {
    setShowPresetEditor(false);
    setEditingPreset(null);
    setPresetTitle('');
    setPresetPrompt('');
    setPresetThumbnail('');
  }, []);

  const handleSaveUserPreset = useCallback(() => {
    const title = presetTitle.trim();
    const prompt = presetPrompt.trim();
    if (!title || !prompt) return;

    const nextPresets = upsertUserPreset(userPresets, {
      id: editingPreset?.id,
      name: title,
      prompt,
      thumbnail: presetThumbnail,
      userFavorite: editingPreset?.userFavorite,
    });
    const savedPresetId = editingPreset?.id || nextPresets[nextPresets.length - 1]?.id || null;
    setUserPresets(nextPresets);
    setHoveredPresetId(savedPresetId);
    closePresetEditor();
  }, [closePresetEditor, editingPreset, presetPrompt, presetThumbnail, presetTitle, userPresets]);

  const handleDeleteUserPreset = useCallback((presetId: string) => {
    if (!window.confirm('确定删除这个自定义预设吗？')) return;

    const nextPresets = deleteUserPreset(userPresets, presetId);
    setUserPresets(nextPresets);
    setUserFavorites((favorites) => {
      const next = new Set(favorites);
      next.delete(presetId);
      saveUserFavorites(next);
      return next;
    });
    setHoveredPresetId((id) => (id === presetId ? null : id));
  }, [userPresets]);

  const handleThumbnailUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPresetThumbnail(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }, []);

  const isFavorite = useCallback((preset: PresetItem) => userFavorites.has(preset.id) || Boolean(preset.userFavorite), [userFavorites]);

  const toggleFavorite = useCallback((presetId: string) => {
    const userPreset = userPresets.find((preset) => preset.id === presetId);
    if (userPreset) {
      const nextFavorite = !userPreset.userFavorite;
      const nextPresets = setUserPresetFavorite(userPresets, presetId, nextFavorite);
      setUserPresets(nextPresets);
      setUserFavorites((prev) => {
        const next = new Set(prev);
        if (nextFavorite) {
          next.add(presetId);
        } else {
          next.delete(presetId);
        }
        saveUserFavorites(next);
        return next;
      });
      return;
    }

    setUserFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(presetId)) {
        next.delete(presetId);
      } else {
        next.add(presetId);
      }
      saveUserFavorites(next);
      return next;
    });
  }, [userPresets]);

  const visiblePresets = useMemo(() => {
    if (activeTab === '我的收藏') {
      return allPresets.filter(
        (preset) =>
          preset.owner === 'user' ||
          isFavorite(preset),
      );
    }

    return allPresets.filter((preset) => {
      // Skip style presets and those not in any tab (legacy data)
      if (preset.category === 'style') return false;
      return preset.tabs.includes(activeTab);
    });
  }, [activeTab, allPresets, isFavorite]);

  const hoveredPreset = useMemo(() => {
    if (!hoveredPresetId) return null;
    return allPresets.find((preset) => preset.id === hoveredPresetId) || getPresetById(hoveredPresetId) || null;
  }, [allPresets, hoveredPresetId]);

  const hoveredPresetPrompt = useMemo(() => {
    return hoveredPreset ? getPresetPromptText(hoveredPreset) : '';
  }, [hoveredPreset]);

  const handleCardClick = useCallback((preset: PresetItem) => {
    onApply([preset.id], [preset]);
    onClose();
  }, [onApply, onClose]);

  const handleCardMouseEnter = useCallback((presetId: string) => {
    setHoveredPresetId(presetId);
  }, []);

  const renderPresetCard = useCallback((preset: PresetItem) => {
    const favorite = isFavorite(preset);
    const presetName = getPresetName(preset);
    const thumbnail = preset.thumbnail?.trim();
    const sourcePresetThumbnail = preset.sourcePresetThumbnail?.trim();
    const showSourceThumbnail = preset.owner === 'user' && !thumbnail && Boolean(sourcePresetThumbnail);
    const shouldShowFallbackCover = !thumbnail && !sourcePresetThumbnail;
    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => handleCardClick(preset)}
        onMouseEnter={() => handleCardMouseEnter(preset.id)}
        className="group relative overflow-hidden rounded-lg border border-white/[0.12] text-left transition-all hover:border-white/[0.28]"
        style={{
          background: 'rgba(255,255,255,0.025)',
        }}
      >
        {/* Thumbnail */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-white/[0.03]">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={presetName}
              className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : showSourceThumbnail ? (
            <>
              <img
                src={sourcePresetThumbnail}
                alt={presetName}
                className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span
                className="absolute left-2 bottom-2 flex h-6 w-6 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,0,0,0.42)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.16)' }}
                title="自定义编辑"
              >
                <Pencil className="h-3 w-3" />
              </span>
            </>
          ) : shouldShowFallbackCover ? (
            <CustomPresetFallbackCover title={presetName} />
          ) : null}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)' }} />
          {/* Star icon */}
          <span
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
            style={{
              background: favorite ? 'rgba(245,158,11,0.85)' : 'rgba(0,0,0,0.35)',
              color: favorite ? '#fff' : 'rgba(255,255,255,0.7)',
            }}
            title={favorite ? '点击取消收藏' : '点击加入收藏'}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(preset.id); }}
          >
            <Star className="h-3 w-3" fill={favorite ? 'currentColor' : 'none'} />
          </span>
        </div>
        {/* Info */}
        <div className="px-3 py-2">
          <div className="truncate text-[13px] font-medium text-white/88">{presetName}</div>
          <div className="mt-0.5 truncate text-[11px] text-white/40">{getPresetShortDesc(preset)}</div>
        </div>
      </button>
    );
  }, [isFavorite, handleCardClick, handleCardMouseEnter, toggleFavorite]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55"
      onPointerDown={(event) => event.stopPropagation()}
      onWheelCapture={(event) => event.stopPropagation()}
      onClick={(event) => {
        if (event.target === event.currentTarget) handleCancel();
      }}
    >
      <div
        className="rounded-xl"
        style={{
          width: 'min(880px, calc(100vw - 48px))',
          height: 'min(720px, calc(100vh - 48px))',
          maxWidth: 'calc(100vw - 48px)',
          maxHeight: 'calc(100vh - 48px)',
          flex: '0 0 auto',
          boxSizing: 'border-box',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          contain: 'layout size paint',
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 24px 70px rgba(0,0,0,0.62)',
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between border-b px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div>
            <div className="text-[16px] font-semibold text-white/92">预设库</div>
            <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.48)' }}>
              浏览预设提示词。鼠标移动到卡片可预览完整提示词，点击卡片可插入到提示词框，也可以使用 / 快速搜索插入。
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.58)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Left sidebar tabs */}
          <div className="flex h-full min-h-0 w-[150px] shrink-0 flex-col overflow-hidden border-r py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            {PRESET_TABS.map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`mx-2 mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${isActive ? 'font-medium text-white' : 'text-white/50 hover:bg-white/5 hover:text-white/75'}`}
                  style={isActive ? { background: 'rgba(255,255,255,0.09)' } : {}}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Right content */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex shrink-0 items-start justify-between gap-4 px-5 pb-2 pt-4">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-white/88">{activeTab}</div>
                <div className="mt-1 truncate text-[12px]" style={{ color: 'rgba(255,255,255,0.42)' }}>
                  {PRESET_TAB_HINTS[activeTab]}
                </div>
              </div>
              {hoveredPreset?.owner === 'user' && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEditEditor(hoveredPreset)}
                    className="rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-white/8"
                    style={{ color: 'rgba(255,255,255,0.68)', border: '1px solid rgba(255,255,255,0.10)' }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUserPreset(hoveredPreset.id)}
                    className="rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-white/8"
                    style={{ color: 'rgba(248,113,113,0.84)', border: '1px solid rgba(248,113,113,0.18)' }}
                  >
                    删除
                  </button>
                </div>
              )}
            </div>

            {/* Cards area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
              {activeTab === '我的收藏' ? (
                visiblePresets.length === 0 ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <Bookmark className="mb-3 h-10 w-10 text-white/10" />
                    <div className="text-[13px] font-medium text-white/42">还没有收藏预设</div>
                    <div className="mt-1 text-[11px] text-white/28">点击预设右上角的星标，或添加自己的预设。</div>
                    <button
                      type="button"
                      onClick={openCreateEditor}
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium"
                      style={{ background: 'rgba(255,255,255,0.82)', color: '#111' }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      添加预设
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {visiblePresets.map((preset) => renderPresetCard(preset))}
                    <button
                      type="button"
                      onClick={openCreateEditor}
                      className="flex min-h-[180px] flex-col items-center justify-center rounded-lg border border-dashed text-center transition-colors hover:bg-white/5"
                      style={{ borderColor: 'rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.018)', color: 'rgba(255,255,255,0.56)' }}
                    >
                      <Plus className="mb-2 h-5 w-5" />
                      <span className="text-[13px] font-medium">添加预设</span>
                      <span className="mt-1 text-[11px] text-white/30">保存收藏提示词模板</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {visiblePresets.map((preset) => renderPresetCard(preset))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hover prompt preview */}
        <div className="flex h-[200px] shrink-0 flex-col border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(16,16,20,0.62)' }}>
          {hoveredPreset ? (
            <>
              <div className="flex shrink-0 items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-white/88">{getPresetName(hoveredPreset)}</div>
                  <div className="mt-0.5 truncate text-[11px] text-white/42">{getPresetShortDesc(hoveredPreset)}</div>
                </div>
                <span className="shrink-0 rounded-md px-2 py-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.48)', background: 'rgba(255,255,255,0.05)' }}>
                  点击卡片插入
                </span>
              </div>
              <div
                className="mt-3 min-h-0 max-h-[132px] flex-1 overflow-y-auto overscroll-contain whitespace-pre-wrap rounded-lg px-3 py-2 text-[12px] leading-5"
                style={{ color: 'rgba(255,255,255,0.76)', background: 'rgba(0,0,0,0.20)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {hoveredPresetPrompt || '这个预设暂未配置提示词。'}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.42)', background: 'rgba(0,0,0,0.16)', border: '1px solid rgba(255,255,255,0.05)' }}>
              将鼠标移到卡片上，可预览完整提示词；点击卡片可直接插入。
            </div>
          )}
        </div>
      </div>
      {showPresetEditor && (
        <div className="fixed inset-0 z-[1010] flex items-center justify-center bg-black/45" onClick={closePresetEditor}>
          <div
            className="w-[520px] max-w-[calc(100vw-40px)] rounded-xl p-5"
            style={{
              background: FLOATING_PANEL_BACKGROUND,
              border: FLOATING_PANEL_BORDER,
              boxShadow: '0 24px 70px rgba(0,0,0,0.62)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[16px] font-semibold text-white/92">{editingPreset ? '编辑预设' : '添加预设'}</div>
                <div className="mt-1 text-[12px] text-white/42">保存一个收藏提示词增强模板。</div>
              </div>
              <button
                type="button"
                onClick={closePresetEditor}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
                style={{ color: 'rgba(255,255,255,0.58)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-[12px] text-white/52">预设标题</span>
                <input
                  value={presetTitle}
                  onChange={(event) => setPresetTitle(event.target.value)}
                  placeholder="高端住宅黄昏感"
                  className="mt-2 w-full rounded-lg border bg-transparent px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-white/22 focus:border-[#a78bfa]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.88)' }}
                />
              </label>

              <label className="block">
                <span className="text-[12px] text-white/52">具体内容</span>
                <textarea
                  value={presetPrompt}
                  onChange={(event) => setPresetPrompt(event.target.value)}
                  placeholder="让画面偏高端住宅宣传图气质，使用黄昏暖光、低饱和色调、真实材质和柔和植物层次，不改变建筑主体和构图。"
                  className="mt-2 h-32 w-full resize-none rounded-lg border bg-transparent px-3 py-2 text-[13px] leading-6 outline-none transition-colors placeholder:text-white/22 focus:border-[#a78bfa]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.88)' }}
                />
              </label>

              <div>
                <div className="text-[12px] text-white/52">缩略图</div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-16 w-24 overflow-hidden rounded-lg border bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {presetThumbnail ? (
                      <img src={presetThumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <CustomPresetFallbackCover title={presetTitle} />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="inline-flex cursor-pointer items-center rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-white/8" style={{ color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.10)' }}>
                      上传缩略图
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPresetThumbnail('')}
                      className="text-left text-[12px] transition-colors hover:text-white/70"
                      style={{ color: 'rgba(255,255,255,0.38)' }}
                    >
                      使用默认缩略图
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closePresetEditor}
                className="rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/8"
                style={{ color: 'rgba(255,255,255,0.62)' }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveUserPreset}
                disabled={!presetTitle.trim() || !presetPrompt.trim()}
                className="rounded-lg px-3 py-2 text-[13px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                style={{ background: 'rgba(255,255,255,0.82)', color: '#111' }}
              >
                保存预设
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
