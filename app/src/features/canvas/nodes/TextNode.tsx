import { useEffect, useMemo, type PointerEvent } from 'react';
import { FileText, ImagePlus, PenLine, Plus, Type } from 'lucide-react';
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
  { action: 'draft', label: '写提示词草稿', icon: PenLine },
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

  const triggerAction = (action: TextNodeActionType) => {
    nodeData.onTextAction?.(id, action);
  };

  const startLineDraw = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    event.nativeEvent.stopImmediatePropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    nodeData.onStartLineDraw?.(id, rect.left + rect.width / 2, rect.top + rect.height / 2);
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

  const sourceMeta = sourceTitles.slice(0, 2).join(' · ');
  const wordCount = content.trim().length;

  return (
    <div className="relative" style={{ width: TEXT_NODE_WIDTH }}>
      <div
        className="pointer-events-none absolute"
        style={{
          top: -20 * inverseScale,
          left: 0,
          width: TEXT_NODE_WIDTH * zoom,
          color: 'rgba(255,255,255,0.5)',
          fontSize: 11,
          transform: `scale(${inverseScale})`,
          transformOrigin: 'left bottom',
        }}
      >
        <div className="flex items-center gap-1.5 overflow-hidden" style={{ minWidth: 0 }}>
          <Type className="flex-shrink-0" style={{ width: 13, height: 13 }} />
          <span className="truncate">{title}</span>
        </div>
      </div>

      <div
        className="node-preview-card relative overflow-hidden rounded-xl transition-all"
        style={{
          width: TEXT_NODE_WIDTH,
          minHeight: TEXT_NODE_MIN_HEIGHT,
          maxHeight: TEXT_NODE_MAX_HEIGHT,
          background: '#252526',
          border: `1px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.06)'}`,
          boxShadow: selected ? '0 0 12px rgba(0,212,255,0.35), 0 0 40px rgba(0,212,255,0.12)' : 'none',
        }}
      >
        {sourceTitles.length > 0 && (
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

        {content ? (
          <div
            className="nodrag nowheel overflow-y-auto whitespace-pre-wrap px-4 pb-4 pt-3 text-[13px] leading-6 text-white/72"
            style={{ maxHeight: TEXT_NODE_MAX_HEIGHT - 94 }}
            onWheel={(event) => event.stopPropagation()}
          >
            {content}
          </div>
        ) : (
          <div className="flex min-h-[160px] flex-col justify-center px-4 pb-4 pt-3">
            <div className="mb-2 text-[12px] text-white/32">尝试：</div>
            <div className="space-y-1">
              {EMPTY_ACTIONS.map(({ action, label, icon: Icon }) => (
                <button
                  key={action}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    triggerAction(action);
                  }}
                  className="nodrag flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-white/62 transition-colors hover:bg-white/[0.045] hover:text-white/88"
                >
                  <Icon className="h-3.5 w-3.5 text-white/34" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {(content || sourceMeta) && (
          <div
            className="flex items-center justify-between border-t border-white/[0.05] px-4 py-2 text-[11px]"
            style={{ color: 'rgba(255,255,255,0.36)' }}
          >
            <span className="min-w-0 truncate">{sourceMeta || '文本结果'}</span>
            {content && <span className="ml-3 flex-shrink-0">{wordCount} 字</span>}
          </div>
        )}
      </div>

      <div
        className="image-node-handle input-port"
        data-port-type="input"
        data-data-type="text"
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
        }}
      >
        <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>
      <div
        className="image-node-handle output-port"
        data-port-type="output"
        data-data-type="text"
        onPointerDown={startLineDraw}
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
        }}
      >
        <Plus className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white" />
      </div>

      <Handle type="target" position={Position.Left} id="left-target" style={{ opacity: 0, width: 28, height: 28 }} />
      <Handle type="source" position={Position.Right} id="right-source" style={{ opacity: 0, width: 28, height: 28 }} />
    </div>
  );
}
