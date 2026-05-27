import { useState } from 'react';

export interface SunSkyNodePreviewProps {
  imagePath: string;
}

export function SunSkyNodePreview({ imagePath }: SunSkyNodePreviewProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg"
        style={{ height: 220, background: '#1a1d24' }}
      >
        <span className="text-xs text-[#6a6a7a]">预览图占位</span>
        <span className="mt-1 text-[10px] text-[#4a4a5a]">{imagePath.split('/').pop()}</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ height: 220 }}>
      <img
        src={imagePath}
        alt="Sun & Sky Preview"
        className="h-full w-full object-cover"
        onError={() => setError(true)}
        draggable={false}
      />
      <div className="absolute right-2.5 top-2.5 rounded-md bg-[#0d1017]/75 px-2 py-0.5 text-[11px] font-medium text-white/70 backdrop-blur">
        实时预览
      </div>
    </div>
  );
}
