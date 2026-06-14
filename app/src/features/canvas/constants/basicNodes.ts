export const CREATE_NODE_MENU_WIDTH = 280;
export const CREATE_NODE_MENU_TOP_OFFSET = 24;
export const CREATE_NODE_MENU_VIEWPORT_PADDING = 12;

export const BASIC_NODE_DEFINITIONS = [
  {
    type: 'text',
    labelKey: 'canvas.createMenuTextNode',
    color: '#a855f7',
  },
  {
    type: 'image',
    labelKey: 'canvas.createMenuImageNode',
    color: '#22d3ee',
  },
  {
    type: 'video',
    labelKey: 'canvas.createMenuVideoNode',
    color: '#60a5fa',
  },
] as const;

export type BasicNodeType = (typeof BASIC_NODE_DEFINITIONS)[number]['type'];
