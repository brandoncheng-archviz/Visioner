import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type {
  ExteriorRenderNodeData,
  ExteriorRenderRenderChannel,
  ExteriorRenderRenderChannelType,
} from './exteriorRender.types';
import {
  createExteriorRenderRenderChannel,
  readImageFileAsDataUrl,
  sortExteriorRenderRenderChannels,
} from './exteriorRenderUtils';

type ExteriorRenderRenderChannelsPanelProps = {
  data: ExteriorRenderNodeData;
  disabled?: boolean;
  onChange: (patch: Partial<ExteriorRenderNodeData>) => void;
  onSelectFromCanvas: (channelType: ExteriorRenderRenderChannelType) => void;
};

type SlotMenu = {
  channelType: ExteriorRenderRenderChannelType;
  left: number;
  top: number;
  width: number;
};

const FIXED_RENDER_CHANNELS = ['albedo', 'normal', 'ao', 'depth'] as const satisfies readonly ExteriorRenderRenderChannelType[];
const THUMBNAIL_SIZE = 54;
const MENU_WIDTH = 150;

function stopEvent(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
}

function getMenuPosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  return {
    left: Math.min(Math.max(12, rect.left), window.innerWidth - MENU_WIDTH - 12),
    top: rect.bottom + 6,
    width: MENU_WIDTH,
  };
}

export function ExteriorRenderRenderChannelsPanel({ data, disabled = false, onChange, onSelectFromCanvas }: ExteriorRenderRenderChannelsPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const slotRefs = useRef<Partial<Record<ExteriorRenderRenderChannelType, HTMLButtonElement>>>({});
  const uploadTypeRef = useRef<ExteriorRenderRenderChannelType>('albedo');
  const [menu, setMenu] = useState<SlotMenu | null>(null);
  const renderChannels = data.renderChannels || data.structure || {};
  const channels = useMemo(
    () => sortExteriorRenderRenderChannels(renderChannels.channels || []),
    [renderChannels.channels],
  );

  const updateSlot = (channelType: ExteriorRenderRenderChannelType, channel: ExteriorRenderRenderChannel | null) => {
    if (disabled) return;
    const nextChannels = [
      ...channels.filter((item) => item.type !== channelType),
      ...(channel ? [channel] : []),
    ];
    onChange({
      renderChannelsEnabled: nextChannels.length > 0,
      renderChannels: {
        ...renderChannels,
        channels: sortExteriorRenderRenderChannels(nextChannels),
        pendingFiles: [],
      },
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (disabled) return;
    const file = files?.[0];
    if (!file) return;
    const channelType = uploadTypeRef.current;
    const imageUrl = await readImageFileAsDataUrl(file);
    updateSlot(channelType, createExteriorRenderRenderChannel(
      channelType,
      imageUrl,
      file.name,
      file.type,
      'upload',
    ));
    if (inputRef.current) inputRef.current.value = '';
  };

  const openSlotMenu = (event: React.MouseEvent<HTMLButtonElement>, channelType: ExteriorRenderRenderChannelType) => {
    stopEvent(event);
    if (disabled) return;
    setMenu({ channelType, ...getMenuPosition(event.currentTarget) });
  };

  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const activeSlot = slotRefs.current[menu.channelType];
      if (menuRef.current?.contains(target) || activeSlot?.contains(target)) return;
      setMenu(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setMenu(null);
    };
    window.addEventListener('pointerdown', close, true);
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('pointerdown', close, true);
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [menu]);

  return (
    <section className={disabled ? 'pointer-events-none space-y-2 border-t border-white/[0.07] pt-3 opacity-60' : 'space-y-2 border-t border-white/[0.07] pt-3'} aria-disabled={disabled}>
      {!disabled && menu && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="nodrag nopan nowheel fixed z-[2200] overflow-hidden rounded-[10px] border border-white/[0.10] bg-[#222224] p-1 shadow-[0_14px_34px_rgba(0,0,0,0.52)]"
          style={{ left: menu.left, top: menu.top, width: menu.width }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation?.();
          }}
          onWheel={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
            onClick={(event) => {
              stopEvent(event);
              const channelType = menu.channelType;
              setMenu(null);
              onSelectFromCanvas(channelType);
            }}
          >
            {t('exteriorRender.renderChannels.selectFromCanvas')}
          </button>
          <button
            type="button"
            className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
            onClick={(event) => {
              stopEvent(event);
              uploadTypeRef.current = menu.channelType;
              setMenu(null);
              inputRef.current?.click();
            }}
          >
            {t('exteriorRender.renderChannels.upload')}
          </button>
        </div>,
        document.body,
      )}

      <div className="text-[13px] font-medium text-white/82">{t('exteriorRender.sections.renderChannels.title')}</div>

      <div className="flex items-start gap-3">
        {FIXED_RENDER_CHANNELS.map((channelType) => {
          const channel = channels.find((item) => item.type === channelType);
          const channelName = t(`renderChannel.names.${channelType}`);
          const slotActionKey = channel ? 'exteriorRender.renderChannels.replace' : 'exteriorRender.renderChannels.add';
          const slotActionLabel = t(slotActionKey, { channel: channelName });
          return (
            <div key={channelType} className="group/channel relative w-[60px]">
              <button
                ref={(element) => {
                  slotRefs.current[channelType] = element ?? undefined;
                }}
                type="button"
                className={`nodrag nopan relative flex items-center justify-center overflow-hidden rounded-[9px] transition ${channel ? 'border border-white/[0.10] bg-white/[0.04]' : 'border border-dashed border-white/[0.16] bg-white/[0.025] text-white/58 hover:border-white/[0.26] hover:bg-white/[0.045] hover:text-white/82'}`}
                style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
                title={slotActionLabel}
                onClick={(event) => openSlotMenu(event, channelType)}
                onPointerDown={(event) => event.stopPropagation()}
              >
                {channel ? (
                  <img
                    src={channel.imageUrl}
                    alt={channelName}
                    className="h-full w-full object-cover"
                    draggable={false}
                    onDragStart={(event) => event.preventDefault()}
                  />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
              {channel && (
                <button
                  type="button"
                  className="nodrag nopan absolute right-[6px] top-0 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/[0.18] bg-black/75 text-white/78 opacity-0 transition hover:bg-black hover:text-white group-hover/channel:opacity-100"
                  aria-label={t('exteriorRender.renderChannels.remove', { channel: channelName })}
                  title={t('exteriorRender.renderChannels.remove', { channel: channelName })}
                  onPointerDown={stopEvent}
                  onClick={(event) => {
                    stopEvent(event);
                    updateSlot(channelType, null);
                  }}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              )}
              <button
                type="button"
                className="nodrag mt-1 block w-[54px] truncate text-center text-[10px] font-medium text-white/76 transition hover:text-white/92"
                title={slotActionLabel}
                onClick={(event) => openSlotMenu(event, channelType)}
              >
                {channelName}
              </button>
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        disabled={disabled}
        onChange={(event) => handleUpload(event.target.files)}
      />
    </section>
  );
}
