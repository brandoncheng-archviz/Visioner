import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { Clipboard, Copy, Download, FileText, ImagePlus, Maximize2, PenLine, Plus, Trash2 } from 'lucide-react';
import {
  Handle,
  NodeResizeControl,
  Position,
  useReactFlow,
  useStore,
  type NodeProps,
} from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_TEXT_NODE_MODEL,
  TEXT_NODE_MAX_HEIGHT,
  TEXT_NODE_MIN_HEIGHT,
  TEXT_NODE_WIDTH,
} from '../constants/textNode';
import {
  CANVAS_NODE_CARD_BACKGROUND,
  CANVAS_NODE_CARD_BORDER_COLOR,
  CANVAS_NODE_CARD_BORDER_WIDTH,
  CANVAS_NODE_CARD_RADIUS,
  CANVAS_NODE_CARD_SELECTED_BORDER_COLOR,
} from '../constants/canvasConstants';
import { ImageToolbar } from '../components/ImageToolbar';
import { FullscreenCloseButton } from '../components/FullscreenCloseButton';
import { useFullscreenEscape } from '../hooks/useFullscreenEscape';
import type { TextNodeActionType, TextNodeData } from '../types/basicNode.types';
import {
  getTextContent,
  getTextNodeSubmitState,
  isComposeTextNode,
  type TextNodeVisualState,
} from '../utils/textNodeUtils';

export type { TextNodeVisualState };

const EMPTY_ACTIONS: Array<{
  action: TextNodeActionType;
  label: string;
  icon: typeof PenLine;
}> = [
  { action: 'draft', label: '编写内容', icon: PenLine },
  { action: 'image_to_text', label: '从图片提取描述', icon: FileText },
  { action: 'text_to_image', label: '生成图片', icon: ImagePlus },
];

const TEXT_NODE_RESIZE_MIN_HEIGHT = 240;
const TEXT_NODE_RESIZE_MAX_WIDTH = 960;
const TEXT_NODE_RESIZE_MAX_HEIGHT = 800;

function TextNodeGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="48"
      height="36"
      viewBox="0 0 48 36"
      fill="none"
      aria-hidden="true"
    >
      <rect x="4" y="2" width="40" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="11" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.75" />
      <rect x="4" y="20" width="40" height="3" rx="1.5" fill="currentColor" />
      <rect x="4" y="29" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

export function TextNode({ data, selected, id, width, height }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const nodeData = data as TextNodeData;
  const isComposeMode = isComposeTextNode(nodeData);
  const title = nodeData.label || nodeData.title || '文本节点';
  const content = getTextContent(nodeData);
  const usesTextResourceLayout = isComposeMode || (nodeData.status === 'result' && content.length > 0);
  const [resizeDimensions, setResizeDimensions] = useState<{ width: number; height: number } | null>(null);
  const nodeWidth = usesTextResourceLayout
    ? (resizeDimensions?.width ?? width ?? TEXT_NODE_WIDTH)
    : TEXT_NODE_WIDTH;
  const nodeHeight = usesTextResourceLayout
    ? (resizeDimensions?.height ?? height ?? TEXT_NODE_MIN_HEIGHT)
    : undefined;
  const inlineContent = nodeData.content ?? nodeData.text ?? '';
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [showFullscreen, setShowFullscreen] = useState(false);
  const closeFullscreen = useCallback(() => setShowFullscreen(false), [setShowFullscreen]);
  useFullscreenEscape(showFullscreen, closeFullscreen);
  const [inlineEditorHeight, setInlineEditorHeight] = useState(TEXT_NODE_MIN_HEIGHT);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);
  const incomingSourceNodes = useMemo(
    () =>
      (isComposeMode ? [] : allEdges)
        .filter((edge) => edge.target === id)
        .map((edge) => allNodes.find((node) => node.id === edge.source))
        .filter((node) => node !== undefined),
    [allEdges, allNodes, id, isComposeMode],
  );
  const { isProcessing, nodeState } = getTextNodeSubmitState(nodeData, incomingSourceNodes);
  const hasTextContent = content.trim().length > 0;

  const references = useMemo(() => {
    const incoming = isComposeMode ? [] : allEdges.filter((edge) => edge.target === id);
    return {
      imageIds: incoming
        .filter((edge) => allNodes.find((node) => node.id === edge.source)?.type === 'image')
        .map((edge) => edge.source),
      textIds: incoming
        .filter((edge) => allNodes.find((node) => node.id === edge.source)?.type === 'text')
        .map((edge) => edge.source),
      outputImageIds: allEdges
        .filter((edge) => edge.source === id && allNodes.find((node) => node.id === edge.target)?.type === 'image')
        .map((edge) => edge.target),
    };
  }, [allEdges, allNodes, id, isComposeMode]);

  useEffect(() => {
    const nextStatus = content ? 'result' : (nodeData.status || 'empty');
    const unchanged =
      JSON.stringify(nodeData.referencedImageNodeIds || []) === JSON.stringify(references.imageIds) &&
      JSON.stringify(nodeData.referencedTextNodeIds || []) === JSON.stringify(references.textIds) &&
      JSON.stringify(nodeData.outputTargetImageNodeIds || []) === JSON.stringify(references.outputImageIds) &&
      nodeData.status === nextStatus &&
      nodeData.activeModel;
    if (unchanged) return;

    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                title,
                content,
                status: nextStatus,
                referencedImageNodeIds: references.imageIds,
                referencedTextNodeIds: references.textIds,
                outputTargetImageNodeIds: references.outputImageIds,
                activeModel: nodeData.activeModel || DEFAULT_TEXT_NODE_MODEL,
              },
            }
          : node,
      ),
    );
  }, [
    content,
    id,
    nodeData.activeModel,
    nodeData.outputTargetImageNodeIds,
    nodeData.referencedImageNodeIds,
    nodeData.referencedTextNodeIds,
    nodeData.status,
    references,
    setNodes,
    title,
  ]);

  useEffect(() => {
    if (!isInlineEditing) return;

    const frame = window.requestAnimationFrame(() => {
      inlineTextareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isInlineEditing]);

  useEffect(() => {
    if (!isProcessing) return;

    const frame = window.requestAnimationFrame(() => {
      setIsInlineEditing(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isProcessing]);

  const startInlineEditing = () => {
    if (isProcessing) return;
    const currentHeight = previewCardRef.current?.offsetHeight || TEXT_NODE_MIN_HEIGHT;
    setInlineEditorHeight(Math.min(Math.max(currentHeight, TEXT_NODE_MIN_HEIGHT), TEXT_NODE_MAX_HEIGHT));
    setIsInlineEditing(true);
  };

  const triggerAction = (action: TextNodeActionType) => {
    if (isProcessing) return;
    if (action === 'draft') {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  textMode: 'compose',
                  textSource: 'manual',
                },
              }
            : node,
        ),
      );
      startInlineEditing();
      return;
    }
    nodeData.onTextAction?.(id, action);
  };

  const handleInlineContentChange = (value: string) => {
    if (isProcessing) return;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                content: value,
                text: value,
              },
            }
          : node,
      ),
    );
  };

  const handleInlineEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();

    if (event.key === 'Escape' || ((event.ctrlKey || event.metaKey) && event.key === 'Enter')) {
      event.preventDefault();
      setIsInlineEditing(false);
    }
  };

  const handleCopyText = async () => {
    if (isProcessing || !hasTextContent) return;
    await navigator.clipboard?.writeText(content);
  };

  const handleDownloadText = () => {
    if (isProcessing || !hasTextContent) return;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'text-node'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDuplicateNode = () => {
    if (isProcessing) return;
    nodeData.onDuplicateNode?.(id);
  };

  const handleDeleteNode = () => {
    if (isProcessing) return;
    nodeData.onDeleteNode?.(id);
  };

  const toolbarActions = [
    { icon: Maximize2, label: t('imageNode.fullscreen'), action: () => setShowFullscreen(true), disabled: isProcessing || !hasTextContent },
    { icon: Clipboard, label: t('common.copyText'), action: handleCopyText, disabled: isProcessing || !hasTextContent },
    { icon: Copy, label: t('common.createCopy'), action: handleDuplicateNode, disabled: isProcessing },
    { icon: Download, label: t('common.download'), action: handleDownloadText, disabled: isProcessing || !hasTextContent },
    { icon: Trash2, label: t('common.delete'), action: handleDeleteNode, disabled: isProcessing, danger: true },
  ];

  const startLineDraw = (
    event: PointerEvent<HTMLDivElement>,
    sourceHandleId: 'left-target' | 'right-source',
  ) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    nodeData.onStartLineDraw?.(
      id,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      sourceHandleId,
      sourceHandleId === 'left-target' ? 'target' : 'source',
    );
  };

  return (
    <div
      className={usesTextResourceLayout ? 'group/text-node flex min-h-0 flex-col' : undefined}
      style={{
        width: nodeWidth,
        height: nodeHeight,
        minWidth: usesTextResourceLayout ? TEXT_NODE_WIDTH : undefined,
        minHeight: usesTextResourceLayout ? 240 : undefined,
      }}
    >
      {selected && (
        <div
          className="absolute z-20 flex justify-center"
          style={{
            top: -80 / zoom,
            left: nodeWidth / 2,
            transform: `translateX(-50%) scale(${inverseScale})`,
            transformOrigin: 'top center',
          }}
        >
          <ImageToolbar actions={toolbarActions} />
        </div>
      )}
      <div
        className="pointer-events-none"
        style={{
          position: 'relative',
          height: 18 / zoom,
          marginBottom: 4 / zoom,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `scale(${inverseScale})`,
            transformOrigin: 'top left',
            width: nodeWidth * zoom,
            color: 'rgba(255,255,255,0.5)',
            fontSize: 11,
          }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
            <svg className="flex-shrink-0" style={{ width: 13, height: 13 }} viewBox="0 0 13 13" fill="none">
              <rect x="1" y="1.2" width="9" height="1" rx="0.5" fill="rgba(255,255,255,0.5)" />
              <rect x="1" y="3.8" width="5.5" height="1" rx="0.5" fill="rgba(255,255,255,0.42)" />
              <rect x="1" y="6.4" width="9" height="1" rx="0.5" fill="rgba(255,255,255,0.5)" />
              <rect x="1" y="9" width="5.5" height="1" rx="0.5" fill="rgba(255,255,255,0.42)" />
            </svg>
            <span className="truncate">{title}</span>
          </div>
        </div>
      </div>

      <div className={`relative overflow-visible ${usesTextResourceLayout ? 'min-h-0 flex-1' : ''}`}>
        <div
          ref={previewCardRef}
          className="node-preview-card relative overflow-hidden rounded-[24px] transition-colors"
          style={{
            width: '100%',
            minHeight: usesTextResourceLayout ? 0 : TEXT_NODE_MIN_HEIGHT,
            maxHeight: usesTextResourceLayout ? undefined : TEXT_NODE_MAX_HEIGHT,
            height: usesTextResourceLayout ? '100%' : isInlineEditing ? inlineEditorHeight : undefined,
            background: CANVAS_NODE_CARD_BACKGROUND,
            border: `${CANVAS_NODE_CARD_BORDER_WIDTH}px solid ${selected ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : CANVAS_NODE_CARD_BORDER_COLOR}`,
            borderRadius: CANVAS_NODE_CARD_RADIUS,
            boxSizing: 'border-box',
            boxShadow: 'none',
          }}
        >
          {isInlineEditing ? (
            <textarea
              ref={inlineTextareaRef}
              autoFocus
              value={inlineContent}
              disabled={isProcessing}
              placeholder="输入文本内容..."
              onChange={(event) => handleInlineContentChange(event.target.value)}
              onBlur={() => setIsInlineEditing(false)}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={handleInlineEditorKeyDown}
              onWheel={(event) => event.stopPropagation()}
              onWheelCapture={(event) => event.stopPropagation()}
              className={`text-node-editor-scrollbar nodrag nowheel block h-full min-h-0 w-full resize-none overflow-x-hidden overflow-y-auto overscroll-contain bg-transparent px-4 py-4 text-[15px] leading-6 text-white/72 outline-none placeholder:text-white/24 ${
                usesTextResourceLayout ? 'pb-9 pr-8' : ''
              }`}
              style={{
                maxHeight: usesTextResourceLayout ? '100%' : TEXT_NODE_MAX_HEIGHT,
                boxSizing: 'border-box',
              }}
              aria-label="编写文本内容"
            />
          ) : content ? (
            <div
              className={`text-node-editor-scrollbar nowheel h-full min-h-0 w-full select-none overflow-x-hidden overflow-y-auto overscroll-contain whitespace-pre-wrap break-words px-4 py-4 text-[15px] leading-6 text-white/68 [overflow-wrap:anywhere] ${
                usesTextResourceLayout ? 'pb-9 pr-8' : 'pr-3'
              }`}
              style={{ maxHeight: usesTextResourceLayout ? '100%' : TEXT_NODE_MAX_HEIGHT }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                startInlineEditing();
              }}
              onWheel={(event) => event.stopPropagation()}
              onWheelCapture={(event) => event.stopPropagation()}
            >
              {content}
            </div>
          ) : isComposeMode ? (
            <div
              className="flex h-full min-h-0 flex-col items-center justify-center px-6 py-6 text-center"
              onDoubleClick={(event) => {
                event.stopPropagation();
                startInlineEditing();
              }}
            >
              <TextNodeGlyph className="mb-7 text-white/16" />
              <div className="text-[15px] leading-6 text-white/30">
                双击编写内容，开始你的创作。
              </div>
            </div>
          ) : nodeState !== 'empty' || incomingSourceNodes.length > 0 ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <TextNodeGlyph className="text-white/16" />
            </div>
          ) : (
            <div
              className="flex min-h-[300px] flex-col items-center justify-center px-6 py-6"
              onDoubleClick={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                event.stopPropagation();
                triggerAction('draft');
              }}
            >
              <TextNodeGlyph className="-mt-3 mb-7 text-white/14" />
              <div className="mb-1 w-full px-2 text-[11px] text-white/22">尝试：</div>
              <div className="w-full space-y-0.5">
                {EMPTY_ACTIONS.map(({ action, label, icon: Icon }) => (
                  <button
                    key={action}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerAction(action);
                    }}
                    className="nodrag flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] text-white/34 transition-colors hover:bg-white/[0.035] hover:text-white/46"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-white/22" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {usesTextResourceLayout && selected && !isProcessing && (
          <NodeResizeControl
            nodeId={id}
            position="bottom-right"
            minWidth={TEXT_NODE_WIDTH}
            minHeight={TEXT_NODE_RESIZE_MIN_HEIGHT}
            maxWidth={TEXT_NODE_RESIZE_MAX_WIDTH}
            maxHeight={TEXT_NODE_RESIZE_MAX_HEIGHT}
            onResize={(_event, params) => {
              setResizeDimensions({
                width: params.width,
                height: params.height,
              });
            }}
            onResizeEnd={(_event, params) => {
              setNodes((nodes) =>
                nodes.map((node) =>
                  node.id === id
                    ? {
                        ...node,
                        width: params.width,
                        height: params.height,
                      }
                    : node,
                ),
              );
              setResizeDimensions(null);
            }}
            className="nodrag nopan opacity-0 transition-opacity duration-150 group-hover/text-node:opacity-70 hover:!opacity-100"
            style={{
              right: 12,
              bottom: 12,
              width: 18,
              height: 18,
              transform: 'none',
              border: 0,
              background: 'transparent',
              cursor: 'nwse-resize',
              zIndex: 20,
            }}
          >
            <svg
              className="pointer-events-none h-full w-full text-white/90"
              viewBox="0 0 18 18"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M5 14C10 14 14 10 14 5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </NodeResizeControl>
        )}

        {!isComposeMode && (
          <div
            className="image-node-handle input-port"
            data-port-type="input"
            data-data-type="text"
            data-handle-id="left-target"
            data-handle-type="target"
            onPointerDown={(event) => startLineDraw(event, 'left-target')}
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(20,20,26,0.55)',
              border: '1.5px solid rgba(255,255,255,0.25)',
              backdropFilter: 'blur(12px)',
              zIndex: 10,
              pointerEvents: 'auto',
            }}
          >
            <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
          </div>
        )}
        <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="text"
          data-handle-id="right-source"
          data-handle-type="source"
          onPointerDown={(event) => startLineDraw(event, 'right-source')}
          style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translate(50%, -50%)',
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(20,20,26,0.55)',
            border: '1.5px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(12px)',
            zIndex: 10,
            pointerEvents: 'auto',
          }}
        >
          <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
        </div>

        {!isComposeMode && (
          <Handle
            type="target"
            position={Position.Left}
            id="left-target"
            style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%', zIndex: 9, pointerEvents: 'none' }}
          />
        )}
        <Handle
          type="source"
          position={Position.Left}
          id="left-source"
          style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%', zIndex: 9, pointerEvents: 'none' }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right-source"
          style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%', zIndex: 9, pointerEvents: 'none' }}
        />
        <Handle
          type="target"
          position={Position.Right}
          id="right-target"
          style={{ opacity: 0, width: 28, height: 28, right: 0, top: '50%', zIndex: 9, pointerEvents: 'none' }}
        />
      </div>
      {showFullscreen && hasTextContent && createPortal(
        <div
          data-canvas-escape-layer="true"
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-8"
          onClick={closeFullscreen}
        >
          <FullscreenCloseButton onClose={closeFullscreen} />
          <div
            className="max-h-[82vh] w-[min(820px,92vw)] overflow-hidden rounded-[18px] border border-white/10 bg-[#1a1a1a] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center border-b border-white/[0.08] px-5 py-3">
              <div className="truncate text-[14px] font-medium text-white/82">{title}</div>
            </div>
            <pre className="max-h-[72vh] overflow-auto whitespace-pre-wrap break-words px-5 py-4 text-[15px] leading-7 text-white/76">{content}</pre>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
