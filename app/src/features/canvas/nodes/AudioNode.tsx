import type { NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';

export function AudioNode({ data, selected }: NodeProps) {
  const { t } = useTranslation();
  const label = (data.label as string | undefined) || t('canvas.nodeLabels.audio');
  return (
    <NodeShell label={label} selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">{t('canvas.nodeLabels.audio')}</div>
        <div className="text-[11px] text-[#a0a0b0]">{t('audioNode.description')}</div>
      </div>
    </NodeShell>
  );
}
