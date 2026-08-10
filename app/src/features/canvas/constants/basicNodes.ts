export const CREATE_NODE_MENU_WIDTH = 264;
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
    type: 'exteriorRender',
    labelKey: 'canvas.createMenuExteriorRenderNode',
    color: '#38bdf8',
  },
  {
    type: 'upscale',
    labelKey: 'canvas.createMenuUpscaleNode',
    color: '#22c55e',
  },
  {
    type: 'compare',
    labelKey: 'canvas.createMenuCompareNode',
    color: '#38bdf8',
  },
] as const;

export type BasicNodeType = (typeof BASIC_NODE_DEFINITIONS)[number]['type'];
