import { useCallback } from 'react';
import { Type } from 'lucide-react';
import { useReactFlow, type NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';
import type { TextNodeData } from '../types/basicNode.types';

export function TextNode({ data, selected, id }: NodeProps) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const nodeData = data as TextNodeData;
  const label = nodeData.label || t('canvas.nodeLabels.text');

  const updateData = useCallback(
    (patch: Partial<TextNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...patch } }
            : node,
        ),
      );
    },
    [id, setNodes],
  );

  return (
    <NodeShell label={label} selected={selected}>
      <div className="w-[240px] px-4 py-3.5">
        <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#a855f7]/10 text-[#c084fc]">
            <Type className="h-3.5 w-3.5" />
          </span>
          <input
            value={label}
            onChange={(event) => updateData({ label: event.target.value })}
            onKeyDown={(event) => event.stopPropagation()}
            className="nodrag nowheel min-w-0 flex-1 bg-transparent text-[13px] font-medium text-white/90 outline-none placeholder:text-white/30"
            aria-label={t('common.rename')}
          />
        </div>
        <textarea
          value={nodeData.text || ''}
          onChange={(event) => updateData({ text: event.target.value })}
          onKeyDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
          placeholder="输入文本、Prompt 草稿或客户反馈..."
          className="nodrag nowheel block h-[104px] w-full resize-none rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2.5 text-[12px] leading-5 text-white/72 outline-none transition placeholder:text-white/28 focus:border-[#a855f7]/40 focus:bg-black/20"
        />
      </div>
    </NodeShell>
  );
}
