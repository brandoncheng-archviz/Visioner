export type MarkAction = 'reference' | 'keep' | 'enhance' | 'weaken' | 'replace' | 'delete' | 'constraint';

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
