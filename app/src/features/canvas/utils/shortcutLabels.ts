export type ShortcutKeys = string[];

type PlatformShortcutLabels = {
  primaryModifier: string;
  alternateModifier: string;
  shiftModifier: string;
  copy: ShortcutKeys;
  paste: ShortcutKeys;
  undo: ShortcutKeys;
  redo: ShortcutKeys;
  selectAll: ShortcutKeys;
  delete: ShortcutKeys;
  zoomWheel: (scrollWheelLabel: string) => ShortcutKeys;
  shiftWheel: (scrollWheelLabel: string) => ShortcutKeys;
  spaceDrag: (dragLabel: string) => ShortcutKeys;
  alternateDrag: (dragLabel: string) => ShortcutKeys;
  lineBreak: ShortcutKeys;
  submit: ShortcutKeys;
};

export function isAppleDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const platform = navigator.platform?.toLowerCase() || '';
  const userAgent = navigator.userAgent?.toLowerCase() || '';

  return (
    platform.includes('mac') ||
    platform.includes('iphone') ||
    platform.includes('ipad') ||
    userAgent.includes('mac os') ||
    userAgent.includes('iphone') ||
    userAgent.includes('ipad')
  );
}

export function formatShortcut(keys: ShortcutKeys): string {
  return keys.join(' ');
}

export function getPlatformShortcutLabels(): PlatformShortcutLabels {
  const isApple = isAppleDevice();
  const primaryModifier = isApple ? '⌘' : 'Ctrl';
  const alternateModifier = isApple ? '⌥' : 'Alt';
  const shiftModifier = isApple ? '⇧' : 'Shift';

  return {
    primaryModifier,
    alternateModifier,
    shiftModifier,
    copy: [primaryModifier, 'C'],
    paste: [primaryModifier, 'V'],
    undo: [primaryModifier, 'Z'],
    redo: isApple ? [shiftModifier, primaryModifier, 'Z'] : [primaryModifier, 'Y'],
    selectAll: [primaryModifier, 'A'],
    delete: [isApple ? 'Delete' : 'Del'],
    zoomWheel: (scrollWheelLabel) => [primaryModifier, scrollWheelLabel],
    shiftWheel: (scrollWheelLabel) => [shiftModifier, scrollWheelLabel],
    spaceDrag: (dragLabel) => ['Space', dragLabel],
    alternateDrag: (dragLabel) => [alternateModifier, dragLabel],
    lineBreak: ['Enter', `${shiftModifier} Enter`],
    submit: [primaryModifier, 'Enter'],
  };
}
