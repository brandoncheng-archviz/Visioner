import { Text } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';

export function TextNode({ data, selected }: NodeProps) {
  return (
    <NodeShell label="文本节点" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
          <Text className="w-3.5 h-3.5 text-[#a855f7]" /> 文本节点
        </div>
        <div className="text-[11px] text-[#a0a0b0] leading-relaxed line-clamp-3">
          {(data.text as string) || '在此输入你的设计描述，或从左侧添加节点开始创作...'}
        </div>
      </div>
    </NodeShell>
  );
}
