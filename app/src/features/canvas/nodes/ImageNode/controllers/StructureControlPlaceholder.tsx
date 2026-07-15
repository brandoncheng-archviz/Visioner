import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff, Image, MoreHorizontal, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImageNodeControllers, StructureChannel, StructureChannelType } from './imageControllers.types';
import {
  STRUCTURE_CHANNEL_TYPES,
  createStructureChannelId,
  getStructureChannelCount,
  getStructureChannelLabel,
  getStructurePreviewChannel,
  getValidStructureChannels,
  isStructureChannelEnabled,
} from './imageControllersUtils';

interface StructureControlPlaceholderProps {
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  onChange: (controllers: ImageNodeControllers) => void;
}

interface LoadedImageFile {
  imageUrl: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
}

const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/webp';
const ACCEPTED_IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const CHANNEL_MENU_WIDTH = 112;
const CHANNEL_MENU_GAP = 6;

function readImageFile(file: File): Promise<LoadedImageFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const imageUrl = String(reader.result || '');
      if (!imageUrl) {
        reject(new Error('Empty image file'));
        return;
      }

      const image = new window.Image();
      image.onload = () => {
        resolve({
          imageUrl,
          fileName: file.name,
          mimeType: file.type,
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      };
      image.onerror = () => {
        resolve({
          imageUrl,
          fileName: file.name,
          mimeType: file.type,
        });
      };
      image.src = imageUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function StructureControlPlaceholder({ controllers, disabled = false, onChange }: StructureControlPlaceholderProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelActionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingAddTypeRef = useRef<StructureChannelType | null>(null);
  const pendingReplaceIdRef = useRef<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);

  const structure = controllers?.structure;
  const channels = useMemo(() => getValidStructureChannels(structure), [structure]);
  const previewChannel = useMemo(() => getStructurePreviewChannel(structure), [structure]);
  const existingTypes = useMemo(() => new Set(channels.map((channel) => channel.type)), [channels]);
  const availableTypes = STRUCTURE_CHANNEL_TYPES.filter((type) => !existingTypes.has(type));
  const channelCount = getStructureChannelCount(structure);

  const closeChannelMenu = () => {
    setMenuChannelId(null);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (!menuChannelId) return;

    const updateMenuPosition = () => {
      const button = channelActionButtonRefs.current.get(menuChannelId);
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - CHANNEL_MENU_WIDTH),
        Math.max(8, window.innerWidth - CHANNEL_MENU_WIDTH - 8),
      );
      const top = Math.min(rect.bottom + CHANNEL_MENU_GAP, window.innerHeight - 76);
      setMenuPosition({ left, top });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [menuChannelId]);

  useEffect(() => {
    if (!menuChannelId) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const button = channelActionButtonRefs.current.get(menuChannelId);
      const menu = document.querySelector('[data-structure-channel-menu="true"]');
      if (button?.contains(target) || menu?.contains(target)) return;
      closeChannelMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeChannelMenu();
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [menuChannelId]);

  const updateStructure = (nextChannels: StructureChannel[], previewChannelId?: string) => {
    onChange({
      ...controllers,
      structure: {
        ...structure,
        channels: nextChannels,
        previewChannelId,
      },
    });
  };

  const resolveNextPreviewId = (nextChannels: StructureChannel[], preferredId?: string) => {
    const preferred = nextChannels.find((channel) => channel.id === preferredId);
    if (preferred) return preferred.id;
    return nextChannels.find((channel) => channel.type === 'beauty')?.id ?? nextChannels[0]?.id;
  };

  const openFilePicker = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleAddType = (type: StructureChannelType) => {
    if (disabled) return;
    pendingAddTypeRef.current = type;
    pendingReplaceIdRef.current = null;
    setShowAddMenu(false);
    window.requestAnimationFrame(openFilePicker);
  };

  const handleReplace = (channelId: string) => {
    if (disabled) return;
    pendingReplaceIdRef.current = channelId;
    pendingAddTypeRef.current = null;
    closeChannelMenu();
    window.requestAnimationFrame(openFilePicker);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || disabled) return;
    const addType = pendingAddTypeRef.current;
    const replaceId = pendingReplaceIdRef.current;
    pendingAddTypeRef.current = null;
    pendingReplaceIdRef.current = null;

    if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) return;
    const loadedFile = await readImageFile(file);

    if (addType) {
      const nextChannel: StructureChannel = {
        id: createStructureChannelId(),
        type: addType,
        name: getStructureChannelLabel(addType),
        enabled: true,
        ...loadedFile,
      };
      updateStructure([...channels, nextChannel], nextChannel.id);
      return;
    }

    if (replaceId) {
      const nextChannels = channels.map((channel) => (
        channel.id === replaceId
          ? {
              ...channel,
              imageUrl: loadedFile.imageUrl,
              fileName: loadedFile.fileName,
              mimeType: loadedFile.mimeType,
              width: loadedFile.width,
              height: loadedFile.height,
            }
          : channel
      ));
      updateStructure(nextChannels, resolveNextPreviewId(nextChannels, structure?.previewChannelId));
    }
  };

  const handlePreview = (channelId: string) => {
    if (disabled) return;
    closeChannelMenu();
    updateStructure(channels, channelId);
  };

  const handleToggleChannelEnabled = (channelId: string) => {
    if (disabled) return;
    const nextChannels = channels.map((channel) => (
      channel.id === channelId
        ? { ...channel, enabled: !isStructureChannelEnabled(channel) }
        : channel
    ));
    updateStructure(nextChannels, structure?.previewChannelId);
  };

  const handleRemove = (channelId: string) => {
    if (disabled) return;
    const nextChannels = channels.filter((channel) => channel.id !== channelId);
    updateStructure(nextChannels, resolveNextPreviewId(nextChannels, structure?.previewChannelId === channelId ? undefined : structure?.previewChannelId));
    closeChannelMenu();
  };

  const stopMenuEvent = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const setChannelActionButtonRef = (channelId: string) => (button: HTMLButtonElement | null) => {
    if (button) {
      channelActionButtonRefs.current.set(channelId, button);
    } else {
      channelActionButtonRefs.current.delete(channelId);
    }
  };

  const activeMenuChannel = channels.find((channel) => channel.id === menuChannelId);
  const channelMenuPortal = activeMenuChannel && menuPosition
    ? createPortal(
        <div
          data-structure-channel-menu="true"
          className="nodrag nopan nowheel fixed z-[140] w-28 overflow-hidden rounded-lg border border-white/[0.08] bg-[#252525] py-1 shadow-[0_12px_26px_rgba(0,0,0,0.38)]"
          style={{ left: menuPosition.left, top: menuPosition.top }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="block h-8 w-full px-3 text-left text-[12px] text-white/72 transition-colors hover:bg-white/[0.07]"
            onClick={() => handleReplace(activeMenuChannel.id)}
          >
            {t('imageNode.controllers.structure.replaceImage')}
          </button>
          <button
            type="button"
            className="block h-8 w-full px-3 text-left text-[12px] text-white/72 transition-colors hover:bg-white/[0.07]"
            onClick={() => handleRemove(activeMenuChannel.id)}
          >
            {t('imageNode.controllers.structure.removeChannel')}
          </button>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="nodrag nopan nowheel flex h-[336px] gap-3 p-3" onWheel={(event) => event.stopPropagation()}>
      {channelMenuPortal}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={handleFileChange} />

      <div className="flex min-w-0 flex-[3] flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-black/[0.16]">
        <div className="flex min-h-0 flex-1 items-center justify-center p-3">
          {previewChannel ? (
            <img src={previewChannel.imageUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
          ) : (
            <div className="flex max-w-[260px] flex-col items-center text-center">
              <Image className="h-8 w-8 text-white/28" />
              <div className="mt-3 text-[14px] font-medium text-white/70">{t('imageNode.controllers.structure.emptyTitle')}</div>
              <div className="mt-1 text-[12px] leading-5 text-white/38">{t('imageNode.controllers.structure.emptyDescription')}</div>
            </div>
          )}
        </div>
        <div className="border-t border-white/[0.06] px-3 py-2 text-[12px] text-white/42">
          {previewChannel
            ? t('imageNode.controllers.structure.currentPreview', { channel: previewChannel.name })
            : t('imageNode.controllers.structure.noPreview')}
        </div>
      </div>

      <div className="flex min-w-0 flex-[2] flex-col overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.025]">
        <div className="flex h-10 items-center justify-between border-b border-white/[0.06] px-3">
          <div className="text-[13px] font-medium text-white/78">
            {channelCount > 0
              ? t('imageNode.controllers.structure.channelListTitleWithCount', { count: channelCount })
              : t('imageNode.controllers.structure.channelListTitle')}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2" onWheel={(event) => event.stopPropagation()}>
          {channels.map((channel) => {
            const isPreviewed = channel.id === previewChannel?.id;
            const isEnabled = isStructureChannelEnabled(channel);
            return (
              <div
                key={channel.id}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={() => handlePreview(channel.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handlePreview(channel.id);
                  }
                }}
                className="group relative mb-1 flex h-12 items-center gap-2 rounded-lg border px-2 transition-all duration-150"
                style={{
                  background: isPreviewed ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
                  borderColor: isPreviewed ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                  opacity: isEnabled ? 1 : 0.52,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                <img
                  src={channel.imageUrl}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded object-cover transition-opacity"
                  style={{ opacity: isEnabled ? 1 : 0.58 }}
                  draggable={false}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/78">{channel.name}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(event) => {
                    stopMenuEvent(event);
                    handleToggleChannelEnabled(channel.id);
                  }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/[0.07]"
                  style={{ color: isEnabled ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.32)' }}
                  title={isEnabled ? t('imageNode.controllers.structure.disableChannel') : t('imageNode.controllers.structure.enableChannel')}
                >
                  {isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  ref={setChannelActionButtonRef(channel.id)}
                  type="button"
                  disabled={disabled}
                  onClick={(event) => {
                    stopMenuEvent(event);
                    setMenuChannelId((current) => (current === channel.id ? null : channel.id));
                  }}
                  className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-white/44 transition-colors hover:bg-white/[0.07] hover:text-white/76"
                  title={t('imageNode.controllers.structure.channelActions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative border-t border-white/[0.06] p-2">
          <button
            type="button"
            disabled={disabled || availableTypes.length === 0}
            onClick={() => setShowAddMenu((value) => !value)}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white/[0.07]"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              color: disabled || availableTypes.length === 0 ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.72)',
              cursor: disabled || availableTypes.length === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus className="h-4 w-4" />
            {t('imageNode.controllers.structure.addChannel')}
          </button>
          {showAddMenu && availableTypes.length > 0 && (
            <div className="absolute bottom-12 left-2 right-2 z-20 overflow-hidden rounded-lg border border-white/[0.08] bg-[#252525] py-1 shadow-[0_12px_26px_rgba(0,0,0,0.38)]">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  className="block h-8 w-full px-3 text-left text-[13px] text-white/76 transition-colors hover:bg-white/[0.07]"
                  onClick={() => handleAddType(type)}
                >
                  {t(`imageNode.controllers.structure.channels.${type}`, { defaultValue: getStructureChannelLabel(type) })}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
