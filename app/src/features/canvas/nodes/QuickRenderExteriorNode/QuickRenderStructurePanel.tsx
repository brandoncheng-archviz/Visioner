import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, X } from 'lucide-react';
import type {
  QuickRenderExteriorNodeData,
  QuickRenderStructureChannel,
  QuickRenderStructureChannelType,
} from './quickRenderExterior.types';
import {
  QUICK_RENDER_STRUCTURE_TYPES,
  createQuickRenderStructureChannel,
  detectQuickRenderStructureChannelType,
  getQuickRenderStructureChannelName,
  readImageFileAsDataUrl,
  sortQuickRenderStructureChannels,
} from './quickRenderExteriorUtils';

type QuickRenderStructurePanelProps = {
  data: QuickRenderExteriorNodeData;
  onChange: (patch: Partial<QuickRenderExteriorNodeData>) => void;
  onSelectFromCanvas: () => void;
};

type FloatingMenu = {
  kind: 'add' | 'type';
  channelId?: string;
  left: number;
  top: number;
  width: number;
};

const THUMBNAIL_SIZE = 54;
const MENU_WIDTH = 150;

function stopEvent(event: React.SyntheticEvent) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation?.();
}

function getMenuPosition(element: HTMLElement, width = MENU_WIDTH) {
  const rect = element.getBoundingClientRect();
  return {
    left: Math.min(Math.max(12, rect.left), window.innerWidth - width - 12),
    top: rect.bottom + 6,
    width,
  };
}

export function QuickRenderStructurePanel({ data, onChange, onSelectFromCanvas }: QuickRenderStructurePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const addButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const typeButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [menu, setMenu] = useState<FloatingMenu | null>(null);
  const structure = data.structure || {};
  const channels = useMemo(
    () => sortQuickRenderStructureChannels(structure.channels || []),
    [structure.channels],
  );

  const updateChannels = (nextChannels: QuickRenderStructureChannel[]) => {
    onChange({
      structureEnabled: nextChannels.length > 0,
      structure: {
        ...structure,
        channels: sortQuickRenderStructureChannels(nextChannels),
        pendingFiles: [],
      },
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const importedChannels = await Promise.all(Array.from(files).map(async (file) => {
      const imageUrl = await readImageFileAsDataUrl(file);
      const type = detectQuickRenderStructureChannelType(file.name) || 'unknown';
      return createQuickRenderStructureChannel(type, imageUrl, file.name, file.type, 'upload');
    }));
    updateChannels([...channels, ...importedChannels]);
    setMenu(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeChannel = (channelId: string) => {
    updateChannels(channels.filter((channel) => channel.id !== channelId));
  };

  const changeChannelType = (channelId: string, type: QuickRenderStructureChannelType) => {
    updateChannels(channels.map((channel) => (
      channel.id === channelId
        ? { ...channel, type, name: getQuickRenderStructureChannelName(type) }
        : channel
    )));
    setMenu(null);
  };

  const openAddMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    stopEvent(event);
    setMenu({ kind: 'add', ...getMenuPosition(event.currentTarget) });
  };

  const openTypeMenu = (event: React.MouseEvent<HTMLButtonElement>, channelId: string) => {
    stopEvent(event);
    setMenu({ kind: 'type', channelId, ...getMenuPosition(event.currentTarget, 132) });
  };

  useEffect(() => {
    if (!menu) return;
    const close = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const activeTypeButton = menu.channelId ? typeButtonRefs.current[menu.channelId] : null;
      if (menuRef.current?.contains(target) || addButtonRef.current?.contains(target) || activeTypeButton?.contains(target)) return;
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
    <section className="space-y-2 border-t border-white/[0.07] pt-3">
      {menu && typeof document !== 'undefined' && createPortal(
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
          {menu.kind === 'add' ? (
            <>
              <button
                type="button"
                className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
                onClick={(event) => {
                  stopEvent(event);
                  setMenu(null);
                  onSelectFromCanvas();
                }}
              >
                从画布选择
              </button>
              <button
                type="button"
                className="flex h-9 w-full items-center rounded-md px-2.5 text-left text-[13px] font-medium text-white/76 transition hover:bg-white/[0.06] hover:text-white/90"
                onClick={(event) => {
                  stopEvent(event);
                  setMenu(null);
                  inputRef.current?.click();
                }}
              >
                上传通道
              </button>
            </>
          ) : (
            QUICK_RENDER_STRUCTURE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="flex h-8 w-full items-center rounded-md px-2.5 text-left text-[12px] font-medium text-white/72 transition hover:bg-white/[0.06] hover:text-white/90"
                onClick={(event) => {
                  stopEvent(event);
                  if (menu.channelId) changeChannelType(menu.channelId, type);
                }}
              >
                {getQuickRenderStructureChannelName(type)}
              </button>
            ))
          )}
        </div>,
        document.body,
      )}

      <div className="flex items-baseline gap-2">
        <div className="text-[13px] font-medium text-white/82">结构通道（多通道）</div>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {channels.map((channel) => (
          <div key={channel.id} className="group/channel w-[60px]">
            <div
              className="relative overflow-hidden rounded-[9px] border border-white/[0.10] bg-white/[0.04]"
              style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
            >
              <img
                src={channel.imageUrl}
                alt={channel.name}
                className="h-full w-full object-cover"
                draggable={false}
                onDragStart={(event) => event.preventDefault()}
              />
              <button
                type="button"
                className="nodrag nopan absolute right-0 top-0 z-20 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-white/[0.18] bg-black/75 text-white/78 opacity-0 transition hover:bg-black hover:text-white group-hover/channel:opacity-100"
                aria-label="移除通道"
                title="移除通道"
                onPointerDown={stopEvent}
                onClick={(event) => {
                  stopEvent(event);
                  removeChannel(channel.id);
                }}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
            <button
              ref={(element) => {
                typeButtonRefs.current[channel.id] = element;
              }}
              type="button"
              className="nodrag mt-1 flex w-[54px] items-center justify-center gap-0.5 text-center text-[10px] font-medium text-white/76 transition hover:text-white/92"
              title={channel.name}
              onClick={(event) => openTypeMenu(event, channel.id)}
            >
              <span className="block min-w-0 flex-1 truncate text-center">{channel.name}</span>
              {channel.type === 'unknown' && <ChevronDown className="h-3 w-3 shrink-0 text-white/36" />}
            </button>
          </div>
        ))}

        <button
          ref={addButtonRef}
          type="button"
          className="nodrag nopan flex flex-col items-center justify-center rounded-[9px] border border-dashed border-white/[0.16] bg-white/[0.025] text-white/58 transition hover:border-white/[0.26] hover:bg-white/[0.045] hover:text-white/82"
          style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
          onClick={openAddMenu}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Plus className="h-4 w-4" />
          <span className="mt-1 text-[10px] font-medium">添加通道</span>
        </button>
      </div>

      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={(event) => handleUpload(event.target.files)}
      />
    </section>
  );
}
