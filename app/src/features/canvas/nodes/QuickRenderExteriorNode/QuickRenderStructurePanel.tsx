import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type {
  QuickRenderExteriorNodeData,
  QuickRenderPendingStructureFile,
  QuickRenderStructureChannel,
  QuickRenderStructureChannelType,
} from './quickRenderExterior.types';
import {
  QUICK_RENDER_STRUCTURE_CHANNELS,
  QUICK_RENDER_STRUCTURE_TYPES,
  createPendingQuickRenderStructureFile,
  createQuickRenderStructureChannel,
  detectQuickRenderStructureChannelType,
  mergeQuickRenderDetectedChannels,
  readImageFileAsDataUrl,
} from './quickRenderExteriorUtils';
import { QuickRenderStructureChannelRow } from './QuickRenderStructureChannelRow';

type QuickRenderStructurePanelProps = {
  data: QuickRenderExteriorNodeData;
  onChange: (patch: Partial<QuickRenderExteriorNodeData>) => void;
};

type MenuState = {
  pendingId: string;
  left: number;
  top: number;
  width: number;
};

type ConfirmState = {
  pendingFile: QuickRenderPendingStructureFile;
  type: QuickRenderStructureChannelType;
};

const MENU_HEIGHT = 292;
const STRUCTURE_SWITCH_CLASS = "data-[state=checked]:bg-[#2f6bff] data-[state=unchecked]:bg-white/[0.10] hover:data-[state=checked]:brightness-110 hover:data-[state=unchecked]:bg-white/[0.14]";

export function QuickRenderStructurePanel({ data, onChange }: QuickRenderStructurePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const structure = data.structure || {};
  const channels = useMemo(() => structure.channels || [], [structure.channels]);
  const pendingFiles = structure.pendingFiles || [];

  const updateStructure = (next: { channels?: QuickRenderStructureChannel[]; pendingFiles?: QuickRenderPendingStructureFile[] }) => {
    onChange({
      structure: {
        channels,
        pendingFiles,
        ...structure,
        ...next,
      },
    });
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const detected: Array<{ type: QuickRenderStructureChannelType; imageUrl: string; fileName: string; mimeType?: string }> = [];
    const pending: QuickRenderPendingStructureFile[] = [];
    for (const file of Array.from(files)) {
      const imageUrl = await readImageFileAsDataUrl(file);
      const type = detectQuickRenderStructureChannelType(file.name);
      if (type) {
        detected.push({ type, imageUrl, fileName: file.name, mimeType: file.type });
      } else {
        pending.push(createPendingQuickRenderStructureFile(imageUrl, file.name, file.type));
      }
    }
    updateStructure({
      channels: mergeQuickRenderDetectedChannels(channels, detected),
      pendingFiles: [...pendingFiles, ...pending],
    });
    if (pending.length > 0) {
      console.warn(`已识别 ${detected.length} 个通道，${pending.length} 个文件未识别`);
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const promotePending = (pendingFile: QuickRenderPendingStructureFile, type: QuickRenderStructureChannelType, replaceExisting: boolean) => {
    const existing = channels.find((channel) => channel.type === type);
    if (existing && !replaceExisting) {
      setConfirm({ pendingFile, type });
      return;
    }
    const nextChannels = existing
      ? channels.map((channel) => channel.type === type
        ? { ...channel, imageUrl: pendingFile.imageUrl, fileName: pendingFile.fileName, mimeType: pendingFile.mimeType }
        : channel)
      : [...channels, createQuickRenderStructureChannel(type, pendingFile.imageUrl, pendingFile.fileName, pendingFile.mimeType)];
    updateStructure({
      channels: nextChannels,
      pendingFiles: pendingFiles.filter((file) => file.id !== pendingFile.id),
    });
    setMenu(null);
    setConfirm(null);
  };

  const openMenu = (event: React.MouseEvent<HTMLButtonElement>, pendingId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const shouldFlip = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight;
    setMenu({
      pendingId,
      left: rect.left,
      top: shouldFlip ? rect.top - MENU_HEIGHT - 6 : rect.bottom + 6,
      width: Math.max(148, rect.width),
    });
  };

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  const menuPendingFile = menu ? pendingFiles.find((file) => file.id === menu.pendingId) : null;

  return (
    <section className="rounded-[12px] border border-white/[0.08] bg-white/[0.025]">
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[13px] font-medium text-white/82">结构控制</span>
        <Switch
          checked={data.structureEnabled === true}
          onCheckedChange={(checked) => onChange({ structureEnabled: checked })}
          className={STRUCTURE_SWITCH_CLASS}
        />
      </div>
      {data.structureEnabled && (
        <div className="space-y-2 border-t border-white/[0.06] p-3">
          {channels.length > 0 ? (
            <div className="quick-render-node-scrollbar max-h-[210px] space-y-2 overflow-y-auto pr-1">
              {channels.map((channel) => (
                <QuickRenderStructureChannelRow
                  key={channel.id}
                  channel={channel}
                  onToggle={() => updateStructure({ channels: channels.map((item) => item.id === channel.id ? { ...item, enabled: item.enabled === false } : item) })}
                  onWeightChange={(weight) => updateStructure({ channels: channels.map((item) => item.id === channel.id ? { ...item, weight } : item) })}
                  onRemove={() => updateStructure({ channels: channels.filter((item) => item.id !== channel.id) })}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-white/[0.08] px-3 py-3 text-[12px] text-white/36">导入结构通道后显示约束列表</div>
          )}

          {pendingFiles.length > 0 && (
            <div className="space-y-2 rounded-[10px] border border-white/[0.07] p-2">
              <div>
                <div className="text-[12px] font-medium text-white/72">待归类文件 · {pendingFiles.length}</div>
                <div className="text-[11px] text-white/36">请选择通道类型后加入结构约束</div>
              </div>
              {pendingFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-2 rounded-[8px] bg-white/[0.035] p-2">
                  <img src={file.imageUrl} alt={file.fileName} className="h-9 w-9 rounded-[6px] object-cover" draggable={false} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-white/68">{file.fileName}</span>
                  <button type="button" className="nodrag flex h-8 items-center gap-1 rounded-[7px] border border-white/[0.09] px-2 text-[12px] text-white/68 hover:bg-white/[0.06]" onClick={(event) => openMenu(event, file.id)}>
                    选择类型 <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" className="nodrag flex h-8 w-8 items-center justify-center rounded-[7px] text-white/42 hover:bg-white/[0.06]" onClick={() => updateStructure({ pendingFiles: pendingFiles.filter((item) => item.id !== file.id) })}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" className="nodrag flex h-10 w-full items-center justify-center gap-2 rounded-[9px] border border-white/[0.10] text-[13px] text-white/68 hover:bg-white/[0.06]" onClick={() => inputRef.current?.click()}>
            <Plus className="h-4 w-4" />
            添加通道（支持多选导入）
          </button>
          <input ref={inputRef} className="hidden" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => handleUpload(event.target.files)} />
        </div>
      )}

      {menu && menuPendingFile && createPortal(
        <div
          className="fixed z-[120] overflow-hidden rounded-[10px] border border-white/[0.10] bg-[#252526] py-1 shadow-[0_18px_44px_rgba(0,0,0,0.55)]"
          style={{ left: menu.left, top: menu.top, width: menu.width }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {QUICK_RENDER_STRUCTURE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className="block h-10 w-full px-3 text-left text-[13px] text-white/76 hover:bg-white/[0.07]"
              onClick={() => promotePending(menuPendingFile, type, false)}
            >
              {QUICK_RENDER_STRUCTURE_CHANNELS[type].name}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {confirm && createPortal(
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/40" onClick={() => setConfirm(null)}>
          <div className="w-[280px] rounded-[14px] border border-white/[0.10] bg-[#252526] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.58)]" onClick={(event) => event.stopPropagation()}>
            <div className="text-[15px] font-medium text-white/86">{QUICK_RENDER_STRUCTURE_CHANNELS[confirm.type].name} 已存在，是否替换？</div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="h-9 rounded-[8px] px-3 text-[13px] text-white/58 hover:bg-white/[0.06]" onClick={() => setConfirm(null)}>取消</button>
              <button type="button" className="h-9 rounded-[8px] bg-white/88 px-3 text-[13px] font-medium text-black" onClick={() => promotePending(confirm.pendingFile, confirm.type, true)}>替换</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </section>
  );
}
