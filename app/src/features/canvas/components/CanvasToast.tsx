type CanvasToastProps = {
  message: string | null;
};

export function CanvasToast({ message }: CanvasToastProps) {
  if (!message) return null;

  return (
    <div
      className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-xs font-medium animate-in fade-in slide-in-from-top-2"
      style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
    >
      {message}
    </div>
  );
}
