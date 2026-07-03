export type ImageMarkCaptureEntry = {
  nodeId: string;
  imageUrl: string;
  element: HTMLImageElement;
  canMark: (targetNodeId: string) => boolean;
  startIdentify: (event: PointerEvent, targetNodeId: string) => void;
};

const entries = new Map<string, ImageMarkCaptureEntry>();
const listeners = new Set<() => void>();
let version = 0;

function emitChange() {
  version += 1;
  listeners.forEach((listener) => listener());
}

export function registerImageMarkCaptureEntry(entry: ImageMarkCaptureEntry) {
  entries.set(entry.nodeId, entry);
  emitChange();
  return () => {
    if (entries.get(entry.nodeId) !== entry) return;
    entries.delete(entry.nodeId);
    emitChange();
  };
}

export function getImageMarkCaptureEntries() {
  return Array.from(entries.values());
}

export function subscribeImageMarkCaptureRegistry(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getImageMarkCaptureRegistrySnapshot() {
  return version;
}
