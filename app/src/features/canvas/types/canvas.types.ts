export type MarkAction = 'reference' | 'keep' | 'enhance' | 'weaken' | 'replace' | 'delete' | 'constraint';

/** Legacy action annotation. Image element recognition marks use ImageMark. */
export interface MarkItem {
  id: string;
  name: string;
  action: MarkAction;
  sourceIndex: number;
  description: string;
}

export interface ModelParams {
  model: string;
  ratio: string;
  resolution: string;
  lens: string;
  count: string;
}

export type UpscaleSliderProps = {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export type CompareMode = 'slider' | 'sideBySide' | 'overlay';

export interface CompareNodeData {
  label?: string;
  sliderPosition: number;
  compareMode?: CompareMode;
  overlayOpacity?: number;
}

export type ConnectionHandleType = 'source' | 'target';

export interface TempConnectionState {
  sourceNodeId: string;
  sourceHandleId: string;
  sourceHandleType: ConnectionHandleType;
  currentX: number;
  currentY: number;
}

export interface CreateConnectionMenuState {
  x: number;
  y: number;
  flowPos: { x: number; y: number };
  sourceNodeId: string;
  sourceHandleId: string;
  sourceHandleType: ConnectionHandleType;
}
