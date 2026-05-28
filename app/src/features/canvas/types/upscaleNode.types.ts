export type UpscaleEngine = 'magnific_precision_v2' | 'magnific_creative' | 'topazlabs';

export type UpscaleStatus = 'idle' | 'running' | 'success' | 'failed';

export type UpscaleMode =
  | 'preserve'
  | 'clarity'
  | 'material'
  | 'denoise'
  | 'sharpen'
  | 'creative_detail';

export interface UpscaleHistoryItem {
  id: string;
  image: string;
  createdAt: number;
  engine: UpscaleEngine;
  scale: number;
  mode: UpscaleMode;
}

export interface UpscaleNodeData {
  label?: string;
  image?: string;
  currentImage?: string;
  inputImage?: string;
  outputImage?: string;
  width?: number;
  height?: number;

  // Unified core params
  engine: UpscaleEngine;
  scale: number;
  mode: UpscaleMode;
  fidelity: number;
  sharpness: number;
  denoise: number;
  detail: number;
  materialDetail: number;
  compressionRepair: number;

  // UI compatibility params (current panel uses these)
  tlModel?: string;
  tlScale?: number;
  mcUpscale?: string;
  mcOptimized?: string;
  mcCreativity?: number;
  mcDetail?: number;
  mcSimilarity?: number;
  mcPromptStr?: number;
  mpUpscale?: string;
  mpSharpen?: number;
  mpGrain?: number;
  mpUltra?: number;

  // State
  status: UpscaleStatus;
  progress: number;
  error?: string;

  // History
  history: UpscaleHistoryItem[];

  // Callback injected by CanvasPage
  onStartLineDraw?: (nodeId: string, x: number, y: number) => void;
  onCreateUpscaleNode?: (sourceNodeId: string, inputImage: string, width: number, height: number) => void;
}
