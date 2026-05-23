import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Star, Bookmark, Plus } from 'lucide-react';

import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../constants/canvasConstants';
import { PRESET_DATA, PRESET_TABS, getPresetById } from '../constants/presets';
import type { PresetItem, PresetTab } from '../types/imageNode.types';
import { normalizePresetSelection, togglePresetSelection } from '../utils/presetSelection';

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
  return preset.name;
}

function getPresetShortDesc(preset: PresetItem): string {
  return preset.shortDescription;
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
  const [activeTab, setActiveTab] = useState<PresetTab>('常用');
  const [userFavorites, setUserFavorites] = useState<Set<string>>(() => loadUserFavorites());
  const [focusedPresetId, setFocusedPresetId] = useState<string | null>(null);

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

  const toggleFavorite = useCallback((presetId: string) => {
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
  }, []);

  const isDraftSelected = useCallback((presetId: string) => draftPresetIds.includes(presetId), [draftPresetIds]);

  const selectPreset = useCallback((presetId: string) => {
    setDraftPresetIds((prev) => togglePresetSelection(prev, presetId));
    setFocusedPresetId(presetId);
  }, []);

  const visiblePresets = useMemo(() => {
    return PRESET_DATA.filter((preset) => {
      // Skip style presets and those not in any tab (legacy data)
      if (preset.category === 'style') return false;

      if (activeTab === '常用') {
        return preset.tabs.includes('常用') || preset.recommendedInCommon || userFavorites.has(preset.id);
      }
      if (activeTab === '我的') {
        return false; // My presets are handled separately
      }
      return preset.tabs.includes(activeTab);
    });
  }, [activeTab, userFavorites]);

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

    const focused = focusedPresetId ? getPresetById(focusedPresetId) : null;
    if (focused) {
      return {
        title: focused.name,
        description: focused.detailDescription || focused.shortHelp || '',
        keywords: focused.keywords || [],
      };
    }

    const selected = draftPresetIds.map(getPresetById).filter((p): p is PresetItem => Boolean(p));
    if (selected.length === 1) {
      const p = selected[0];
      return {
        title: p.name,
        description: p.detailDescription || p.shortHelp || '',
        keywords: p.keywords || [],
      };
    }

    return { title: '', description: '', keywords: [] as string[] };
  }, [activeTab, draftPresetIds, focusedPresetId]);

  const handleCardClick = useCallback((presetId: string) => {
    selectPreset(presetId);
  }, [selectPreset]);

  const handleCardMouseEnter = useCallback((presetId: string) => {
    setFocusedPresetId(presetId);
  }, []);

  const renderPresetCard = useCallback((preset: PresetItem) => {
    const selected = isDraftSelected(preset.id);
    return (
      <button
        key={preset.id}
        type="button"
        onClick={() => handleCardClick(preset.id)}
        onMouseEnter={() => handleCardMouseEnter(preset.id)}
        className="group relative overflow-hidden rounded-lg border text-left transition-all"
        style={{
          minHeight: 151,
          background: selected ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.025)',
          borderColor: selected ? 'rgba(167,139,250,0.70)' : 'rgba(255,255,255,0.08)',
          boxShadow: selected ? '0 0 0 1px rgba(167,139,250,0.20)' : 'none',
        }}
      >
        {/* Thumbnail */}
        <div className="relative h-[112px] w-full overflow-hidden bg-white/[0.03]">
          <img
            src={preset.thumbnail}
            alt={getPresetName(preset)}
            className="block h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 100%)' }} />
          {/* Star icon */}
          <span
            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full transition-colors"
            style={{
              background: userFavorites.has(preset.id) ? 'rgba(245,158,11,0.85)' : 'rgba(0,0,0,0.35)',
              color: userFavorites.has(preset.id) ? '#fff' : 'rgba(255,255,255,0.7)',
            }}
            title={userFavorites.has(preset.id) ? '点击移出常用' : '点击加入常用'}
            onClick={(e) => { e.stopPropagation(); toggleFavorite(preset.id); }}
          >
            <Star className="h-3 w-3" fill={userFavorites.has(preset.id) ? 'currentColor' : 'none'} />
          </span>
          {/* Check indicator */}
          {selected && (
            <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: '#a78bfa' }}>
              <Check className="h-3 w-3 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
        {/* Info */}
        <div className="px-2.5 py-2">
          <div className="truncate text-[12px] font-medium text-white/88">{getPresetName(preset)}</div>
          <div className="mt-0.5 truncate text-[11px] text-white/40">{getPresetShortDesc(preset)}</div>
        </div>
      </button>
    );
  }, [isDraftSelected, userFavorites, handleCardClick, handleCardMouseEnter, toggleFavorite]);

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
          width: 'min(840px, calc(100vw - 32px))',
          height: 'min(620px, calc(100vh - 32px))',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 32px)',
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
            <div className="mt-auto px-3 pt-2">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              >
                <Plus className="h-3.5 w-3.5" />
                添加预设
              </button>
            </div>
          </div>

          {/* Right content */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            {/* Cards area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              {activeTab === '我的' ? (
                <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                  <Bookmark className="mb-3 h-10 w-10 text-white/10" />
                  <div className="text-[13px] text-white/40">还没有自定义预设</div>
                  <div className="mt-1 text-[11px] text-white/25">你可以将常用提示词保存为自己的预设，方便下次快速使用。</div>
                </div>
              ) : activeTab === '换氛围' && atmospherePresets ? (
                <div className="space-y-5">
                  {ATMOSPHERE_GROUP_ORDER.map((groupKey) => {
                    const groupPresets = atmospherePresets[groupKey];
                    if (!groupPresets || groupPresets.length === 0) return null;
                    return (
                      <div key={groupKey}>
                        <div className="mb-2 text-[13px] font-medium text-white/70">{ATMOSPHERE_GROUP_LABELS[groupKey]}</div>
                        <div className="grid grid-cols-4 gap-2.5">
                          {groupPresets.map((preset) => renderPresetCard(preset))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {visiblePresets.map((preset) => renderPresetCard(preset))}
                </div>
              )}
            </div>

            {/* Detail section */}
            <div className="h-[150px] shrink-0 overflow-y-auto border-t px-5 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.18)' }}>
              {detailSection.title ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-white/85">{detailSection.title}</span>
                  </div>
                  {detailSection.description && (
                    <p className="mt-1.5 text-[12px] leading-5" style={{ color: 'rgba(255,255,255,0.52)' }}>
                      {detailSection.description}
                    </p>
                  )}
                  {detailSection.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detailSection.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-md px-2 py-0.5 text-[11px]"
                          style={{ background: 'rgba(167,139,250,0.10)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.16)' }}
                        >
                          {kw}
                        </span>
                      ))}
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
    </div>,
    document.body,
  );
}
