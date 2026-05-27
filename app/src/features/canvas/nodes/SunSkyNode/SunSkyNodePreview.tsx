import { useEffect, useState } from 'react';

export interface SunSkyNodePreviewProps {
  imagePath: string;
  height?: number;
}

export function SunSkyNodePreview({ imagePath, height = 210 }: SunSkyNodePreviewProps) {
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
  }, [imagePath]);

  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg"
        style={{ height, background: '#1a1d24' }}
      >
        <span className="text-xs text-[#6a6a7a]">预览图占位</span>
        <span className="mt-1 text-[10px] text-[#4a4a5a]">{imagePath.split('/').pop()}</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-[#0f1219]" style={{ height }}>
      <img
        src={imagePath}
        alt="Light & Shadow Preview"
        className="h-full w-full object-cover"
        onError={() => setError(true)}
        draggable={false}
      />
    </div>
  );
}
