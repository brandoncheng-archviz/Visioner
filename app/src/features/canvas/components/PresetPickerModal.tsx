import { useState, useMemo, useCallback, type ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Star, Bookmark, Plus, Pencil } from 'lucide-react';

import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { PRESET_DATA, PRESET_TABS, getPresetById } from '../constants/presets';
import { CustomPresetFallbackCover } from './CustomPresetFallbackCover';
import type { PresetItem, PresetTab } from '../types/imageNode.types';
import { normalizePresetSelection, togglePresetSelection } from '../utils/presetSelection';
import {
  deleteUserPreset,
  loadUserPresets,
  setUserPresetFavorite,
  upsertUserPreset,
} from '../utils/userPresets';

const FAVORITES_STORAGE_KEY = 'visioner_preset_favorites';

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

const ATMOSPHERE_GROUP_LABELS: Record<string, string> = {
  time: '时间段',
  weather: '天气',
  season: '季节',
};

const ATMOSPHERE_GROUP_ORDER = ['time', 'weather', 'season'];

function getPresetName(preset: PresetItem): string {
  return preset.title || preset.name;
}

function getPresetShortDesc(preset: PresetItem): string {
  return preset.description || preset.shortDescription || (preset.owner === 'user' ? '用户自定义' : '');
}

function buildAtmosphereComboDescription(presets: PresetItem[]): { title: string; description: string; keywords: string[] } {
  const time = presets.find((p) => p.group === 'time');
  const weather = presets.find((p) => p.group === 'weather');
  const season = presets.find((p) => p.group === 'season');

  const parts: string[] = [];
  if (time) parts.push(time.name);
  if (weather) parts.push(weather.name);
  if (season) parts.push(season.name);

  const title = parts.join(' · ') || '';

  if (parts.length === 0) {
    return { title: '', description: '', keywords: [] };
  }

  // Build natural language description based on combination
  let description = '';
  if (parts.length === 1) {
    const single = time || weather || season;
    description = single?.detailDescription || `画面会调整${single?.name}氛围，同时保持建筑主体、构图和主要设计特征不变。`;
  } else {
    const atmosParts: string[] = [];
    if (time) atmosParts.push(`${time.name}光线`);
    if (weather) atmosParts.push(`${weather.name}天空`);
    if (season) atmosParts.push(`${season.name}色调`);
    description = `画面会转向${parts.join('、')}的组合氛围，${atmosParts.join('、')}相互融合。系统会增强对应的自然光影、色调氛围和空气感，同时保持建筑主体、构图和主要设计特征不变。`;
  }

  const keywords: string[] = [];
  presets.forEach((p) => {
    if (p.keywords) keywords.push(...p.keywords);
  });
  const uniqueKeywords = Array.from(new Set(keywords));

  return { title, description, keywords: uniqueKeywords };
}

export function PresetPickerModal({
  open,
  selectedPresetIds,
  onApply,
  onClose,
}: {
  open: boolean;
  selectedPresetIds: string[];
  onApply: (presetIds: string[]) => void;
  onClose: () => void;
}) {
  const [draftPresetIds, setDraftPresetIds] = useState<string[]>(selectedPresetIds);
  const [activeTab, setActiveTab] = useState<PresetTab>('我的常用');
  const [userFavorites, setUserFavorites] = useState<Set<string>>(() => loadUserFavorites());
  const [userPresets, setUserPresets] = useState<PresetItem[]>(() => loadUserPresets());
  const [focusedPresetId, setFocusedPresetId] = useState<string | null>(null);
  const [editingPreset, setEditingPreset] = useState<PresetItem | null>(null);
  const [showPresetEditor, setShowPresetEditor] = useState(false);
  const [presetTitle, setPresetTitle] = useState('');
  const [presetPrompt, setPresetPrompt] = useState('');
  const [presetThumbnail, setPresetThumbnail] = useState('');

  const allPresets = useMemo(() => [...PRESET_DATA, ...userPresets], [userPresets]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(() => {
    onApply(normalizePresetSelection(draftPresetIds));
    onClose();
  }, [draftPresetIds, onApply, onClose]);

  const handleClear = useCallback(() => {
    setDraftPresetIds([]);
    setFocusedPresetId(null);
  }, []);

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
    setUserPresets(nextPresets);
    setFocusedPresetId(editingPreset?.id || nextPresets[nextPresets.length - 1]?.id || null);
    closePresetEditor();
  }, [closePresetEditor, editingPreset, presetPrompt, presetThumbnail, presetTitle, userPresets]);

  const handleDeleteUserPreset = useCallback((presetId: string) => {
    if (!window.confirm('确定删除这个自定义预设吗？')) return;

    const nextPresets = deleteUserPreset(userPresets, presetId);
    setUserPresets(nextPresets);
    setDraftPresetIds((ids) => ids.filter((id) => id !== presetId));
    setUserFavorites((favorites) => {
      const next = new Set(favorites);
      next.delete(presetId);
      saveUserFavorites(next);
      return next;
    });
    setFocusedPresetId((id) => (id === presetId ? null : id));
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

  const isDraftSelected = useCallback((presetId: string) => draftPresetIds.includes(presetId), [draftPresetIds]);
  const isFavorite = useCallback((preset: PresetItem) => userFavorites.has(preset.id) || Boolean(preset.userFavorite), [userFavorites]);

  const selectPreset = useCallback((presetId: string) => {
    setDraftPresetIds((prev) => togglePresetSelection(prev, presetId));
    setFocusedPresetId(presetId);
  }, []);

  const visiblePresets = useMemo(() => {
    if (activeTab === '我的常用') {
      return allPresets.filter((preset) => preset.owner === 'user' || userFavorites.has(preset.id) || Boolean(preset.userFavorite));
    }

    return allPresets.filter((preset) => {
      // Skip style presets and those not in any tab (legacy data)
      if (preset.category === 'style') return false;
      return preset.tabs.includes(activeTab);
    });
  }, [activeTab, allPresets, userFavorites]);

  const atmospherePresets = useMemo(() => {
    if (activeTab !== '换氛围') return null;
    const byGroup: Record<string, PresetItem[]> = {};
    ATMOSPHERE_GROUP_ORDER.forEach((g) => { byGroup[g] = []; });
    PRESET_DATA.filter((p) => p.category === 'atmosphere' && p.tabs.includes('换氛围')).forEach((p) => {
      if (p.group && byGroup[p.group]) {
        byGroup[p.group].push(p);
      }
    });
    return byGroup;
  }, [activeTab]);

  const detailSection = useMemo(() => {
    if (activeTab === '换氛围') {
      const selectedAtmosphere = draftPresetIds
        .map(getPresetById)
        .filter((p): p is PresetItem => p !== undefined && p.category === 'atmosphere');
      if (selectedAtmosphere.length === 0) {
        return {
          title: '',
          description: '选择时间段、天气和季节来组合画面氛围。每个维度最多选择一项。',
          keywords: [] as string[],
        };
      }
      return buildAtmosphereComboDescription(selectedAtmosphere);
    }

    const focused = focusedPresetId ? allPresets.find((preset) => preset.id === focusedPresetId) || getPresetById(focusedPresetId) : null;
    if (focused) {
      return {
        title: getPresetName(focused),
        description: focused.detailDescription || focused.shortHelp || '',
        keywords: focused.keywords || [],
      };
    }

    const selected = draftPresetIds
      .map((id) => allPresets.find((preset) => preset.id === id) || getPresetById(id))
      .filter((p): p is PresetItem => Boolean(p));
    if (selected.length === 1) {
      const p = selected[0];
      return {
        title: getPresetName(p),
        description: p.detailDescription || p.shortHelp || '',
        keywords: p.keywords || [],
      };
    }

    return { title: '', description: '', keywords: [] as string[] };
  }, [activeTab, allPresets, draftPresetIds, focusedPresetId]);

  const detailPreset = useMemo(() => {
    if (!focusedPresetId) return null;
    return allPresets.find((preset) => preset.id === focusedPresetId) || getPresetById(focusedPresetId) || null;
  }, [allPresets, focusedPresetId]);

  const handleCardClick = useCallback((presetId: string) => {
    selectPreset(presetId);
  }, [selectPreset]);

  const handleCardMouseEnter = useCallback((presetId: string) => {
    setFocusedPresetId(presetId);
  }, []);

  const renderPresetCard = useCallback((preset: PresetItem) => {
    const selected = isDraftSelected(preset.id);
    const favorite = isFavorite(preset);
    const presetName = getPresetName(preset);
    const thumbnail = preset.thumbnail?.trim();
    const sourcePresetThumbnail = preset.sourcePresetThumbnail?.trim();
    const showSourceThumbnail = preset.owner === 'user' && !thumbnail && Boolean(sourcePresetThumbnail);
    const shouldShowFallbackCover = preset.owner === 'user' && !thumbnail && !sourcePresetThumbnail;
    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => handleCardClick(preset.id)}
        onMouseEnter={() => handleCardMouseEnter(preset.id)}
        className="group relative overflow-hidden rounded-lg border text-left transition-all"
        style={{
          background: selected ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.025)',
          borderColor: selected ? 'rgba(167,139,250,0.82)' : 'rgba(255,255,255,0.08)',
          boxShadow: selected ? '0 0 0 1px rgba(167,139,250,0.28), 0 10px 26px rgba(0,0,0,0.28)' : 'none',
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
            title={favorite ? '点击移出常用' : '点击加入常用'}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(preset.id); }}
          >
            <Star className="h-3 w-3" fill={favorite ? 'currentColor' : 'none'} />
          </span>
          {/* Check indicator */}
          {selected && (
            <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: '#a78bfa', color: '#111' }}>
              <Check className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {/* Info */}
        <div className="px-3 py-2">
          <div className="truncate text-[13px] font-medium text-white/88">{presetName}</div>
          <div className="mt-0.5 truncate text-[11px] text-white/40">{getPresetShortDesc(preset)}</div>
        </div>
      </button>
    );
  }, [isDraftSelected, isFavorite, handleCardClick, handleCardMouseEnter, toggleFavorite]);

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
            <div className="text-[16px] font-semibold text-white/92">选择预设</div>
            <div className="mt-1 text-[12px]" style={{ color: 'rgba(255,255,255,0.48)' }}>
              预设会在生成时转化为提示词增强规则，帮助你快速获得理想效果。
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
                  style={isActive ? { background: 'rgba(167,139,250,0.16)' } : {}}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Right content */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Cards area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {activeTab === '我的常用' ? (
                visiblePresets.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                    <Bookmark className="mb-3 h-10 w-10 text-white/10" />
                    <div className="text-[13px] text-white/40">还没有常用预设</div>
                    <div className="mt-1 text-[11px] text-white/25">点击预设右上角的星标，或添加自己的预设。</div>
                    <button
                      type="button"
                      onClick={openCreateEditor}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium"
                      style={{ background: 'rgba(167,139,250,0.86)', color: '#111' }}
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
                      <span className="mt-1 text-[11px] text-white/30">保存常用提示词模板</span>
                    </button>
                  </div>
                )
              ) : activeTab === '换氛围' && atmospherePresets ? (
                <div className="space-y-5">
                  {ATMOSPHERE_GROUP_ORDER.map((groupKey) => {
                    const groupPresets = atmospherePresets[groupKey];
                    if (!groupPresets || groupPresets.length === 0) return null;
                    return (
                      <div key={groupKey}>
                        <div className="mb-2 text-[13px] font-medium text-white/70">{ATMOSPHERE_GROUP_LABELS[groupKey]}</div>
                        <div className="grid grid-cols-3 gap-3">
                          {groupPresets.map((preset) => renderPresetCard(preset))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {visiblePresets.map((preset) => renderPresetCard(preset))}
                </div>
              )}
            </div>

            {/* Detail section */}
            <div className="h-[190px] shrink-0 overflow-y-auto border-t px-5 py-4" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.028)' }}>
              {detailSection.title ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[18px] font-semibold text-white/92">{detailSection.title}</span>
                  </div>
                  {detailSection.description && (
                    <p className="mt-3 text-[13px] leading-7" style={{ color: 'rgba(255,255,255,0.64)' }}>
                      {detailSection.description}
                    </p>
                  )}
                  {detailSection.keywords.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {detailSection.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-md px-2 py-1 text-[11px]"
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.2)' }}
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {detailPreset?.owner === 'user' && (
                    <div className="mt-4 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openEditEditor(detailPreset)}
                        className="rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-white/8"
                        style={{ color: 'rgba(255,255,255,0.72)', border: '1px solid rgba(255,255,255,0.10)' }}
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUserPreset(detailPreset.id)}
                        className="rounded-lg px-3 py-1.5 text-[12px] transition-colors hover:bg-white/8"
                        style={{ color: 'rgba(248,113,113,0.88)', border: '1px solid rgba(248,113,113,0.20)' }}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </>
              ) : activeTab === '换氛围' ? (
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  选择时间段、天气和季节来组合画面氛围。每个维度最多选择一项。
                </p>
              ) : (
                <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  点击卡片选择预设，悬停查看详细说明。
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2">
            {draftPresetIds.length > 0 ? (
              <>
                <span className="text-[12px] text-white/35">已选 {draftPresetIds.length} 项</span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[12px] transition-colors hover:text-white/70"
                  style={{ color: 'rgba(255,255,255,0.42)' }}
                >
                  清除已选
                </button>
              </>
            ) : (
              <span className="text-[12px] text-white/25">未选择预设</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg px-3 py-2 text-[13px] transition-colors hover:bg-white/8"
              style={{ color: 'rgba(255,255,255,0.62)' }}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="rounded-lg px-3 py-2 text-[13px] font-medium"
              style={{ background: 'rgba(255,255,255,0.9)', color: '#111' }}
            >
              确认选择
            </button>
          </div>
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
                <div className="mt-1 text-[12px] text-white/42">保存一个常用提示词增强模板。</div>
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
                style={{ background: 'rgba(167,139,250,0.92)', color: '#111' }}
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
