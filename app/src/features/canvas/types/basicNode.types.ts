export type TextNodeStatus = 'empty' | 'editing' | 'result';

export type TextNodeActionType =
  | 'draft'
  | 'image_to_text'
  | 'text_to_text'
  | 'text_to_image';

export type TextNodeModel =
  | 'Gemini 3.1 Pro'
  | 'Gemini 3.1 Flash Lite'
  | 'Gemini 3 Flash'
  | 'DeepSeek V4 Pro';

export interface TextReferenceInfo {
  nodeId: string;
  title: string;
  content: string;
  status: TextNodeStatus;
}

export interface TextNodeData {
  label?: string;
  title?: string;
  text?: string;
  content?: string;
  status?: TextNodeStatus;
  referencedImageNodeIds?: string[];
  referencedTextNodeIds?: string[];
  outputTargetImageNodeIds?: string[];
  activeModel?: TextNodeModel;
  lastActionType?: TextNodeActionType | null;
  editorInput?: string;
  isProcessing?: boolean;
  onStartLineDraw?: (nodeId: string, x: number, y: number, sourceHandleId: string) => void;
  onTextAction?: (nodeId: string, action: TextNodeActionType) => void;
}

export interface VideoNodeData {
  label?: string;
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  duration?: number;
}
