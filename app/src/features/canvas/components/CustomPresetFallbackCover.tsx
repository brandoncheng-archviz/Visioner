import type { ReactNode } from 'react';
import { WandSparkles } from 'lucide-react';

const variantStyles = {
  purple: {
    background:
      'radial-gradient(circle at 24% 18%, rgba(167,139,250,0.18), transparent 34%), radial-gradient(circle at 78% 72%, rgba(34,211,238,0.10), transparent 38%), linear-gradient(135deg, #15101f 0%, #0c0b12 52%, #171923 100%)',
    icon: 'rgba(221,214,254,0.78)',
  },
  blue: {
    background:
      'radial-gradient(circle at 20% 26%, rgba(56,189,248,0.16), transparent 36%), radial-gradient(circle at 76% 70%, rgba(129,140,248,0.10), transparent 40%), linear-gradient(135deg, #08131d 0%, #0b0d14 54%, #151826 100%)',
    icon: 'rgba(191,219,254,0.76)',
  },
  gray: {
    background:
      'radial-gradient(circle at 22% 20%, rgba(255,255,255,0.07), transparent 34%), radial-gradient(circle at 78% 76%, rgba(148,163,184,0.09), transparent 38%), linear-gradient(135deg, #15161d 0%, #0c0d12 52%, #1b1d24 100%)',
    icon: 'rgba(226,232,240,0.72)',
  },
};

export function CustomPresetFallbackCover({
  icon,
  variant = 'purple',
}: {
  title: string;
  icon?: ReactNode;
  variant?: 'purple' | 'blue' | 'gray';
}) {
  const style = variantStyles[variant];

  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: style.background }}>
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          maskImage: 'radial-gradient(circle at center, black 0%, transparent 72%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 15% 25%, white 0 1px, transparent 1px), radial-gradient(circle at 68% 42%, white 0 1px, transparent 1px), radial-gradient(circle at 38% 76%, white 0 1px, transparent 1px)',
          backgroundSize: '42px 38px',
        }}
      />
      <div
        className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
        style={{ background: 'rgba(167,139,250,0.08)', color: style.icon, border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {icon || <WandSparkles className="h-4 w-4" />}
      </div>
    </div>
  );
}
