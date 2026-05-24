import { MAX_MULTI_PRESETS_BY_GROUP, getPresetById } from '../constants/presets';

export function isSelectablePresetId(presetId: string): boolean {
  const preset = getPresetById(presetId);
  return Boolean(preset && preset.category !== 'style' && preset.tabs.length > 0);
}

export function normalizePresetSelection(presetIds: string[]): string[] {
  return presetIds.filter(isSelectablePresetId);
}

export function togglePresetSelection(currentPresetIds: string[], presetId: string): string[] {
  const preset = getPresetById(presetId);
  if (!preset || preset.category === 'style' || preset.tabs.length === 0) {
    return normalizePresetSelection(currentPresetIds);
  }

  const normalizedPresetIds = normalizePresetSelection(currentPresetIds);
  if (normalizedPresetIds.includes(presetId)) {
    return normalizedPresetIds.filter((id) => id !== presetId);
  }

  let nextPresetIds = normalizedPresetIds.filter((id) => {
    const selectedPreset = getPresetById(id);
    if (!selectedPreset) return false;
    if (preset.exclusiveGroup && selectedPreset.exclusiveGroup === preset.exclusiveGroup) {
      return false;
    }
    if (selectedPreset.group !== preset.group) return true;
    return preset.selectType === 'multi';
  });

  const groupLimit = MAX_MULTI_PRESETS_BY_GROUP[preset.group];
  if (preset.selectType === 'multi' && groupLimit) {
    const presetsInGroup = nextPresetIds.filter((id) => getPresetById(id)?.group === preset.group);
    const overflowCount = presetsInGroup.length - groupLimit + 1;
    if (overflowCount > 0) {
      const idsToRemove = new Set(presetsInGroup.slice(0, overflowCount));
      nextPresetIds = nextPresetIds.filter((id) => !idsToRemove.has(id));
    }
  }

  return [...nextPresetIds, presetId];
}
