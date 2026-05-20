import { Text } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';
import { useTranslation } from 'react-i18next';
import { NodeShell } from '../components/NodeShell';

export function TextNode({ data, selected }: NodeProps) {
  const { t } = useTranslation();
  return (
    <NodeShell label={t('canvas.nodeLabels.text')} selected={selected}>
      <div className="px-4 py-3">
        <div className="text-xs font-medium text-white mb-1 flex items-center gap-1.5">
          <Text className="w-3.5 h-3.5 text-[#a855f7]" /> {t('canvas.nodeLabels.text')}
        </div>
        <div className="text-[11px] text-[#a0a0b0] leading-relaxed line-clamp-3">
          {(data.text as string) || t('imageNode.promptPlaceholder')}
        </div>
      </div>
    </NodeShell>
  );
}
