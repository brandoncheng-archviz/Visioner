import { MAX_MULTI_PRESETS_BY_GROUP, getPresetById } from '../constants/presets';

export function isSelectablePresetId(presetId: string): boolean {
  const preset = getPresetById(presetId);
  return Boolean(preset && preset.category !== 'style' && preset.tabs.length > 0);
}

function addPresetSelection(currentPresetIds: string[], presetId: string): string[] {
  const preset = getPresetById(presetId);
  if (!preset || preset.category === 'style' || preset.tabs.length === 0) {
    return currentPresetIds;
  }
  if (currentPresetIds.includes(presetId)) {
    return currentPresetIds;
  }

  let nextPresetIds = currentPresetIds.filter((id) => {
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

export function normalizePresetSelection(presetIds: string[]): string[] {
  return presetIds.reduce<string[]>((normalizedIds, presetId) => addPresetSelection(normalizedIds, presetId), []);
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

  return addPresetSelection(normalizedPresetIds, presetId);
}
