/**
 * Generate the next sequential title for a node of a given base type.
 *
 * Rules:
 * - Format: `${baseTitle} ${twoDigitNumber}` (e.g. "图片 01", "对比 02")
 * - Numbers start at 01 and increment by 1
 * - Old unnumbered titles like `${baseTitle}` are treated as number 1
 * - Deleted gaps are NOT reused (always max + 1)
 * - Types are counted independently (each baseTitle has its own sequence)
 */

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getNextNodeTitle(existingLabels: string[], baseTitle: string): string {
  const regex = new RegExp(`^${escapeRegExp(baseTitle)}(?:\\s+(\\d+))?$`);

  let maxNumber = 0;

  for (const label of existingLabels) {
    if (!label) continue;
    const match = label.match(regex);
    if (match) {
      const num = match[1] ? parseInt(match[1], 10) : 1;
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  }

  const nextNumber = maxNumber + 1;
  const formatted = nextNumber < 10 ? `0${nextNumber}` : String(nextNumber);
  return `${baseTitle} ${formatted}`;
}

export function getNodeTitleBase(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(.*)\s+\d{1,3}$/);
  return match?.[1]?.trim() || trimmed;
}

export function getNextCopiedNodeTitle(existingLabels: string[], originalTitle: string, fallbackBaseTitle: string): string {
  const baseTitle = getNodeTitleBase(originalTitle) || fallbackBaseTitle;
  return getNextNodeTitle(existingLabels, baseTitle);
}
