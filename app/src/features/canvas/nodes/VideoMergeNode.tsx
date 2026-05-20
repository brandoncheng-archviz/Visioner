import type { NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';

export function VideoMergeNode({ selected }: NodeProps) {
  const { t } = useTranslation();
  return (
    <NodeShell label={t('canvas.nodeLabels.video-merge')} selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">{t('canvas.nodeLabels.video-merge')}</div>
        <div className="text-[11px] text-[#a0a0b0]">{t('videoMergeNode.description')}</div>
      </div>
    </NodeShell>
  );
}
