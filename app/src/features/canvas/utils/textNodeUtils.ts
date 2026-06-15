import type { TextNodeActionType } from '../types/basicNode.types';

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
  return editorInput || prompt || getTextContent(record);
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
      return getTextNodeInstruction(source.data).length > 0;
    }
    return false;
  });
  const hasReadyContent = hasEditorInstruction || hasInputContent;

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
  await new Promise((resolve) => setTimeout(resolve, 650));

  if (action === 'image_to_text') {
    const source = sourceImageTitle ? `（来源：${sourceImageTitle}）` : '';
    return `主体描述
现代建筑主体${source}，体量关系清晰，立面层次明确。

场景环境
建筑与周边景观、道路及配套空间形成完整环境关系。

光影氛围
柔和自然光，明暗过渡细腻，强调空间纵深与材质质感。

镜头视角
人视高度的广角构图，主体位于视觉中心，透视关系自然。

风格关键词
建筑可视化、写实、克制、清晰层次、高品质效果图。

材质细节
玻璃、金属、石材与混凝土细节真实，反射和粗糙度合理。

可选避免内容
避免过度饱和、畸变透视、杂乱背景、重复人物和失真材质。`;
  }

  if (action === 'text_to_text') {
    const base = sourceText || '当前引用文本暂无内容。';
    return `${instruction.trim() || '整理并优化以下文本，使其更适合建筑可视化生图：'}\n\n${base}`;
  }

  return instruction.trim();
}
