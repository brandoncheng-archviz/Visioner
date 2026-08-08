export const CREATE_NODE_MENU_WIDTH = 264;
export const CREATE_NODE_MENU_TOP_OFFSET = 24;
export const CREATE_NODE_MENU_VIEWPORT_PADDING = 12;

export const BASIC_NODE_DEFINITIONS = [
  {
    type: 'text',
    labelKey: 'canvas.createMenuTextNode',
    color: '#a855f7',
    group: 'content',
  },
  {
    type: 'image',
    labelKey: 'canvas.createMenuImageNode',
    color: '#22d3ee',
    group: 'content',
  },
  {
    type: 'exteriorRender',
    labelKey: 'canvas.createMenuExteriorRenderNode',
    color: '#38bdf8',
    group: 'imageProcessing',
  },
  {
    type: 'upscale',
    labelKey: 'canvas.createMenuUpscaleNode',
    color: '#22c55e',
    group: 'imageProcessing',
  },
  {
    type: 'compare',
    labelKey: 'canvas.createMenuCompareNode',
    color: '#38bdf8',
    group: 'imageProcessing',
  },
] as const;

export const BASIC_NODE_GROUPS = [
  {
    id: 'content',
    labelKey: 'canvas.createMenuContentGroup',
  },
  {
    id: 'imageProcessing',
    labelKey: 'canvas.createMenuImageProcessingGroup',
  },
] as const;

export type BasicNodeType = (typeof BASIC_NODE_DEFINITIONS)[number]['type'];
