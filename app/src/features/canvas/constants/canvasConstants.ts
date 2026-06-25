import type { MarkAction, ModelParams } from '../types/canvas.types';

export const CANVAS_MIN_ZOOM = 0.1;
export const CANVAS_MAX_ZOOM = 1.8;
export const IMAGE_NODE_PREVIEW_WIDTH = 440;
export const IMAGE_NODE_EMPTY_WIDTH = 300;
export const IMAGE_NODE_EMPTY_HEIGHT = 300;
export const IMAGE_NODE_MIN_IMAGE_SIZE = 180; // Kept for backward compatibility
export const IMAGE_NODE_MIN_IMAGE_WIDTH = 180;
export const IMAGE_NODE_MIN_IMAGE_HEIGHT = 140;
export const IMAGE_NODE_MAX_IMAGE_WIDTH = 500;
export const IMAGE_NODE_MAX_IMAGE_HEIGHT = 360;
export const IMAGE_NODE_CONTROL_WIDTH = 640;
export const IMAGE_NODE_CONTROL_HEIGHT = 252;
export const IMAGE_NODE_CONTROL_EXPANDED_HEIGHT = 344;
export const CANVAS_NODE_CONTROL_SCALE = 0.88;
export const FLOATING_PANEL_BACKGROUND = '#252526';
export const FLOATING_PANEL_BORDER = '1px solid rgba(255,255,255,0.08)';
export const CANVAS_NODE_CARD_RADIUS = 24;
export const CANVAS_NODE_CARD_BACKGROUND = '#1a1a1a';
export const CANVAS_NODE_CARD_BORDER_WIDTH = 2.5;
export const CANVAS_NODE_CARD_BORDER_COLOR = 'rgba(42,42,53,0.98)';
export const CANVAS_NODE_CARD_SELECTED_BORDER_COLOR = '#2f6bff';
export const MAX_REFERENCE_IMAGES_PER_NODE = 6;
export const RECOMMENDED_REFERENCE_IMAGES_PER_NODE = 4;
export const MAX_LOCAL_REFERENCES_PER_NODE = 4;
export const REFERENCE_THUMBNAIL_VISIBLE_COUNT = 4;

export const MARK_ACTION_LABELS: Record<MarkAction, string> = {
  reference: 'reference',
  keep: 'keep',
  enhance: 'enhance',
  weaken: 'weaken',
  replace: 'replace',
  delete: 'delete',
  constraint: 'constraint',
};

export const MARK_ACTION_COLORS: Record<MarkAction, string> = {
  reference: '#4aa3ff',
  keep: '#4ade80',
  enhance: '#f59e0b',
  weaken: '#a78bfa',
  replace: '#fb923c',
  delete: '#ef4444',
  constraint: '#22d3ee',
};

export const DEFAULT_MODEL_PARAMS: ModelParams = {
  model: 'Nano Banana 2',
  ratio: '1:1',
  resolution: '2K',
  lens: '标准',
  count: '1张',
};

export const MODEL_OPTIONS = [
  { name: 'Nano Banana 2', icon: 'G', iconBg: '#4285f4', tags: ['Precise', 'Quality', 'Fast'], time: '25s' },
  { name: 'Nano Banana Pro', icon: 'G', iconBg: '#34a853', tags: ['Precise', 'Quality'], time: '50s' },
  { name: 'GPT Image 2', icon: '◎', iconBg: '#10a37f', tags: ['Style'], time: '40s' },
];

export const RESOLUTION_OPTIONS = ['1K', '2K', '4K'];

export const RATIO_OPTIONS = [
  { value: '自适应', icon: 'auto' },
  { value: '1:1', icon: 'square' },
  { value: '9:16', icon: 'portrait' },
  { value: '16:9', icon: 'landscape' },
  { value: '3:4', icon: 'portrait' },
  { value: '4:3', icon: 'landscape' },
  { value: '3:2', icon: 'landscape' },
  { value: '2:3', icon: 'portrait' },
  { value: '4:5', icon: 'portrait' },
  { value: '5:4', icon: 'landscape' },
  { value: '21:9', icon: 'ultrawide' },
];

export const COUNT_OPTIONS = ['1张', '2张', '4张'];

export const MAX_IMAGE_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB

export const ACCEPTED_IMAGE_UPLOAD_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);
