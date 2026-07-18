import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { QuickRenderExteriorNodeData } from './quickRenderExterior.types';
import { readImageFileAsDataUrl, resolveFollowReferenceOption } from './quickRenderExteriorUtils';

type QuickRenderAtmosphereReferenceProps = {
  data: QuickRenderExteriorNodeData;
  onChange: (patch: Partial<QuickRenderExteriorNodeData>) => void;
};

const ATMOSPHERE_SWITCH_CLASS = "data-[state=checked]:bg-[#8b5cf6] data-[state=unchecked]:bg-white/[0.10] hover:data-[state=checked]:brightness-110 hover:data-[state=unchecked]:bg-white/[0.14]";

export function QuickRenderAtmosphereReference({ data, onChange }: QuickRenderAtmosphereReferenceProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasReference = Boolean(data.atmosphereReference?.imageUrl);
  const openImagePicker = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    fileInputRef.current?.click();
  };
  const handleUpload = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const imageUrl = await readImageFileAsDataUrl(file);
    const atmosphere = data.atmosphere || {};
    onChange({
      atmosphereReferenceEnabled: true,
      atmosphereReference: { sourceType: 'upload', imageUrl, fileName: file.name, mimeType: file.type },
      atmosphere: {
        ...atmosphere,
        time: resolveFollowReferenceOption(atmosphere.time, true),
        weather: resolveFollowReferenceOption(atmosphere.weather, true),
        light: resolveFollowReferenceOption(atmosphere.light, true),
        style: resolveFollowReferenceOption(atmosphere.style, true),
      },
    });
  };
  const clearReference = () => {
    const atmosphere = data.atmosphere || {};
    onChange({
      atmosphereReference: null,
      atmosphere: {
        ...atmosphere,
        time: resolveFollowReferenceOption(atmosphere.time, false),
        weather: resolveFollowReferenceOption(atmosphere.weather, false),
        light: resolveFollowReferenceOption(atmosphere.light, false),
        style: resolveFollowReferenceOption(atmosphere.style, false),
      },
    });
  };

  return (
    <section className="rounded-[12px] border border-white/[0.08] bg-white/[0.025]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/82">氛围参考</span>
        <Switch
          checked={data.atmosphereReferenceEnabled === true}
          className={ATMOSPHERE_SWITCH_CLASS}
          onCheckedChange={(checked) => {
            const atmosphere = data.atmosphere || {};
            const nextHasReference = checked && Boolean(data.atmosphereReference?.imageUrl);
            onChange({
              atmosphereReferenceEnabled: checked,
              atmosphere: {
                ...atmosphere,
                time: resolveFollowReferenceOption(atmosphere.time, nextHasReference),
                weather: resolveFollowReferenceOption(atmosphere.weather, nextHasReference),
                light: resolveFollowReferenceOption(atmosphere.light, nextHasReference),
                style: resolveFollowReferenceOption(atmosphere.style, nextHasReference),
              },
            });
          }}
        />
      </div>
      {data.atmosphereReferenceEnabled && (
        <div className="border-t border-white/[0.06] p-3">
          {hasReference ? (
            <div className="group relative h-16 w-16 overflow-hidden rounded-[9px] border border-white/[0.10]">
              <img src={data.atmosphereReference?.imageUrl} alt="氛围参考" className="h-full w-full object-cover" draggable={false} />
              <button type="button" className="absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white group-hover:flex" onClick={clearReference}>
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="nodrag flex aspect-square w-[76px] flex-col items-center justify-center rounded-[10px] border border-dashed border-white/[0.12] bg-white/[0.025] text-white/58 transition hover:border-white/[0.20] hover:bg-white/[0.045] hover:text-white/78"
              onClick={openImagePicker}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Plus className="mb-1 h-4 w-4" />
              <span className="text-[12px] font-medium">添加图像</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => {
              handleUpload(event.target.files);
              event.currentTarget.value = '';
            }}
          />
        </div>
      )}
    </section>
  );
}
