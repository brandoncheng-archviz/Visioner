import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { FileText, ImagePlus, PenLine, Plus } from 'lucide-react';
import { Handle, Position, useReactFlow, useStore, type NodeProps } from '@xyflow/react';
import {
  DEFAULT_TEXT_NODE_MODEL,
  TEXT_NODE_MAX_HEIGHT,
  TEXT_NODE_MIN_HEIGHT,
  TEXT_NODE_WIDTH,
} from '../constants/textNode';
import type { TextNodeActionType, TextNodeData } from '../types/basicNode.types';
import { getTextContent } from '../utils/textNodeUtils';

const EMPTY_ACTIONS: Array<{
  action: TextNodeActionType;
  label: string;
  icon: typeof PenLine;
}> = [
  { action: 'draft', label: '编写内容', icon: PenLine },
  { action: 'image_to_text', label: '从图片提取描述', icon: FileText },
  { action: 'text_to_image', label: '生成图片', icon: ImagePlus },
];

export function TextNode({ data, selected, id }: NodeProps) {
  const { setNodes } = useReactFlow();
  const zoom = useStore((state) => state.transform[2]);
  const inverseScale = 1 / zoom;
  const nodeData = data as TextNodeData;
  const title = nodeData.label || nodeData.title || '文本节点';
  const content = getTextContent(nodeData);
  const inlineContent = nodeData.content ?? nodeData.text ?? '';
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [inlineEditorHeight, setInlineEditorHeight] = useState(TEXT_NODE_MIN_HEIGHT);
  const previewCardRef = useRef<HTMLDivElement>(null);
  const inlineTextareaRef = useRef<HTMLTextAreaElement>(null);
  const allEdges = useStore((state) => state.edges);
  const allNodes = useStore((state) => state.nodes);

  const references = useMemo(() => {
    const incoming = allEdges.filter((edge) => edge.target === id);
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
  }, [allEdges, allNodes, id]);

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

  const startInlineEditing = () => {
    setInlineEditorHeight(previewCardRef.current?.offsetHeight || TEXT_NODE_MIN_HEIGHT);
    setIsInlineEditing(true);
  };

  const triggerAction = (action: TextNodeActionType) => {
    if (action === 'draft') {
      startInlineEditing();
      return;
    }
    nodeData.onTextAction?.(id, action);
  };

  const handleInlineContentChange = (value: string) => {
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

  const startLineDraw = (event: PointerEvent<HTMLDivElement>, sourceHandleId: 'left-source' | 'right-source') => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    nodeData.onStartLineDraw?.(id, rect.left + rect.width / 2, rect.top + rect.height / 2, sourceHandleId);
  };

  const sourceTitles = [
    ...references.textIds.map((nodeId) => {
      const source = allNodes.find((node) => node.id === nodeId);
      return `已引用文本：${String(source?.data?.label || '文本节点')}`;
    }),
    ...references.imageIds.map((nodeId) => {
      const source = allNodes.find((node) => node.id === nodeId);
      return `已引用图片：${String(source?.data?.label || '图片节点')}`;
    }),
  ];

  return (
    <div style={{ width: TEXT_NODE_WIDTH }}>
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
            width: TEXT_NODE_WIDTH * zoom,
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

      <div className="relative overflow-visible">
        <div
          ref={previewCardRef}
          className="node-preview-card relative rounded-xl transition-all"
          style={{
            width: TEXT_NODE_WIDTH,
            minHeight: TEXT_NODE_MIN_HEIGHT,
            maxHeight: TEXT_NODE_MAX_HEIGHT,
            height: isInlineEditing ? inlineEditorHeight : undefined,
            background: '#252526',
            border: `2.5px solid ${selected ? '#2f6bff' : 'rgba(42,42,53,0.98)'}`,
            boxShadow: 'none',
          }}
        >
          {!content && !isInlineEditing && sourceTitles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-1 pt-4">
              {sourceTitles.map((item) => (
                <span
                  key={item}
                  className="max-w-full truncate rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1 text-[11px] text-white/44"
                >
                  {item}
                </span>
              ))}
            </div>
          )}

          {isInlineEditing ? (
            <textarea
              ref={inlineTextareaRef}
              autoFocus
              value={inlineContent}
              placeholder="输入文本内容..."
              onChange={(event) => handleInlineContentChange(event.target.value)}
              onBlur={() => setIsInlineEditing(false)}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={handleInlineEditorKeyDown}
              onWheel={(event) => event.stopPropagation()}
              className="nodrag nowheel block h-full min-h-0 w-full resize-none bg-transparent px-4 py-4 text-[13px] leading-6 text-white/72 outline-none placeholder:text-white/24"
              aria-label="编写文本内容"
            />
          ) : content ? (
            <div
              className="select-none overflow-y-auto whitespace-pre-wrap px-4 py-4 text-[13px] leading-6 text-white/68"
              style={{ maxHeight: TEXT_NODE_MAX_HEIGHT }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                startInlineEditing();
              }}
            >
              {content}
            </div>
          ) : (
            <div
              className="flex min-h-[300px] flex-col items-center justify-center px-6 py-6"
              onDoubleClick={(event) => {
                if ((event.target as HTMLElement).closest('button')) return;
                event.stopPropagation();
                startInlineEditing();
              }}
            >
              <svg width="48" height="36" viewBox="0 0 48 36" fill="none" className="-mt-3 mb-7">
                <rect x="4" y="2" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
                <rect x="4" y="11" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />
                <rect x="4" y="20" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.12)" />
                <rect x="4" y="29" width="24" height="3" rx="1.5" fill="rgba(255,255,255,0.09)" />
              </svg>
              <div className="mb-1 w-full px-2 text-[11px] text-white/18">尝试：</div>
              <div className="w-full space-y-0.5">
                {EMPTY_ACTIONS.map(({ action, label, icon: Icon }) => (
                  <button
                    key={action}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      triggerAction(action);
                    }}
                    className="nodrag flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[12px] text-white/30 transition-colors hover:bg-white/[0.035] hover:text-white/50"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-white/15" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="image-node-handle input-port"
          data-port-type="input"
          data-data-type="text"
          data-source-handle="left-source"
          onPointerDown={(event) => startLineDraw(event, 'left-source')}
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
        <div
          className="image-node-handle output-port"
          data-port-type="output"
          data-data-type="text"
          data-source-handle="right-source"
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

        <Handle
          type="target"
          position={Position.Left}
          id="left-target"
          style={{ opacity: 0, width: 28, height: 28, left: 0, top: '50%', zIndex: 9, pointerEvents: 'none' }}
        />
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
      </div>
    </div>
  );
}
