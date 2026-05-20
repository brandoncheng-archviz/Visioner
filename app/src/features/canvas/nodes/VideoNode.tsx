import { Play } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';

export function VideoNode({ data, selected }: NodeProps) {
  const { t } = useTranslation();
  return (
    <NodeShell label={t('canvas.nodeLabels.video')} selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
          <Play className="w-3.5 h-3.5 text-[#22d3ee]" /> {t('canvas.nodeLabels.video')}
        </div>
        <div className="text-[11px] text-[#a0a0b0]">{(data.duration as string) || '5s'} · {(data.fps as number) || 30}fps</div>
      </div>
    </NodeShell>
  );
}
