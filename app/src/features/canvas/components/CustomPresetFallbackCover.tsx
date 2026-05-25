import type { ReactNode } from 'react';
import { WandSparkles } from 'lucide-react';

function getCoverLabel(title: string) {
  const normalized = title.trim();
  if (!normalized) return '自定义';

  const chineseChars = normalized.match(/[\u4e00-\u9fff]/g);
  if (chineseChars?.length) {
    return chineseChars.slice(0, 6).join('');
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).join(' ');
  if (words.length === 1) return words[0].slice(0, 8);

  return normalized.slice(0, 6);
}

const variantStyles = {
  purple: {
    background:
      'radial-gradient(circle at 24% 18%, rgba(167,139,250,0.32), transparent 30%), radial-gradient(circle at 78% 72%, rgba(34,211,238,0.18), transparent 34%), linear-gradient(135deg, #15101f 0%, #0c0b12 52%, #171923 100%)',
    icon: 'rgba(221,214,254,0.9)',
    text: 'rgba(245,243,255,0.78)',
  },
  blue: {
    background:
      'radial-gradient(circle at 20% 26%, rgba(56,189,248,0.28), transparent 32%), radial-gradient(circle at 76% 70%, rgba(129,140,248,0.18), transparent 36%), linear-gradient(135deg, #08131d 0%, #0b0d14 54%, #151826 100%)',
    icon: 'rgba(191,219,254,0.9)',
    text: 'rgba(239,246,255,0.76)',
  },
  gray: {
    background:
      'radial-gradient(circle at 22% 20%, rgba(255,255,255,0.12), transparent 30%), radial-gradient(circle at 78% 76%, rgba(148,163,184,0.16), transparent 34%), linear-gradient(135deg, #15161d 0%, #0c0d12 52%, #1b1d24 100%)',
    icon: 'rgba(226,232,240,0.82)',
    text: 'rgba(241,245,249,0.72)',
  },
};

export function CustomPresetFallbackCover({
  title,
  icon,
  variant = 'purple',
}: {
  title: string;
  icon?: ReactNode;
  variant?: 'purple' | 'blue' | 'gray';
}) {
  const style = variantStyles[variant];

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden" style={{ background: style.background }}>
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, white 0 1px, transparent 1px), radial-gradient(circle at 68% 42%, white 0 1px, transparent 1px), radial-gradient(circle at 38% 76%, white 0 1px, transparent 1px)',
          backgroundSize: '42px 38px',
        }}
      />
      <div className="relative flex flex-col items-center gap-2 px-4 text-center">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)', color: style.icon, border: '1px solid rgba(255,255,255,0.12)' }}
        >
          {icon || <WandSparkles className="h-5 w-5" />}
        </div>
        <div className="max-w-full truncate text-[12px] font-medium leading-5" style={{ color: style.text }}>
          {getCoverLabel(title)}
        </div>
      </div>
    </div>
  );
}
