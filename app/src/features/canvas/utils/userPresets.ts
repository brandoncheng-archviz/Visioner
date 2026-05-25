import type { PresetItem } from '../types/imageNode.types';

export const USER_PRESETS_STORAGE_KEY = 'visioner_user_presets';
export const DEFAULT_USER_PRESET_THUMBNAIL = '/presets/custom/default.webp';

export interface UserPresetDraft {
  id?: string;
  name: string;
  prompt: string;
  thumbnail?: string;
  userFavorite?: boolean;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function createUserPreset(draft: UserPresetDraft): PresetItem {
  const prompt = draft.prompt.trim();
  return {
    id: draft.id || `user_preset_${Date.now()}`,
    name: draft.name.trim(),
    tabs: ['我的常用'],
    category: 'mine',
    owner: 'user',
    group: 'user_custom',
    selectType: 'multi',
    presetType: 'enhancement',
    shortDescription: '自定义预设',
    detailDescription: prompt,
    keywords: [],
    recommendedInCommon: false,
    userFavorite: draft.userFavorite ?? true,
    tags: ['自定义预设'],
    thumbnail: draft.thumbnail?.trim() || undefined,
    promptTemplate: prompt,
  };
}

export function loadUserPresets(): PresetItem[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = window.localStorage.getItem(USER_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PresetItem[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((preset) => preset && preset.owner === 'user' && typeof preset.promptTemplate === 'string')
      .map((preset) => ({
        ...preset,
        tabs: ['我的常用'],
        category: 'mine',
        owner: 'user',
        group: 'user_custom',
        selectType: 'multi',
        shortDescription: preset.shortDescription || '自定义预设',
        detailDescription: preset.detailDescription || String(preset.promptTemplate),
        keywords: preset.keywords || [],
        tags: preset.tags?.length ? preset.tags : ['自定义预设'],
        thumbnail: preset.thumbnail === DEFAULT_USER_PRESET_THUMBNAIL ? undefined : preset.thumbnail,
      }));
  } catch {
    return [];
  }
}

export function saveUserPresets(presets: PresetItem[]) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.setItem(USER_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore storage failures
  }
}

export function getUserPresetById(id: string) {
  return loadUserPresets().find((preset) => preset.id === id);
}

export function upsertUserPreset(presets: PresetItem[], draft: UserPresetDraft) {
  const nextPreset = createUserPreset(draft);
  const exists = presets.some((preset) => preset.id === nextPreset.id);
  const nextPresets = exists
    ? presets.map((preset) => (preset.id === nextPreset.id ? nextPreset : preset))
    : [...presets, nextPreset];
  saveUserPresets(nextPresets);
  return nextPresets;
}

export function deleteUserPreset(presets: PresetItem[], presetId: string) {
  const nextPresets = presets.filter((preset) => preset.id !== presetId);
  saveUserPresets(nextPresets);
  return nextPresets;
}

export function setUserPresetFavorite(presets: PresetItem[], presetId: string, userFavorite: boolean) {
  const nextPresets = presets.map((preset) => (preset.id === presetId ? { ...preset, userFavorite } : preset));
  saveUserPresets(nextPresets);
  return nextPresets;
}
