import { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export function ImagePreviewModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.88)' }}
      onClick={handleOverlayClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 z-10 flex items-center justify-center rounded-full transition-all hover:scale-105 hover:bg-white/18"
        style={{
          width: 44,
          height: 44,
          color: 'rgba(255,255,255,0.95)',
          background: 'rgba(20,20,26,0.82)',
          border: '1px solid rgba(255,255,255,0.22)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        title="关闭"
      >
        <X className="w-6 h-6" strokeWidth={2.4} />
      </button>

      {/* Image */}
      <img
        src={imageUrl}
        alt=""
        className="object-contain rounded-lg"
        style={{
          maxWidth: 'calc(100vw - 96px)',
          maxHeight: 'calc(100vh - 96px)',
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
