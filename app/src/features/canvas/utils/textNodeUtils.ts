import type { TextNodeActionType } from '../types/basicNode.types';
import { resolveNodeImage } from './resolveNodeImage';

export type TextNodeVisualState = 'empty' | 'ready' | 'processing';

interface TextNodeInputSource {
  type?: string;
  data: unknown;
}

interface TextNodeSubmitState {
  hasEditorInstruction: boolean;
  hasInputContent: boolean;
  isProcessing: boolean;
  canSubmit: boolean;
  nodeState: TextNodeVisualState;
}

const ALLOWED_TEXT_CONNECTIONS = new Set([
  'image:text',
  'text:text',
  'text:image',
]);

const COMPOSE_TEXT_OUTPUT_TARGETS = new Set([
  'image',
  'text',
  'video',
]);

export function isComposeTextNode(data: unknown): boolean {
  const record = (data || {}) as Record<string, unknown>;
  return record.textMode === 'compose';
}

export function isComposeTextOutputTarget(targetType: string | undefined): boolean {
  return COMPOSE_TEXT_OUTPUT_TARGETS.has(targetType || '');
}

export function removeComposeTextInputEdges<
  TEdge extends { target: string },
  TNode extends { id: string; type?: string; data: unknown },
>(edges: TEdge[], nodes: TNode[]): TEdge[] {
  const composeTextNodeIds = new Set(
    nodes
      .filter((node) => node.type === 'text' && isComposeTextNode(node.data))
      .map((node) => node.id),
  );
  if (composeTextNodeIds.size === 0) return edges;
  return edges.filter((edge) => !composeTextNodeIds.has(edge.target));
}

export function isTextWorkflowConnection(
  sourceType: string | undefined,
  targetType: string | undefined,
): boolean {
  return ALLOWED_TEXT_CONNECTIONS.has(`${sourceType || ''}:${targetType || ''}`);
}

export function getTextContent(data: unknown): string {
  const record = (data || {}) as Record<string, unknown>;
  return ((record.content as string) || (record.text as string) || '').trim();
}

export function getTextNodeInstruction(data: unknown): string {
  const record = (data || {}) as Record<string, unknown>;
  const editorInput = typeof record.editorInput === 'string' ? record.editorInput.trim() : '';
  const prompt = typeof record.prompt === 'string' ? record.prompt.trim() : '';
  return editorInput || prompt;
}

function hasValidImageData(data: unknown): boolean {
  if (resolveNodeImage(data)?.imageUrl.trim()) return true;

  const record = (data || {}) as Record<string, unknown>;
  return ['imageUrl', 'src', 'uploadedImage', 'uploadedImageUrl'].some((field) => {
    const value = record[field];
    return typeof value === 'string' && value.trim().length > 0;
  });
}

export function getTextNodeSubmitState(
  data: unknown,
  inputSources: TextNodeInputSource[],
): TextNodeSubmitState {
  const record = (data || {}) as Record<string, unknown>;
  const generationTask = record.generationTask;
  const generationTaskStatus =
    generationTask && typeof generationTask === 'object' && 'status' in generationTask
      ? generationTask.status
      : undefined;
  const isProcessing = Boolean(
    record.isProcessing ||
    record.isGenerating ||
    record.loading ||
    record.isLoading ||
    generationTaskStatus === 'running' ||
    generationTaskStatus === 'processing' ||
    generationTaskStatus === 'pending',
  );
  const hasEditorInstruction = getTextNodeInstruction(record).length > 0;
  const hasInputContent = inputSources.some((source) => {
    if (source.type === 'text') {
      return getTextContent(source.data).length > 0;
    }
    return false;
  });
  const hasValidImageInput = inputSources.some(
    (source) => source.type === 'image' && hasValidImageData(source.data),
  );
  const isImageExtraction = record.lastActionType === 'image_to_text';
  const hasReadyContent = isImageExtraction
    ? hasEditorInstruction && hasValidImageInput
    : hasEditorInstruction || hasInputContent;

  return {
    hasEditorInstruction,
    hasInputContent,
    isProcessing,
    canSubmit: !isProcessing && hasReadyContent,
    nodeState: isProcessing ? 'processing' : hasReadyContent ? 'ready' : 'empty',
  };
}

export async function simulateTextNodeResult({
  action,
  instruction,
  sourceText,
  sourceImageTitle,
}: {
  action: TextNodeActionType;
  instruction: string;
  sourceText: string;
  sourceImageTitle?: string;
}): Promise<string> {
  const delay = 2000 + Math.floor(Math.random() * 2001);
  await new Promise((resolve) => setTimeout(resolve, delay));

  if (action === 'image_to_text') {
    const source = sourceImageTitle ? `（来源：${sourceImageTitle}）` : '';
    return `主体描述
现代建筑主体${source}，体量关系清晰，立面层次明确。玻璃、金属、石材与混凝土等材质表达真实，结构细节完整。

环境氛围
建筑与周边景观、道路及公共空间形成协调关系，场景整洁有序，整体氛围自然、安静且具有真实尺度感。

光影表现
柔和自然光塑造建筑轮廓，明暗过渡细腻，玻璃反射与实体材质质感清晰，阴影方向统一并强调空间纵深。

镜头视角
接近人视高度的广角构图，主体位于视觉中心，透视关系自然，前景、中景与背景层次完整。

风格关键词
建筑可视化、写实渲染、自然光影、真实材质、清晰层次、克制色彩、高品质效果图。

可选避免内容
避免过度饱和、过强锐化、畸变透视、材质失真、玻璃反射错误、重复人物、漂浮物体、杂乱背景、明显噪点、文字水印与低清晰度。`;
  }

  if (action === 'text_to_text') {
    const base = sourceText.trim();
    const direction = instruction.trim();
    return `${direction ? `${direction}。\n\n` : ''}${base}

以专业建筑可视化语言呈现，保持主体体量关系清晰、空间层次完整、材质表达真实。采用自然且统一的光影关系，突出建筑立面、玻璃反射、景观细节与环境尺度，画面构图稳定，透视准确，色彩克制，整体达到高品质写实效果图质感。

避免过度饱和、畸变透视、结构错位、材质失真、错误反射、重复人物、漂浮物体、杂乱背景、明显噪点、文字水印和低清晰度。`;
  }

  const imageContext = sourceImageTitle ? `，参考图片为${sourceImageTitle}` : '';
  return `${instruction.trim()}${imageContext}。

画面采用专业建筑可视化表现，主体建筑体量明确，立面细节清晰，周边景观与环境关系自然。光线柔和统一，阴影层次细腻，玻璃、金属、石材和混凝土材质真实可信；镜头透视准确，构图稳定，色彩克制，整体呈现高品质写实效果图质感。

避免过度饱和、过强锐化、畸变透视、结构错位、材质失真、错误反射、重复人物、漂浮物体、杂乱背景、明显噪点、文字水印和低清晰度。`;
}
