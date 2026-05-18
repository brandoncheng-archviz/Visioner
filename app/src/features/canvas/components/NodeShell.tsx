export function NodeShell({ label, selected, children }: { label: string; selected: boolean; children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* Label above card */}
      <div
        className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap pointer-events-none"
        style={{ color: '#a0a0b0' }}
      >
        {label}
      </div>

      {/* Card body */}
      <div
        className="node-preview-card rounded-xl overflow-hidden min-w-[200px] max-w-[260px] transition-all"
        style={{
          background: '#1a1a24',
          border: `1.5px solid ${selected ? '#00d4ff' : 'rgba(255,255,255,0.08)'}`,
          boxShadow: selected ? '0 0 12px rgba(0,212,255,0.3)' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
