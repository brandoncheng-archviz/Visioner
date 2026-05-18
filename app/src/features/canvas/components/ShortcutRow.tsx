export function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: '#b0b0b8' }}>{label}</span>
      <div className="flex items-center gap-1">
        {keys.map((k) => (
          <span
            key={k}
            className="inline-flex items-center justify-center rounded-md text-[12px] font-medium"
            style={{
              background: '#2a2a35',
              color: '#e0e0e8',
              padding: '3px 8px',
              minWidth: 24,
              height: 24,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
