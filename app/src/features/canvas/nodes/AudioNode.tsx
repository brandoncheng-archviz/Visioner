import type { NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';

export function AudioNode({ selected }: NodeProps) {
  const { t } = useTranslation();
  return (
    <NodeShell label={t('canvas.nodeLabels.audio')} selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1">{t('canvas.nodeLabels.audio')}</div>
        <div className="text-[11px] text-[#a0a0b0]">{t('audioNode.description')}</div>
      </div>
    </NodeShell>
  );
}
