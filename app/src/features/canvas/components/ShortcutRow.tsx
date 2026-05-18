export function ShortcutRow({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-4 px-1 py-1">
      <span className="whitespace-nowrap text-[13px] leading-5" style={{ color: '#a0a0a0' }}>{label}</span>
      <div className="flex flex-shrink-0 flex-nowrap items-center justify-end gap-1">
        {keys.map((k, i) => (
          <span
            key={k + i}
            className="inline-flex flex-shrink-0 items-center justify-center rounded text-[12px] font-medium leading-none"
            style={{
              background: '#3a3a3a',
              color: '#e0e0e0',
              padding: '3px 7px',
              height: 22,
              border: '1px solid #4a4a4a',
              whiteSpace: 'nowrap',
            }}
          >
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
