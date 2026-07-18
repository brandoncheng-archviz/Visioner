import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Eye, EyeOff, GripVertical, Image, MoreHorizontal, Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImageNodeControllers, PendingStructureChannelFile, StructureChannel, StructureChannelType } from './imageControllers.types';
import {
  STRUCTURE_CHANNEL_TYPES,
  addPendingStructureFiles,
  detectStructureChannelTypeFromFileName,
  getPendingStructureFiles,
  getStructureChannelCount,
  getStructureChannelLabel,
  getStructurePreviewChannel,
  getValidStructureChannels,
  isStructureChannelEnabled,
  mergeDetectedStructureChannelFiles,
  promotePendingFileToStructureChannel,
  replaceStructureChannelImage,
  type DetectedStructureChannelFile,
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
const PENDING_TYPE_MENU_MIN_WIDTH = 112;
const PENDING_TYPE_MENU_HEIGHT = 232;

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

function moveChannel(channels: StructureChannel[], fromId: string, toId: string): StructureChannel[] {
  if (fromId === toId) return channels;
  const fromIndex = channels.findIndex((channel) => channel.id === fromId);
  const toIndex = channels.findIndex((channel) => channel.id === toId);
  if (fromIndex < 0 || toIndex < 0) return channels;
  const nextChannels = [...channels];
  const [movedChannel] = nextChannels.splice(fromIndex, 1);
  if (!movedChannel) return channels;
  nextChannels.splice(toIndex, 0, movedChannel);
  return nextChannels;
}

export function StructureControlPlaceholder({ controllers, disabled = false, onChange }: StructureControlPlaceholderProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const transparentDragImageRef = useRef<HTMLDivElement>(null);
  const channelActionButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingTypeButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const pendingReplaceIdRef = useRef<string | null>(null);
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [pendingTypeMenuFileId, setPendingTypeMenuFileId] = useState<string | null>(null);
  const [pendingTypeMenuPosition, setPendingTypeMenuPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const [pendingReplaceConfirm, setPendingReplaceConfirm] = useState<{ fileId: string; type: StructureChannelType } | null>(null);
  const [draggingChannelId, setDraggingChannelId] = useState<string | null>(null);
  const [draftChannels, setDraftChannels] = useState<StructureChannel[] | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const structure = controllers?.structure;
  const channels = useMemo(() => getValidStructureChannels(structure), [structure]);
  const pendingFiles = useMemo(() => getPendingStructureFiles(structure), [structure]);
  const previewChannel = useMemo(() => getStructurePreviewChannel(structure), [structure]);
  const channelCount = getStructureChannelCount(structure);
  const displayChannels = draftChannels ?? channels;

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
    if (!pendingTypeMenuFileId) return;

    const updateMenuPosition = () => {
      const button = pendingTypeButtonRefs.current.get(pendingTypeMenuFileId);
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const width = Math.max(PENDING_TYPE_MENU_MIN_WIDTH, Math.ceil(rect.width));
      const left = Math.min(
        Math.max(8, rect.right - width),
        Math.max(8, window.innerWidth - width - 8),
      );
      const bottomTop = rect.bottom + CHANNEL_MENU_GAP;
      const top = bottomTop + PENDING_TYPE_MENU_HEIGHT <= window.innerHeight - 8
        ? bottomTop
        : Math.max(8, rect.top - PENDING_TYPE_MENU_HEIGHT - CHANNEL_MENU_GAP);
      setPendingTypeMenuPosition({ left, top, width });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (
        target.closest('[data-pending-structure-type-trigger="true"]') ||
        target.closest('[data-pending-structure-type-menu="true"]')
      ) {
        return;
      }
      setPendingTypeMenuFileId(null);
      setPendingTypeMenuPosition(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPendingTypeMenuFileId(null);
        setPendingTypeMenuPosition(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [pendingTypeMenuFileId]);

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

  const updateStructure = (
    nextChannels: StructureChannel[],
    previewChannelId?: string,
    nextPendingFiles: PendingStructureChannelFile[] = pendingFiles,
  ) => {
    onChange({
      ...controllers,
      structure: {
        ...structure,
        channels: nextChannels,
        previewChannelId,
        pendingFiles: nextPendingFiles,
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

  const handleAddChannelsClick = () => {
    if (disabled) return;
    pendingReplaceIdRef.current = null;
    setImportMessage(null);
    closeChannelMenu();
    window.requestAnimationFrame(openFilePicker);
  };

  const handleReplace = (channelId: string) => {
    if (disabled) return;
    pendingReplaceIdRef.current = channelId;
    setImportMessage(null);
    closeChannelMenu();
    window.requestAnimationFrame(openFilePicker);
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0 || disabled) return;
    const replaceId = pendingReplaceIdRef.current;
    pendingReplaceIdRef.current = null;

    if (replaceId) {
      const file = files.find((candidate) => ACCEPTED_IMAGE_MIME_TYPES.has(candidate.type));
      if (!file) return;
      const loadedFile = await readImageFile(file);
      const nextChannels = replaceStructureChannelImage(channels, replaceId, loadedFile);
      updateStructure(nextChannels, resolveNextPreviewId(nextChannels, structure?.previewChannelId));
      return;
    }

    const detectedFiles: DetectedStructureChannelFile[] = [];
    const unrecognizedFiles: LoadedImageFile[] = [];

    for (const file of files) {
      if (!ACCEPTED_IMAGE_MIME_TYPES.has(file.type)) {
        continue;
      }
      const loadedFile = await readImageFile(file);
      const detectedType = detectStructureChannelTypeFromFileName(file.name);
      if (!detectedType) {
        unrecognizedFiles.push(loadedFile);
        continue;
      }
      detectedFiles.push({ ...loadedFile, type: detectedType });
    }

    const recognizedChannelCount = new Set(detectedFiles.map((file) => file.type)).size;
    const nextChannels = recognizedChannelCount > 0
      ? mergeDetectedStructureChannelFiles(channels, detectedFiles)
      : channels;
    const nextPendingFiles = unrecognizedFiles.length > 0
      ? addPendingStructureFiles(pendingFiles, unrecognizedFiles)
      : pendingFiles;

    if (recognizedChannelCount === 0 && unrecognizedFiles.length === 0) {
      return;
    }

    const nextPreviewId = resolveNextPreviewId(nextChannels, structure?.previewChannelId) ?? nextChannels[0]?.id;
    updateStructure(nextChannels, nextPreviewId, nextPendingFiles);

    if (recognizedChannelCount > 0 && unrecognizedFiles.length > 0) {
      const message = t('imageNode.controllers.structure.importMixedSummary', {
        recognized: recognizedChannelCount,
        pending: unrecognizedFiles.length,
      });
      setImportMessage(message);
      console.warn(message);
      return;
    }

    if (recognizedChannelCount > 0) {
      setImportMessage(t('imageNode.controllers.structure.importRecognizedSummary', { recognized: recognizedChannelCount }));
      return;
    }

    const message = t('imageNode.controllers.structure.importPendingSummary', { pending: unrecognizedFiles.length });
    setImportMessage(message);
    console.warn(message);
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

  const handleChoosePendingFileType = (fileId: string, type: StructureChannelType) => {
    if (disabled) return;
    setPendingTypeMenuFileId(null);
    setPendingTypeMenuPosition(null);
    if (channels.some((channel) => channel.type === type)) {
      setPendingReplaceConfirm({ fileId, type });
      return;
    }

    const promoted = promotePendingFileToStructureChannel(channels, pendingFiles, fileId, type);
    if (!promoted) return;
    updateStructure(
      promoted.channels,
      structure?.previewChannelId ?? promoted.promotedChannelId ?? resolveNextPreviewId(promoted.channels),
      promoted.pendingFiles,
    );
    setImportMessage(null);
  };

  const handleConfirmPendingReplacement = () => {
    if (disabled || !pendingReplaceConfirm) return;
    const promoted = promotePendingFileToStructureChannel(
      channels,
      pendingFiles,
      pendingReplaceConfirm.fileId,
      pendingReplaceConfirm.type,
      { replaceExisting: true },
    );
    if (!promoted) return;
    updateStructure(
      promoted.channels,
      resolveNextPreviewId(promoted.channels, structure?.previewChannelId),
      promoted.pendingFiles,
    );
    setPendingReplaceConfirm(null);
    setImportMessage(null);
  };

  const handleCancelPendingReplacement = () => {
    setPendingReplaceConfirm(null);
  };

  const handleIgnorePendingFile = (fileId: string) => {
    if (disabled) return;
    updateStructure(channels, structure?.previewChannelId, pendingFiles.filter((file) => file.id !== fileId));
    if (pendingReplaceConfirm?.fileId === fileId) setPendingReplaceConfirm(null);
    if (pendingTypeMenuFileId === fileId) {
      setPendingTypeMenuFileId(null);
      setPendingTypeMenuPosition(null);
    }
  };

  const stopMenuEvent = (event: MouseEvent) => {
    event.stopPropagation();
  };

  const preventNativeDrag = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, channelId: string) => {
    if (disabled) return;
    event.stopPropagation();
    if (transparentDragImageRef.current) {
      event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0);
    }
    setDraggingChannelId(channelId);
    setDraftChannels(channels);
    closeChannelMenu();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', channelId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>, targetChannelId: string) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    const sourceChannelId = draggingChannelId;
    if (!sourceChannelId || sourceChannelId === targetChannelId) return;
    setDraftChannels((currentChannels) => moveChannel(currentChannels ?? channels, sourceChannelId, targetChannelId));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetChannelId: string) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceChannelId = event.dataTransfer.getData('text/plain') || draggingChannelId;
    if (!sourceChannelId) return;
    const nextChannels = draftChannels ?? moveChannel(channels, sourceChannelId, targetChannelId);
    updateStructure(nextChannels, structure?.previewChannelId);
    setDraggingChannelId(null);
    setDraftChannels(null);
  };

  const handleDragEnd = () => {
    setDraggingChannelId(null);
    setDraftChannels(null);
  };

  const setChannelActionButtonRef = (channelId: string) => (button: HTMLButtonElement | null) => {
    if (button) {
      channelActionButtonRefs.current.set(channelId, button);
    } else {
      channelActionButtonRefs.current.delete(channelId);
    }
  };

  const setPendingTypeButtonRef = (fileId: string) => (button: HTMLButtonElement | null) => {
    if (button) {
      pendingTypeButtonRefs.current.set(fileId, button);
    } else {
      pendingTypeButtonRefs.current.delete(fileId);
    }
  };

  const activeMenuChannel = channels.find((channel) => channel.id === menuChannelId);
  const activePendingTypeFile = pendingFiles.find((file) => file.id === pendingTypeMenuFileId);
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
  const pendingTypeMenuPortal = activePendingTypeFile && pendingTypeMenuPosition
    ? createPortal(
        <div
          data-pending-structure-type-menu="true"
          className="nodrag nopan nowheel fixed z-[145] overflow-hidden rounded-lg border border-white/[0.08] bg-[#252525] py-1 shadow-[0_12px_26px_rgba(0,0,0,0.38)]"
          style={{
            left: pendingTypeMenuPosition.left,
            top: pendingTypeMenuPosition.top,
            width: pendingTypeMenuPosition.width,
          }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {STRUCTURE_CHANNEL_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="block h-8 w-full px-3 text-left text-[12px] text-white/72 transition-colors hover:bg-white/[0.07]"
              onClick={() => handleChoosePendingFileType(activePendingTypeFile.id, type)}
            >
              {t(`imageNode.controllers.structure.channels.${type}`, { defaultValue: getStructureChannelLabel(type) })}
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="nodrag nopan nowheel flex h-[336px] gap-3 p-3" onWheel={(event) => event.stopPropagation()}>
      <div
        ref={transparentDragImageRef}
        className="pointer-events-none fixed h-px w-px opacity-0"
        style={{ left: -1000, top: -1000 }}
      />
      {channelMenuPortal}
      {pendingTypeMenuPortal}
      <input ref={fileInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES} multiple className="hidden" onChange={handleFileChange} />

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
          {displayChannels.map((channel) => {
            const isPreviewed = channel.id === previewChannel?.id;
            const isEnabled = isStructureChannelEnabled(channel);
            const isDragging = channel.id === draggingChannelId;
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
                onDragOver={(event) => handleDragOver(event, channel.id)}
                onDragEnter={(event) => handleDragOver(event, channel.id)}
                onDrop={(event) => handleDrop(event, channel.id)}
                onDragEnd={handleDragEnd}
                draggable={false}
                className="group relative mb-1 flex h-12 items-center gap-2 rounded-lg border px-2 transition-all duration-150"
                style={{
                  background: isPreviewed ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.025)',
                  borderColor: isDragging ? 'rgba(255,255,255,0.18)' : isPreviewed ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                  opacity: isDragging ? 0.34 : isEnabled ? 1 : 0.52,
                  cursor: disabled ? 'default' : 'pointer',
                }}
              >
                <button
                  type="button"
                  disabled={disabled}
                  draggable={!disabled}
                  onClick={stopMenuEvent}
                  onMouseDown={stopMenuEvent}
                  onPointerDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => handleDragStart(event, channel.id)}
                  onDragEnd={handleDragEnd}
                  className="flex h-8 w-5 flex-shrink-0 items-center justify-center rounded text-white/28 transition-colors hover:bg-white/[0.05] hover:text-white/48"
                  style={{ cursor: disabled ? 'default' : isDragging ? 'grabbing' : 'grab' }}
                  title={t('imageNode.controllers.structure.dragHandle')}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <img
                  src={channel.imageUrl}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded object-cover transition-opacity"
                  style={{ opacity: isEnabled ? 1 : 0.58 }}
                  draggable={false}
                  onDragStart={preventNativeDrag}
                />
                <span
                  className="min-w-0 flex-1 truncate text-[13px] font-medium text-white/78"
                  draggable={false}
                  onDragStart={preventNativeDrag}
                >
                  {channel.name}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  draggable={false}
                  onDragStart={preventNativeDrag}
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
                  draggable={false}
                  onDragStart={preventNativeDrag}
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
          {pendingFiles.length > 0 && (
            <div className="mt-3 border-t border-white/[0.06] pt-3">
              <div className="px-1">
                <div className="text-[13px] font-medium text-white/72">
                  {t('imageNode.controllers.structure.pendingListTitleWithCount', { count: pendingFiles.length })}
                </div>
                <div className="mt-0.5 text-[11px] leading-4 text-white/36">
                  {t('imageNode.controllers.structure.pendingListDescription')}
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {pendingFiles.map((file) => {
                  const replacementType = pendingReplaceConfirm?.fileId === file.id ? pendingReplaceConfirm.type : null;
                  return (
                    <div
                      key={file.id}
                      className="relative rounded-lg border border-white/[0.045] bg-white/[0.02] px-2 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={file.imageUrl}
                          alt=""
                          className="h-8 w-8 flex-shrink-0 rounded object-cover"
                          draggable={false}
                          onDragStart={preventNativeDrag}
                        />
                        <span
                          className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/66"
                          title={file.fileName}
                          draggable={false}
                          onDragStart={preventNativeDrag}
                        >
                          {file.fileName}
                        </span>
                        <div className="relative flex-shrink-0">
                          <button
                            ref={setPendingTypeButtonRef(file.id)}
                            data-pending-structure-type-trigger="true"
                            type="button"
                            disabled={disabled}
                            draggable={false}
                            onDragStart={preventNativeDrag}
                            onClick={(event) => {
                              stopMenuEvent(event);
                              setPendingReplaceConfirm(null);
                              setPendingTypeMenuFileId((current) => (current === file.id ? null : file.id));
                              setPendingTypeMenuPosition(null);
                            }}
                            className="flex h-7 items-center gap-1 rounded-md border border-white/[0.07] px-2 text-[12px] text-white/62 transition-colors hover:bg-white/[0.06] hover:text-white/78"
                          >
                            <span>{t('imageNode.controllers.structure.chooseType')}</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          draggable={false}
                          onDragStart={preventNativeDrag}
                          onClick={(event) => {
                            stopMenuEvent(event);
                            handleIgnorePendingFile(file.id);
                          }}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-white/36 transition-colors hover:bg-white/[0.07] hover:text-white/72"
                          title={t('imageNode.controllers.structure.ignorePendingFile')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {replacementType && (
                        <div className="mt-2 rounded-md border border-white/[0.06] bg-black/[0.14] px-2 py-2">
                          <div className="text-[11px] leading-4 text-white/52">
                            {t('imageNode.controllers.structure.replaceExistingConfirm', {
                              channel: getStructureChannelLabel(replacementType),
                            })}
                          </div>
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={handleCancelPendingReplacement}
                              className="h-7 rounded-md px-2 text-[12px] text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/74"
                            >
                              {t('imageNode.controllers.structure.cancelReplace')}
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmPendingReplacement}
                              className="h-7 rounded-md border border-white/[0.12] bg-white/[0.08] px-2 text-[12px] text-white/76 transition-colors hover:bg-white/[0.12]"
                            >
                              {t('imageNode.controllers.structure.confirmReplace')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative border-t border-white/[0.06] p-2">
          <button
            type="button"
            disabled={disabled}
            onClick={handleAddChannelsClick}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border text-[13px] font-medium transition-colors hover:bg-white/[0.07]"
            style={{
              borderColor: 'rgba(255,255,255,0.08)',
              color: disabled ? 'rgba(255,255,255,0.32)' : 'rgba(255,255,255,0.72)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus className="h-4 w-4" />
            {t('imageNode.controllers.structure.addChannel')}
          </button>
          {importMessage && (
            <div className="mt-1 px-1 text-[11px] leading-4 text-white/36">{importMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
