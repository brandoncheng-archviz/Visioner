import type { NodeProps } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';

export function ScriptNode({ selected }: NodeProps) {
  return (
    <NodeShell label="脚本节点" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">脚本节点</div>
        <div className="text-[11px] text-[#a0a0b0]">脚本处理</div>
      </div>
    </NodeShell>
  );
}
