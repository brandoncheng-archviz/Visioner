import type { NodeProps } from '@xyflow/react';
import { NodeShell } from '../components/NodeShell';

export function VideoMergeNode({ selected }: NodeProps) {
  return (
    <NodeShell label="视频合成" selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">视频合成</div>
        <div className="text-[11px] text-[#a0a0b0]">合成视频</div>
      </div>
    </NodeShell>
  );
}
