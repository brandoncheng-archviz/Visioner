import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Image,
  X,
  Bookmark,
  Sun,
  Palette,
  ChevronDown,
  ArrowUp,
  Maximize2,
  ScanSearch,
  Zap,
} from 'lucide-react';
import type {
  PromptContent,
  ImageReferencePromptBlock,
  ImageMarkReferencePromptBlock,
  ReferenceInfo,
  PresetItem,
} from '../../types/imageNode.types';
import type { ModelParams } from '../../types/canvas.types';
import type { TextReferenceInfo } from '../../types/basicNode.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import {
  FLOATING_PANEL_BACKGROUND,
  FLOATING_PANEL_BORDER,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  IMAGE_NODE_CONTROL_EXPANDED_HEIGHT,
  MAX_REFERENCE_IMAGES_PER_NODE,
  RECOMMENDED_REFERENCE_IMAGES_PER_NODE,
  MODEL_OPTIONS,
  RESOLUTION_OPTIONS,
  RATIO_OPTIONS,
  COUNT_OPTIONS,
} from '../../constants/canvasConstants';
import { getImageRoleLabel, getImageRoleColor } from '../../constants/imageUsages';
import {
  PRESET_DATA,
  PRESET_TABS,
  getPresetById,
  getStylePresetById,
  isPresetVisibleInLibrary,
} from '../../constants/presets';
import { createImageReferenceBlock, getPresetPromptText, stripReferencePromptMetadata } from '../../utils/promptUtils';
import {
  getReferenceUsageSortRank,
  sortReferencesByUsage,
} from '../../utils/referenceUtils';
import { formatReferenceLimitIssue, getReferenceLimitIssueForGenerate } from '../../utils/referenceLimits';
import { StylePickerModal } from '../../components/StylePickerModal';
import { PresetPickerModal } from '../../components/PresetPickerModal';
import { LightPreviewPanel } from '../../components/LightPreviewPanel';

const GENERATION_CONTROL_BUTTON_CLASS =
  'border-[rgba(148,163,184,0.28)] bg-transparent text-[rgba(203,213,225,0.68)] hover:border-[rgba(148,163,184,0.55)] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#CBD5E1]';
const GENERATION_CONTROL_BUTTON_DISABLED_CLASS =
  'border-[rgba(148,163,184,0.14)] bg-transparent text-[rgba(203,213,225,0.62)]';
const GENERATION_CONTROL_BUTTON_SELECTED_CLASS =
  'border-[#94A3B8] bg-[rgba(148,163,184,0.12)] text-[#E2E8F0] shadow-none';
const GENERATION_CREDIT_COST = 14;
const EMPTY_GENERATION_INTENT_MESSAGE = '请先输入提示词或选择预设 / 风格 / 光影';

function TextReferenceIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="3" y="7.5" width="8.5" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="3" y="11" width="14" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="3" y="14.5" width="8.5" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function sortPromptContentByReferenceUsage(
  content: PromptContent[],
  references: ReferenceInfo[],
) {
  const referenceById = new Map(references.map((reference) => [reference.nodeId, reference]));
  const sortedReferenceIds = sortReferencesByUsage(references).map((reference) => reference.nodeId);
  const sortedReferenceIndex = new Map(sortedReferenceIds.map((nodeId, index) => [nodeId, index]));
  const originalBlockIndex = new Map<string, number>();
  const imageBlocks = content.filter((block, index): block is ImageReferencePromptBlock => {
    if (block.type !== 'image_reference') return false;
    originalBlockIndex.set(block.id, index);
    return true;
  });

  const sortedImageBlocks = [...imageBlocks].sort((a, b) => {
    const aReference = referenceById.get(a.sourceNodeId);
    const bReference = referenceById.get(b.sourceNodeId);
    const aRank = aReference
      ? getReferenceUsageSortRank(aReference)
      : getReferenceUsageSortRank({ role: null, roleLabel: a.usage, localReferenceType: undefined, localReferenceLabel: undefined, customRoleLabel: undefined });
    const bRank = bReference
      ? getReferenceUsageSortRank(bReference)
      : getReferenceUsageSortRank({ role: null, roleLabel: b.usage, localReferenceType: undefined, localReferenceLabel: undefined, customRoleLabel: undefined });
    if (aRank.group !== bRank.group) return aRank.group - bRank.group;
    const aOrder = sortedReferenceIndex.get(a.sourceNodeId);
    const bOrder = sortedReferenceIndex.get(b.sourceNodeId);
    if (aOrder !== undefined && bOrder !== undefined && aOrder !== bOrder) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;
    return (originalBlockIndex.get(a.id) ?? 0) - (originalBlockIndex.get(b.id) ?? 0);
  });

  let imageBlockIndex = 0;
  return content.map((block) => (
    block.type === 'image_reference'
      ? sortedImageBlocks[imageBlockIndex++] ?? block
      : block
  ));
}

export function ImageNodeControlPanel({
  promptText,
  onPromptChange,
  promptContent,
  onPromptContentChange,
  lightPreview,
  onLightPreviewChange,
  selectedPresets,
  onPresetsChange,
  selectedStyleId,
  onStyleChange,
  modelParams,
  onModelParamsChange,
  onGenerate,
  canGenerate,
  canEditPrompt,
  canEditPromptReferences,
  canEditPreset,
  canEditStyle,
  canEditLighting,
  canEditModel,
  canDeleteReference,
  canCreateMarks,
  canEditMarks,
  isGenerating,
  generationTask,
  textReferences,
  onFocusTextReference,
  references,
  onRemoveReference,
  onUseReference,
  onStartMarkMode,
  onUpdateMarkCandidate,
  showToast,
  autoOpenLightPanel,
  onAcknowledgeAutoOpen,
}: {
  promptText: string;
  onPromptChange: (value: string) => void;
  promptContent: PromptContent[];
  onPromptContentChange: (content: PromptContent[]) => void;
  lightPreview?: LightPreviewData | null;
  onLightPreviewChange: (data: LightPreviewData | null) => void;
  selectedPresets: string[];
  onPresetsChange: (presets: string[]) => void;
  selectedStyleId: string | null;
  onStyleChange: (styleId: string | null) => void;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  onGenerate: () => void | Promise<void>;
  canGenerate: boolean;
  canEditPrompt: boolean;
  canEditPromptReferences: boolean;
  canEditPreset: boolean;
  canEditStyle: boolean;
  canEditLighting: boolean;
  canEditModel: boolean;
  canDeleteReference: boolean;
  canCreateMarks: boolean;
  canEditMarks: boolean;
  isGenerating?: boolean;
  generationTask?: { status: string; progress: number; errorMessage: string | null } | null;
  textReferences: TextReferenceInfo[];
  onFocusTextReference: (nodeId: string) => void;
  autoOpenLightPanel?: boolean;
  onAcknowledgeAutoOpen?: () => void;
  references: ReferenceInfo[];
  onRemoveReference: (nodeId: string) => void;
  onUseReference: (reference: ReferenceInfo) => void;
  onStartMarkMode: () => void;
  onUpdateMarkCandidate: (markId: string, candidateId: string) => void;
  showToast?: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const formatGenerationCount = useCallback(
    (count: string) => {
      const countValue = Number.parseInt(count, 10);
      return t(`imageNode.countValue.${countValue}`, {
        count: countValue,
        defaultValue: count,
      });
    },
    [t],
  );
  const [showLightPreview, setShowLightPreview] = useState(false);

  useEffect(() => {
    if (autoOpenLightPanel && canEditLighting) {
      const timer = setTimeout(() => {
        setShowLightPreview(true);
        onAcknowledgeAutoOpen?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoOpenLightPanel, canEditLighting, onAcknowledgeAutoOpen]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [activeMarkCandidateBlockId, setActiveMarkCandidateBlockId] = useState<string | null>(null);
  const [markCandidateMenuPosition, setMarkCandidateMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [highlightedPromptBlockId, setHighlightedPromptBlockId] = useState<string | null>(null);
  const [hoveredPromptBlockId, setHoveredPromptBlockId] = useState<string | null>(null);
  const [editingPromptBlockId, setEditingPromptBlockId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');

  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const [slashActiveTab, setSlashActiveTab] = useState<(typeof PRESET_TABS)[number]>('真实增强');
  const [slashMenuStyle, setSlashMenuStyle] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const markCandidateMenuRef = useRef<HTMLDivElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const promptBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* ─── Reference thumbnails ─── */
  const sortedReferences = useMemo(
    () => sortReferencesByUsage(references),
    [references],
  );

  const handleThumbnailClick = (ref: ReferenceInfo) => {
    if (!canEditPromptReferences) return;
    requestReferenceInsert(ref);
  };

  const renderReferenceThumbnail = (ref: ReferenceInfo) => (
    <div
      key={ref.nodeId}
      role="button"
      tabIndex={0}
      draggable={false}
      onClick={() => handleThumbnailClick(ref)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') handleThumbnailClick(ref);
      }}
      onPointerDown={(event) => event.stopPropagation()}
      className="nodrag nowheel group/ref relative flex-shrink-0 rounded-lg outline-none"
      style={{
        width: 54,
        height: 50,
        transition: 'transform 160ms ease, opacity 120ms ease',
        touchAction: 'none',
        cursor: canEditPromptReferences ? 'pointer' : 'default',
        opacity: canEditPromptReferences ? 1 : 0.72,
      }}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-lg"
        style={{
          background: ref.role === 'undefined_usage' ? 'rgba(156,163,175,0.08)' : 'rgba(255,255,255,0.04)',
          border: canEditPromptReferences
            ? ref.role === 'undefined_usage'
              ? '1px solid rgba(156,163,175,0.20)'
              : `1px solid ${getImageRoleColor(ref.role, ref.localReferenceType)}`
            : '1px solid rgba(255,255,255,0.12)',
        }}
      >
        {ref.imageUrl ? (
          <img src={ref.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Image className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}
        <button
          draggable={false}
          type="button"
          onPointerDownCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClickCapture={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!canDeleteReference) return;
            onRemoveReference(ref.nodeId);
          }}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`nodrag nowheel absolute right-0 top-0 z-30 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black ${canDeleteReference ? 'hidden group-hover/ref:flex' : 'hidden'}`}
          style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
          title={t('imageNode.removeReference')}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );

  const renderTextReference = (reference: TextReferenceInfo, index: number) => {
    const summary = reference.content.trim() || '当前文本节点暂无内容';
    return (
      <div
        key={reference.nodeId}
        role="button"
        tabIndex={0}
        onClick={() => onFocusTextReference(reference.nodeId)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onFocusTextReference(reference.nodeId);
        }}
        className="nodrag nowheel group/text-ref relative h-[50px] w-[54px] flex-shrink-0 cursor-pointer rounded-lg text-left outline-none"
      >
        <div
          className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-[260px] max-w-[320px] -translate-x-1/2 rounded-xl p-3 text-left group-hover/text-ref:block group-focus-visible/text-ref:block"
          style={{
            background: 'rgba(8,8,10,0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 14px 34px rgba(0,0,0,0.58)',
          }}
        >
          <div className="truncate text-[12px] font-medium text-white/78">{reference.title}</div>
          <div className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-[12px] leading-5 text-white/58">
            {summary}
          </div>
        </div>

        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg text-white/38 transition-colors group-hover/text-ref:bg-white/[0.07] group-hover/text-ref:text-white/52 group-focus-visible/text-ref:text-white/58"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <TextReferenceIcon />
          <span
            className="absolute right-0 top-0 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white/72 group-hover/text-ref:hidden"
            style={{ background: 'rgba(0,0,0,0.72)', border: '1px solid rgba(255,255,255,0.16)' }}
          >
            {index + 1}
          </span>
          <button
            type="button"
            onPointerDownCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
            onClickCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!canDeleteReference) return;
              onRemoveReference(reference.nodeId);
            }}
            className={`nodrag nowheel absolute right-0 top-0 z-30 h-[18px] w-[18px] items-center justify-center rounded-full text-white/78 transition-colors hover:bg-black hover:text-white ${canDeleteReference ? 'hidden group-hover/text-ref:flex' : 'hidden'}`}
            style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
            title="断开文本引用"
            aria-label="断开文本引用"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      </div>
    );
  };

  const imageReferenceBlocks = promptContent.filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference');
  const sortedImageReferenceBlocks = useMemo(
    () => sortPromptContentByReferenceUsage(
      promptContent.filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference'),
      references,
    ) as ImageReferencePromptBlock[],
    [promptContent, references],
  );
  const imageMarkReferenceBlocks = promptContent.filter(
    (block): block is ImageMarkReferencePromptBlock => block.type === 'image_mark_reference',
  );
  const activeMarkCandidateBlock = imageMarkReferenceBlocks.find((block) => block.id === activeMarkCandidateBlockId);
  useEffect(() => {
    if (!activeMarkCandidateBlockId) return;
    if (!canEditMarks || !activeMarkCandidateBlock) return;

    const closeMarkCandidateMenu = () => {
      setActiveMarkCandidateBlockId(null);
      setMarkCandidateMenuPosition(null);
    };
    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (markCandidateMenuRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[data-mark-candidate-trigger]')) return;
      closeMarkCandidateMenu();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeMarkCandidateMenu();
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [activeMarkCandidateBlock, activeMarkCandidateBlockId, canEditMarks]);
  const markCandidateMenuPortal = activeMarkCandidateBlock && markCandidateMenuPosition && canEditMarks
    ? createPortal(
        <div
          ref={markCandidateMenuRef}
          className="fixed z-[4200] w-[180px] overflow-hidden rounded-lg border border-white/10 bg-[#252526] p-1 shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          style={{ left: markCandidateMenuPosition.left, top: markCandidateMenuPosition.top }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {activeMarkCandidateBlock.candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="flex h-7 w-full items-center rounded-md px-2 text-left text-[15px] text-white/75 transition-colors hover:bg-white/[0.08]"
              onClick={(event) => {
                event.stopPropagation();
                onUpdateMarkCandidate(activeMarkCandidateBlock.markId, candidate.id);
                setActiveMarkCandidateBlockId(null);
                setMarkCandidateMenuPosition(null);
              }}
            >
              <span className="truncate">{candidate.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  const selectedModel = MODEL_OPTIONS.find((m) => m.name === modelParams.model) || MODEL_OPTIONS[0];
  const selectedStyle = getStylePresetById(selectedStyleId);
  const hasTooManyReferences = sortedReferences.length > MAX_REFERENCE_IMAGES_PER_NODE;
  const hasManyReferences = sortedReferences.length > RECOMMENDED_REFERENCE_IMAGES_PER_NODE;

  const getSlashPresetName = (preset: PresetItem) =>
    t(`preset.${preset.id}.name`, { defaultValue: preset.title || preset.name });

  const getSlashPresetDescription = (preset: PresetItem) =>
    t(`preset.${preset.id}.shortDescription`, {
      defaultValue: preset.shortDescription || preset.description || '',
    });

  const slashFilteredPresets = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    const presetPool = PRESET_DATA.filter((preset) => {
      if (!isPresetVisibleInLibrary(preset) || preset.category === 'style' || preset.tabs.length === 0) return false;
      if (slashActiveTab === '我的收藏') return false;
      return preset.tabs.includes(slashActiveTab);
    });
    if (!query) return presetPool;

    return presetPool.filter(
      (preset) =>
        preset.name.toLowerCase().includes(query) ||
        preset.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        (preset.shortDescription || '').toLowerCase().includes(query),
    );
  }, [slashActiveTab, slashQuery]);

  const handleSlashTabChange = (tab: (typeof PRESET_TABS)[number]) => {
    setSlashActiveTab(tab);
    setSlashIndex(0);
  };

  const updateSlashMenuPosition = useCallback(() => {
    const input = promptInputRef.current;
    if (!input) return;

    const rect = input.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const gap = 8;
    const width = Math.min(720, Math.max(520, Math.min(viewportWidth - margin * 2, rect.width)));
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, viewportWidth - width - margin));
    const spaceBelow = viewportHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openAbove = spaceBelow < 360 && spaceAbove > spaceBelow;
    const availableHeight = openAbove ? spaceAbove - gap : spaceBelow - gap;
    const maxHeight = Math.min(480, Math.max(240, availableHeight));
    const top = openAbove ? Math.max(margin, rect.top - maxHeight - gap) : Math.min(rect.bottom + gap, viewportHeight - maxHeight - margin);

    setSlashMenuStyle({ top, left, width, maxHeight });
  }, []);

  const buildPresetTextBlock = (preset: PresetItem, includeTitle: boolean) => {
    const prompt = getPresetPromptText(preset);
    if (!includeTitle) return prompt;
    return `【${preset.title || preset.name}】\n${prompt}`;
  };

  const appendPresetPromptBlocks = (presetIds: string[], appliedPresets?: PresetItem[]) => {
    if (!canEditPreset || !canEditPrompt) return;
    const appliedPresetMap = new Map((appliedPresets || []).map((preset) => [preset.id, preset]));
    const blocks = presetIds
      .map((presetId) => appliedPresetMap.get(presetId) || getPresetById(presetId))
      .filter((preset): preset is PresetItem => Boolean(preset))
      .map((preset) => buildPresetTextBlock(preset, true))
      .filter(Boolean);
    if (!blocks.length) return;

    const separator = promptText.trim() ? '\n\n' : '';
    onPromptChange(`${promptText}${separator}${blocks.join('\n\n')}`);
  };

  const handlePresetModalApply = (presetIds: string[], appliedPresets?: PresetItem[]) => {
    if (!canEditPreset) return;
    const newlySelectedPresetIds = presetIds.filter((presetId) => !selectedPresets.includes(presetId));
    const idsToInsert = newlySelectedPresetIds.length > 0 ? newlySelectedPresetIds : presetIds;
    appendPresetPromptBlocks(idsToInsert, appliedPresets);
    onPresetsChange(presetIds);
  };

  const handleGenerateClick = () => {
    if (!canGenerate) {
      showToast?.(EMPTY_GENERATION_INTENT_MESSAGE);
      return;
    }

    const limitIssue = getReferenceLimitIssueForGenerate(references);
    if (limitIssue) {
      showToast?.(formatReferenceLimitIssue(limitIssue));
      return;
    }
    void onGenerate();
  };

  const closeReferenceMenus = () => {
    setShowReferenceMenu(false);
  };

  useEffect(() => {
    if (!canEditPromptReferences) return;
    const referencesById = new Map(references.map((reference) => [reference.nodeId, reference]));
    let changed = false;
    const refreshedContent = promptContent.flatMap((block) => {
      if (block.type !== 'image_reference') return block;
      const reference = referencesById.get(block.sourceNodeId);
      if (!reference) {
        changed = true;
        return [];
      }
      const nextBlock = createImageReferenceBlock(reference);
      const currentPromptText = stripReferencePromptMetadata(block.promptText || '');
      const shouldRefreshUsage = block.usage !== nextBlock.usage;
      const shouldRefreshPromptText = !block.promptTextEdited && (shouldRefreshUsage || !currentPromptText);
      const updatedBlock = {
        ...block,
        usage: shouldRefreshUsage ? nextBlock.usage : block.usage,
        thumbnailUrl: nextBlock.thumbnailUrl,
        promptText: shouldRefreshPromptText ? nextBlock.promptText : currentPromptText,
      };
      if (updatedBlock.usage !== block.usage || updatedBlock.thumbnailUrl !== block.thumbnailUrl || updatedBlock.promptText !== block.promptText) {
        changed = true;
      }
      return updatedBlock;
    });
    if (changed) {
      onPromptContentChange(refreshedContent);
    }
  }, [canEditPromptReferences, onPromptContentChange, promptContent, references]);

  const removePendingAtMarker = () => {
    if (!canEditPrompt) return;
    const input = promptInputRef.current;
    const cursor = input?.selectionStart ?? promptText.length;
    if (cursor > 0 && promptText[cursor - 1] === '@') {
      const nextText = `${promptText.slice(0, cursor - 1)}${promptText.slice(cursor)}`;
      onPromptChange(nextText);
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
        promptInputRef.current?.setSelectionRange(cursor - 1, cursor - 1);
      });
    }
  };

  const flashPromptBlock = (blockId: string) => {
    setHighlightedPromptBlockId(blockId);
    promptBlockRefs.current.get(blockId)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    window.setTimeout(() => {
      setHighlightedPromptBlockId((currentId) => (currentId === blockId ? null : currentId));
    }, 900);
  };

  const insertReferenceBlock = (reference: ReferenceInfo) => {
    if (!canEditPromptReferences) return;
    const existingBlock = imageReferenceBlocks.find((block) => block.sourceNodeId === reference.nodeId);
    if (existingBlock) {
      flashPromptBlock(existingBlock.id);
      removePendingAtMarker();
      closeReferenceMenus();
      return;
    }

    const nextBlock = createImageReferenceBlock(reference);
    onPromptContentChange([...promptContent, nextBlock]);
    setHighlightedPromptBlockId(nextBlock.id);
    window.setTimeout(() => {
      setHighlightedPromptBlockId((currentId) => (currentId === nextBlock.id ? null : currentId));
    }, 900);
    removePendingAtMarker();
    closeReferenceMenus();
    requestAnimationFrame(() => promptInputRef.current?.focus());
  };

  const removePromptReferenceBlock = (blockId: string) => {
    if (!canEditPromptReferences) return;
    onPromptContentChange(promptContent.filter((item) => item.type === 'text' || item.id !== blockId));
    if (editingPromptBlockId === blockId) {
      setEditingPromptBlockId(null);
      setEditingPromptText('');
    }
  };

  const startEditPromptReferenceBlock = (block: ImageReferencePromptBlock) => {
    if (!canEditPromptReferences) return;
    setEditingPromptBlockId(block.id);
    setEditingPromptText(stripReferencePromptMetadata(block.promptText));
  };

  const savePromptReferenceBlock = (blockId: string) => {
    if (!canEditPromptReferences) return;
    const nextPromptText = stripReferencePromptMetadata(editingPromptText);
    onPromptContentChange(
      promptContent.map((item) =>
        item.type === 'image_reference' && item.id === blockId
          ? {
              ...item,
              promptText: nextPromptText,
              promptTextEdited: true,
            }
          : item,
      ),
    );
    setEditingPromptBlockId(null);
    setEditingPromptText('');
  };

  const requestReferenceInsert = (reference: ReferenceInfo) => {
    if (!canEditPromptReferences) return;
    onUseReference(reference);
    insertReferenceBlock(reference);
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEditPrompt) return;
    if (event.nativeEvent.isComposing) return;

    if (showSlashMenu) {
      if (slashFilteredPresets.length === 0) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlashMenu();
        }
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashIndex((index) => (index + 1) % slashFilteredPresets.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSlashIndex((index) => (index - 1 + slashFilteredPresets.length) % slashFilteredPresets.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const preset = slashFilteredPresets[slashIndex];
        if (preset) {
          insertSlashPreset(preset.id);
        }
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlashMenu();
        return;
      }
    }

    if (showReferenceMenu && sortedReferences.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index + 1) % sortedReferences.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index - 1 + sortedReferences.length) % sortedReferences.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const selectedReference = sortedReferences[activeReferenceIndex];
        if (selectedReference) requestReferenceInsert(selectedReference);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReferenceMenus();
      }
    }

    // Prompt input line break shortcuts (when no menu is open)
    if (!showSlashMenu && !showReferenceMenu) {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || event.shiftKey)) {
        event.preventDefault();
        const input = promptInputRef.current;
        if (input) {
          const start = input.selectionStart ?? promptText.length;
          const end = input.selectionEnd ?? promptText.length;
          const newText = promptText.slice(0, start) + '\n' + promptText.slice(end);
          onPromptChange(newText);
          requestAnimationFrame(() => {
            input.selectionStart = input.selectionEnd = start + 1;
          });
        }
      }
    }
  };

  const closeSlashMenu = () => {
    setShowSlashMenu(false);
    setSlashQuery('');
    setSlashIndex(0);
  };

  useEffect(() => {
    if (!showSlashMenu || !canEditPrompt) return;

    updateSlashMenuPosition();

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (slashMenuRef.current?.contains(target)) {
        return;
      }
      closeSlashMenu();
    };
    const updatePosition = () => updateSlashMenuPosition();

    document.addEventListener('pointerdown', closeOnOutside, true);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [canEditPrompt, showSlashMenu, updateSlashMenuPosition]);

  useLayoutEffect(() => {
    if (!showSlashMenu || !canEditPrompt) return;
    updateSlashMenuPosition();
  }, [canEditPrompt, showSlashMenu, slashActiveTab, slashQuery, updateSlashMenuPosition]);

  const insertSlashPreset = (presetId: string) => {
    if (!canEditPrompt || !canEditPreset) return;
    const preset = getPresetById(presetId);
    if (!preset) {
      closeSlashMenu();
      return;
    }

    const input = promptInputRef.current;
    const cursor = input?.selectionStart ?? promptText.length;
    const textBefore = promptText.slice(0, cursor);
    const textAfter = promptText.slice(cursor);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      const beforeSlash = promptText.slice(0, lastSlashIndex);
      const insertText = buildPresetTextBlock(preset, false);
      const prefix = beforeSlash && !beforeSlash.endsWith('\n') ? '\n\n' : '';
      const suffix = textAfter && !textAfter.startsWith('\n') ? '\n\n' : '';
      const newCursor = beforeSlash.length + prefix.length + insertText.length;
      const newText = `${beforeSlash}${prefix}${insertText}${suffix}${textAfter}`;
      onPromptChange(newText);
      closeSlashMenu();
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
        promptInputRef.current?.setSelectionRange(newCursor, newCursor);
      });
      return;
    }

    closeSlashMenu();
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!canEditPrompt) return;
    const nextText = event.target.value;
    const cursor = event.target.selectionStart;
    onPromptChange(nextText);

    // Detect /
    const textBeforeCursor = nextText.slice(0, cursor);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    const lastAt = textBeforeCursor.lastIndexOf('@');
    const lastNewline = textBeforeCursor.lastIndexOf('\n');

    if (lastSlash >= 0 && lastSlash > lastAt && lastSlash > lastNewline) {
      const query = textBeforeCursor.slice(lastSlash + 1);
      if (!query.includes(' ') && !query.includes('\n')) {
        setSlashQuery(query);
        setSlashIndex(0);
        setShowSlashMenu(true);
      } else {
        closeSlashMenu();
      }
    } else {
      closeSlashMenu();
    }

    if (nextText[cursor - 1] === '@' && sortedReferences.length > 0) {
      setActiveReferenceIndex(0);
      setShowReferenceMenu(true);
      return;
    }
    if (showReferenceMenu && nextText[cursor - 1] !== '@') {
      setShowReferenceMenu(false);
    }
  };

  const stopControlContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const stopControlEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
  };

  const slashMenuPortal = canEditPrompt && showSlashMenu && slashMenuStyle
    ? createPortal(
      <div
        ref={slashMenuRef}
        className="nodrag nopan nowheel fixed overflow-hidden rounded-xl"
        style={{
          top: slashMenuStyle.top,
          left: slashMenuStyle.left,
          width: slashMenuStyle.width,
          maxHeight: slashMenuStyle.maxHeight,
          zIndex: 2000,
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 20px 48px rgba(0,0,0,0.58)',
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
        onWheelCapture={(event) => event.stopPropagation()}
      >
        <div className="border-b px-3 py-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="text-[12px] font-medium text-white/72">快捷指令</div>
          <div className="mt-2 flex gap-1 overflow-x-auto overscroll-contain pb-1">
            {PRESET_TABS.map((tab) => {
              const active = tab === slashActiveTab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => handleSlashTabChange(tab)}
                  className="shrink-0 rounded-md px-2.5 py-1 text-[11px] transition-colors"
                  style={{
                    background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                    color: active ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.52)',
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>
        <div className="overflow-y-auto py-1" style={{ maxHeight: Math.max(160, slashMenuStyle.maxHeight - 74) }}>
          {slashFilteredPresets.length === 0 ? (
            <div className="px-3 py-3 text-[13px] text-white/40">{t('imageNode.noMatchingPreset')}</div>
          ) : (
            slashFilteredPresets.map((preset, index) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => insertSlashPreset(preset.id)}
                onMouseEnter={() => setSlashIndex(index)}
                className={`nodrag nopan nowheel flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${index === slashIndex ? 'bg-white/8' : 'hover:bg-white/5'}`}
              >
                <span className="flex h-9 w-9 shrink-0 overflow-hidden rounded-md border border-white/[0.10] bg-white/[0.04]">
                  {preset.thumbnail ? (
                    <img src={preset.thumbnail} alt="" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center">
                      <Bookmark className="h-4 w-4 text-white/30" />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-white/90">{getSlashPresetName(preset)}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/40">{getSlashPresetDescription(preset)}</span>
                </span>
              </button>
            ))
          )}
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <div
      onContextMenu={stopControlContextMenu}
      className="nodrag nowheel"
      style={{
        width: IMAGE_NODE_CONTROL_WIDTH,
        minHeight: promptExpanded ? IMAGE_NODE_CONTROL_EXPANDED_HEIGHT : IMAGE_NODE_CONTROL_HEIGHT,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        borderRadius: 12,
        marginTop: 8,
        boxShadow: '0 16px 40px rgba(0,0,0,0.42)',
      }}
      onPointerDown={stopControlEvent}
      onMouseDown={stopControlEvent}
      onWheel={stopControlEvent}
      onWheelCapture={stopControlEvent}
    >
      {markCandidateMenuPortal}
      {/* Top toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 14px 8px' }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Preset */}
          <div className="relative">
            <button
              disabled={!canEditPreset}
              onClick={() => {
                if (!canEditPreset) return;
                setShowPresetModal(true);
                setShowLightPreview(false);
                setShowStylePicker(false);
              }}
              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${canEditPreset ? GENERATION_CONTROL_BUTTON_CLASS : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
              style={{
                width: 54,
                height: 50,
                padding: '4px',
                opacity: canEditPreset ? 1 : 0.45,
                cursor: canEditPreset ? 'pointer' : 'not-allowed',
              }}
            >
              <Bookmark className="w-4 h-4" />
              <span style={{ fontSize: 14 }}>{t('imageNode.preset')}</span>
            </button>
            {canEditPreset && showPresetModal && (
              <PresetPickerModal
                open={showPresetModal}
                selectedPresetIds={selectedPresets}
                onApply={handlePresetModalApply}
                onClose={() => setShowPresetModal(false)}
              />
            )}
          </div>
          {/* Light Preview */}
          <div className="relative">
            {lightPreview?.enabled ? (
              <div className="group/light-btn relative" style={{ width: 54, height: 50 }}>
                <button
                  type="button"
                  disabled={!canEditLighting}
                  onClick={() => {
                    if (!canEditLighting) return;
                    setShowLightPreview(true);
                    setShowPresetModal(false);
                    setShowStylePicker(false);
                  }}
                  className={`relative flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border p-0 transition-colors ${canEditLighting ? GENERATION_CONTROL_BUTTON_SELECTED_CLASS : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
                  style={{
                    opacity: canEditLighting ? 1 : 0.45,
                    cursor: canEditLighting ? 'pointer' : 'not-allowed',
                  }}
                >
                  <img
                    src={lightPreview.derived.previewImagePath}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
                <button
                  type="button"
                  onPointerDownCapture={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClickCapture={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!canEditLighting) return;
                    onLightPreviewChange(null);
                    setShowLightPreview(false);
                  }}
                  className={`nodrag nowheel absolute right-0 top-0 z-30 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black ${canEditLighting ? 'hidden group-hover/light-btn:flex' : 'hidden'}`}
                  style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                  title="清除光影设置"
                  aria-label="清除光影设置"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
                {/* Hover tooltip */}
                {canEditLighting && (
                  <div className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-[220px] rounded-xl p-2.5 text-left group-hover/light-btn:block" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 14px 32px rgba(0,0,0,0.46)' }}>
                    <div className="text-[14px] font-medium text-white/90">光影</div>
                    <div className="mt-1 text-[13px] text-white/55">{lightPreview.derived.timeLabel} · {lightPreview.derived.directionLabel}</div>
                    <div className="mt-1.5 space-y-0.5 text-[13px] text-white/48">
                      <div>太阳高度：{lightPreview.sun.elevation}°</div>
                      <div>太阳方位：{lightPreview.sun.azimuth}°</div>
                      <div>天空：{lightPreview.derived.skyLabel}</div>
                      <div>阴影：{lightPreview.derived.shadowLengthLabel} · {lightPreview.derived.shadowBlurLabel}</div>
                    </div>
                    <div className="mt-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.72)' }}>点击可重新设置</div>
                  </div>
                )}
              </div>
            ) : (
              <button
                disabled={!canEditLighting}
                onClick={() => {
                  if (!canEditLighting) return;
                  setShowLightPreview(true);
                  setShowPresetModal(false);
                  setShowStylePicker(false);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${canEditLighting ? GENERATION_CONTROL_BUTTON_CLASS : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
                style={{
                  width: 54,
                  height: 50,
                  padding: '4px',
                  opacity: canEditLighting ? 1 : 0.45,
                  cursor: canEditLighting ? 'pointer' : 'not-allowed',
                }}
              >
                <Sun className="w-4 h-4" />
                <span style={{ fontSize: 14 }}>光影</span>
              </button>
            )}
            {canEditLighting && showLightPreview && (
              <LightPreviewPanel
                initialSun={lightPreview?.sun}
                initialSettings={lightPreview?.settings}
                onApply={(data) => {
                  if (!canEditLighting) return;
                  onLightPreviewChange(data);
                  setShowLightPreview(false);
                }}
                onClose={() => setShowLightPreview(false)}
              />
            )}
          </div>
          {/* Style */}
          <div className="relative">
            <button
              disabled={!canEditStyle}
              onClick={() => {
                if (!canEditStyle) return;
                setShowStylePicker(true);
                setShowPresetModal(false);
                setShowLightPreview(false);
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                if (!canEditStyle) return;
                setShowStylePicker(true);
                setShowPresetModal(false);
                setShowLightPreview(false);
              }}
              className={`group/style-btn relative flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${
                selectedStyle
                  ? GENERATION_CONTROL_BUTTON_SELECTED_CLASS
                  : canEditStyle ? GENERATION_CONTROL_BUTTON_CLASS : GENERATION_CONTROL_BUTTON_DISABLED_CLASS
              }`}
              style={{
                width: 54,
                height: 50,
                padding: selectedStyle ? 0 : '4px',
                opacity: canEditStyle ? 1 : 0.45,
                cursor: canEditStyle ? 'pointer' : 'not-allowed',
              }}
              title={t('style.selectStyle')}
            >
              {selectedStyle ? (
                <span className="pointer-events-none h-full w-full overflow-hidden rounded-lg">
                  <img src={selectedStyle.coverImage} alt="" className="h-full w-full object-cover opacity-95" draggable={false} />
                </span>
              ) : (
                <>
                  <Palette className="w-4 h-4" />
                  <span style={{ fontSize: 14 }}>{t('imageNode.style')}</span>
                </>
              )}
              {selectedStyle && canEditStyle && (
                <div className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-[210px] rounded-xl p-2.5 text-left group-hover/style-btn:block" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 14px 32px rgba(0,0,0,0.46)' }}>
                  <div className="text-[14px] font-medium text-white/90">{selectedStyle.title}</div>
                  <div className="mt-1 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>{selectedStyle.shortDescription}</div>
                  <div className="mt-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.72)' }}>{t('imageNode.clickToChangeStyle')}</div>
                </div>
              )}
            </button>
          </div>
          {/* Element mark */}
          <div className="relative">
            <button
              type="button"
              disabled={!canCreateMarks}
              onClick={() => {
                if (!canCreateMarks) return;
                setShowPresetModal(false);
                setShowLightPreview(false);
                setShowStylePicker(false);
                onStartMarkMode();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${canCreateMarks ? GENERATION_CONTROL_BUTTON_CLASS : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
              style={{
                width: 54,
                height: 50,
                padding: '4px',
                opacity: canCreateMarks ? 1 : 0.45,
                cursor: canCreateMarks ? 'pointer' : 'not-allowed',
              }}
              title={t('imageMark.button', { defaultValue: '标记' })}
            >
              <ScanSearch className="h-4 w-4" />
              <span style={{ fontSize: 14 }}>{t('imageMark.button', { defaultValue: '标记' })}</span>
            </button>
          </div>
          {(textReferences.length > 0 || sortedReferences.length > 0) && (
            <div
              aria-hidden="true"
              className="mx-1 h-6 w-px flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}
            />
          )}
          {/* Reference thumbnails */}
          <div className="relative flex min-w-0 items-center gap-2 overflow-x-auto">
            {textReferences.map(renderTextReference)}
            {sortedReferences.map((ref) => renderReferenceThumbnail(ref))}
          </div>
        </div>
        {/* Expand */}
        <button
          onClick={() => setPromptExpanded((value) => !value)}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ width: 32, height: 32, color: promptExpanded ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
          title={promptExpanded ? t('imageNode.collapsePrompt') : t('imageNode.expandPrompt')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {hasManyReferences && (
        <div className="px-3.5 pb-1">
          <div
            className="rounded-lg px-2 py-1.5 text-[12px]"
            style={{
              color: hasTooManyReferences ? '#fca5a5' : 'rgba(255,255,255,0.52)',
              background: hasTooManyReferences ? 'rgba(239,68,68,0.10)' : 'rgba(255,255,255,0.035)',
              border: hasTooManyReferences ? '1px solid rgba(239,68,68,0.24)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {hasTooManyReferences
              ? '当前引用图数量超过上限，建议删除部分引用图。'
              : '参考图较多，可能影响生成稳定性'}
          </div>
        </div>
      )}

      {/* Prompt input */}
      <div style={{ padding: '4px 14px 12px' }} onWheel={stopControlEvent} onWheelCapture={stopControlEvent}>
        <div className="relative flex flex-col" onPointerDown={stopControlEvent} onMouseDown={stopControlEvent}>
          {imageMarkReferenceBlocks.length > 0 && (
            <div className="order-2 mb-2 flex w-full flex-col gap-1.5">
              {imageMarkReferenceBlocks.map((block) => {
                const selectedCandidate = block.candidates.find((candidate) => candidate.id === block.selectedCandidateId)
                  ?? block.candidates[0];
                const markUsageColor = getImageRoleColor(block.usageKey === 'undefined_usage' ? null : block.usageKey);
                return (
                  <div
                    key={block.id}
                    className="group/mark-ref relative flex w-full items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-1.5 py-1 text-[15px]"
                  >
                    <div className="relative h-6 w-6 flex-shrink-0">
                      <img
                        src={block.thumbnailUrl}
                        alt=""
                        draggable={false}
                        className="h-6 w-6 rounded object-cover"
                        style={{ border: `1px solid ${markUsageColor}` }}
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full border border-white/15 bg-[#252526] text-teal-300/80">
                        <ScanSearch className="h-2 w-2" />
                      </span>
                    </div>
                    <div className="flex min-w-0 w-[150px] flex-shrink-0 items-center">
                        {block.candidates.length > 1 ? (
                          <button
                            data-mark-candidate-trigger={block.id}
                            type="button"
                            disabled={!canEditMarks}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (activeMarkCandidateBlockId === block.id) {
                                setActiveMarkCandidateBlockId(null);
                                setMarkCandidateMenuPosition(null);
                                return;
                              }
                              const rect = event.currentTarget.getBoundingClientRect();
                              setActiveMarkCandidateBlockId(block.id);
                              setMarkCandidateMenuPosition({
                                left: Math.max(8, Math.min(window.innerWidth - 188, rect.left)),
                                top: rect.bottom + 4,
                              });
                            }}
                            className="nodrag flex h-6 min-w-0 flex-1 cursor-pointer items-center gap-1 rounded border border-white/10 bg-white/[0.045] px-1.5 text-[15px] font-medium text-white/80 outline-none disabled:cursor-default disabled:opacity-70"
                            title={block.markLabel}
                          >
                            <span className="min-w-0 flex-1 truncate text-left">{selectedCandidate?.label || block.markLabel}</span>
                            <ChevronDown className="h-3 w-3 flex-shrink-0 text-white/40" />
                          </button>
                        ) : (
                          <span className="truncate rounded border border-white/10 bg-white/[0.045] px-1.5 py-0.5 text-[15px] font-medium leading-none text-white/80" title={selectedCandidate?.label || block.markLabel}>
                            {selectedCandidate?.label || block.markLabel}
                          </span>
                        )}
                    </div>
                      <input
                        type="text"
                        value={block.promptText}
                        disabled={!canEditMarks}
                        onChange={(event) => {
                          const nextPromptText = event.target.value;
                          onPromptContentChange(promptContent.map((item) => item.type === 'image_mark_reference' && item.id === block.id
                            ? { ...item, promptText: nextPromptText, promptTextEdited: true }
                            : item));
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        className="nodrag nowheel h-6 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 text-[15px] text-white/65 outline-none transition-colors hover:border-white/[0.08] focus:border-white/[0.14] focus:bg-black/10 disabled:opacity-70"
                        placeholder="补充标记元素的参考说明"
                      />
                    {canEditMarks && (
                      <button
                        type="button"
                        className="ml-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full opacity-0 transition-colors hover:bg-white/15 group-hover/mark-ref:opacity-100"
                        style={{ color: 'rgba(255,255,255,0.58)' }}
                        onClick={(event) => {
                          event.stopPropagation();
                          onPromptContentChange(promptContent.filter((item) => !('id' in item) || item.id !== block.id));
                        }}
                        title={t('imageMark.removeChip', { defaultValue: '移除标记引用' })}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {!canEditMarks && <span className="ml-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          )}
          {sortedImageReferenceBlocks.length > 0 && (
            <div className="order-1 mb-2 flex w-full flex-col gap-1.5">
              {sortedImageReferenceBlocks.map((block) => {
                const reference = references.find((item) => item.nodeId === block.sourceNodeId);
                const previewImage = reference?.imageUrl || block.thumbnailUrl;
                const highlighted = highlightedPromptBlockId === block.id;
                const isPromptBlockHovered = hoveredPromptBlockId === block.id;
                const hovered = canEditPromptReferences && isPromptBlockHovered;
                const usageColor = getImageRoleColor(reference?.role ?? null, reference?.localReferenceType);
                const isEditing = canEditPromptReferences && editingPromptBlockId === block.id;
                const displayPromptText = stripReferencePromptMetadata(block.promptText);
                const displayUsage = reference?.roleLabel || block.usage;

                return (
                  <div
                    key={block.id}
                    ref={(element) => {
                      if (element) {
                        promptBlockRefs.current.set(block.id, element);
                      } else {
                        promptBlockRefs.current.delete(block.id);
                      }
                    }}
                    onMouseEnter={() => setHoveredPromptBlockId(block.id)}
                    onMouseLeave={() => setHoveredPromptBlockId((currentId) => (currentId === block.id ? null : currentId))}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      startEditPromptReferenceBlock(block);
                    }}
                    className="group/prompt-ref relative flex w-full items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[15px] transition-all"
                    style={{
                      background: hovered || highlighted ? 'rgba(255,255,255,0.052)' : 'rgba(255,255,255,0.035)',
                      borderColor: highlighted ? `${usageColor}66` : hovered ? `${usageColor}52` : 'rgba(255,255,255,0.10)',
                      boxShadow: 'none',
                      color: 'rgba(255,255,255,0.82)',
                      opacity: canEditPromptReferences ? 1 : 0.82,
                    }}
                    >
                    {!isEditing && isPromptBlockHovered && (
                      <div
                        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 w-[320px] rounded-xl p-3 text-left"
                        style={{
                          background: FLOATING_PANEL_BACKGROUND,
                          border: FLOATING_PANEL_BORDER,
                          boxShadow: '0 14px 32px rgba(0,0,0,0.46)',
                        }}
                      >
                        <div className="flex items-center gap-2">
                          {previewImage ? (
                            <img
                              src={previewImage}
                              alt=""
                              className="h-7 w-7 flex-shrink-0 rounded object-cover"
                              draggable={false}
                              style={{ border: `1px solid ${usageColor}` }}
                            />
                          ) : (
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${usageColor}` }}>
                              <Image className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.38)' }} />
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.86)' }}>
                              {displayUsage}
                            </div>
                            <div className="mt-0.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.46)' }}>
                              双击编辑引用说明
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-5" style={{ color: 'rgba(255,255,255,0.68)' }}>
                          {displayPromptText || '暂无用途说明'}
                        </div>
                      </div>
                    )}
                    {previewImage ? (
                      <img
                        src={previewImage}
                        alt=""
                        className="h-6 w-6 flex-shrink-0 rounded object-cover"
                        draggable={false}
                        style={{ border: `1px solid ${usageColor}` }}
                      />
                    ) : (
                      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${usageColor}` }}>
                        <Image className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.38)' }} />
                      </span>
                    )}
                    <span
                      className="flex-shrink-0 rounded px-1.5 py-0.5 font-medium leading-none"
                      style={{
                        color: 'rgba(255,255,255,0.76)',
                        background: 'rgba(255,255,255,0.045)',
                        border: `1px solid ${hovered || highlighted ? `${usageColor}52` : `${usageColor}38`}`,
                      }}
                    >
                      {displayUsage}
                    </span>
                    {isEditing ? (
                      <textarea
                        autoFocus
                        ref={(element) => {
                          if (!element) return;
                          requestAnimationFrame(() => {
                            element.focus();
                            const end = element.value.length;
                            element.setSelectionRange(end, end);
                          });
                        }}
                        value={editingPromptText}
                        onChange={(event) => setEditingPromptText(event.target.value)}
                        onBlur={() => savePromptReferenceBlock(block.id)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            savePromptReferenceBlock(block.id);
                          }
                        }}
                        onPointerDown={stopControlEvent}
                        onMouseDown={stopControlEvent}
                        onWheel={stopControlEvent}
                        onWheelCapture={stopControlEvent}
                        className="nodrag nowheel min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-5 outline-none"
                        style={{
                          height: 76,
                          color: 'rgba(255,255,255,0.82)',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          border: '1px solid rgba(255,255,255,0.14)',
                          borderRadius: 6,
                          padding: '4px 6px',
                        }}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate text-[15px] leading-5" style={{ color: 'rgba(255,255,255,0.66)' }}>{displayPromptText}</span>
                    )}
                    {canEditPromptReferences && !isEditing && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removePromptReferenceBlock(block.id);
                        }}
                        className="ml-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full opacity-0 transition-colors hover:bg-white/15 group-hover/prompt-ref:opacity-100"
                        style={{ color: 'rgba(255,255,255,0.58)' }}
                        title={t('imageNode.removeReferencePrompt')}
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                    {(!canEditPromptReferences || isEditing) && <span className="ml-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          )}
          <textarea
            ref={promptInputRef}
            value={promptText}
            onChange={handlePromptChange}
            onKeyDown={handlePromptKeyDown}
            readOnly={!canEditPrompt}
            placeholder={t('imageNode.promptPlaceholder')}
            className="order-3 w-full bg-transparent resize-none outline-none placeholder:text-[rgba(255,255,255,0.38)] nowheel"
            style={{
              color: 'rgba(255,255,255,0.94)',
              fontSize: 15,
              lineHeight: 1.58,
              minHeight: promptExpanded ? 176 : 104,
              opacity: canEditPrompt ? 1 : 0.82,
              cursor: canEditPrompt ? 'text' : 'default',
            }}
            rows={promptExpanded ? 7 : 4}
            onPointerDown={stopControlEvent}
            onMouseDown={stopControlEvent}
            onWheel={stopControlEvent}
            onWheelCapture={stopControlEvent}
          />
          {canEditPromptReferences && showReferenceMenu && sortedReferences.length > 0 && (
            <div
              className="absolute left-0 top-7 z-40 overflow-hidden rounded-xl py-1"
              style={{
                width: 260,
                background: FLOATING_PANEL_BACKGROUND,
                border: FLOATING_PANEL_BORDER,
                boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
              }}
            >
              {sortedReferences.map((reference, index) => (
                <button
                  key={reference.nodeId}
                  onMouseEnter={() => setActiveReferenceIndex(index)}
                  onClick={() => requestReferenceInsert(reference)}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors"
                  style={{
                    background: activeReferenceIndex === index ? 'rgba(255,255,255,0.08)' : 'transparent',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                >
                  {reference.imageUrl ? (
                    <img src={reference.imageUrl} alt="" className="h-8 w-8 flex-shrink-0 rounded object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <Image className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.45)' }} />
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{getImageRoleLabel(reference.role, reference.customRoleLabel, reference.localReferenceType, reference.localReferenceLabel) || t('imageNode.undefinedUsage')}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom params bar */}
      <div className="flex items-center justify-between" style={{ padding: '4px 14px 14px' }}>
        <div className="flex items-center gap-4">
          {/* Model */}
          <div className="relative">
            <button
              disabled={!canEditModel}
              onClick={() => {
                if (!canEditModel) return;
                setShowModelMenu(!showModelMenu);
                setShowRatioMenu(false);
                setShowCountMenu(false);
              }}
              className={`flex items-center gap-1.5 transition-colors ${canEditModel ? 'hover:text-white' : ''}`}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', opacity: canEditModel ? 1 : 0.45, cursor: canEditModel ? 'pointer' : 'not-allowed' }}
            >
              <span style={{ color: 'rgba(255,255,255,0.72)' }}>×</span>
              <span className="truncate" style={{ maxWidth: 150 }}>{selectedModel.name}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {canEditModel && showModelMenu && (
              <div className="absolute bottom-full left-0 mb-1 py-1 rounded-lg z-30 overflow-hidden" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 190 }}>
                {MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.name}
                    disabled={!canEditModel}
                    onClick={() => {
                      if (!canEditModel) return;
                      onModelParamsChange({ ...modelParams, model: m.name });
                      setShowModelMenu(false);
                    }}
                    className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${modelParams.model === m.name ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="flex-shrink-0 flex items-center justify-center rounded text-[10px] font-bold text-white" style={{ width: 20, height: 20, background: m.iconBg }}>{m.icon}</span>
                    <span className="text-[15px] text-white/85">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Ratio · Resolution */}
          <div className="relative">
            <button
              disabled={!canEditModel}
              onClick={() => {
                if (!canEditModel) return;
                setShowRatioMenu(!showRatioMenu);
                setShowModelMenu(false);
                setShowCountMenu(false);
              }}
              className={`flex items-center gap-1.5 transition-colors ${canEditModel ? 'hover:text-white' : ''}`}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', opacity: canEditModel ? 1 : 0.45, cursor: canEditModel ? 'pointer' : 'not-allowed' }}
            >
              <Maximize2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.68)' }} />
              <span>{modelParams.ratio} · {modelParams.resolution}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {canEditModel && showRatioMenu && (
              <div className="absolute bottom-full left-0 mb-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 16px 34px rgba(0,0,0,0.48)', width: 326, padding: 8 }}>
                <div className="pb-2">
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('imageNode.resolution')}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        disabled={!canEditModel}
                        onClick={() => {
                          if (!canEditModel) return;
                          onModelParamsChange({ ...modelParams, resolution: r });
                        }}
                        className="h-9 rounded-md text-[14px] font-medium transition-colors"
                        style={{
                          color: modelParams.resolution === r ? '#ffffff' : 'rgba(255,255,255,0.54)',
                          background: 'rgba(255,255,255,0.035)',
                          border: modelParams.resolution === r ? '1px solid rgba(255,255,255,0.9)' : FLOATING_PANEL_BORDER,
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-1">
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('imageNode.ratio')}</div>
                  <div className="grid grid-cols-5 gap-2">
                    {RATIO_OPTIONS.map((ar) => (
                      <button
                        key={ar.value}
                        disabled={!canEditModel}
                        onClick={() => {
                          if (!canEditModel) return;
                          onModelParamsChange({ ...modelParams, ratio: ar.value });
                          setShowRatioMenu(false);
                        }}
                        className="flex h-[64px] flex-col items-center justify-center gap-2 rounded-md transition-colors"
                        style={{
                          color: modelParams.ratio === ar.value ? '#ffffff' : 'rgba(255,255,255,0.58)',
                          background: 'rgba(255,255,255,0.035)',
                          border: modelParams.ratio === ar.value ? '1px solid rgba(255,255,255,0.9)' : FLOATING_PANEL_BORDER,
                        }}
                      >
                        <div className="border border-current rounded-[2px]" style={{ width: ar.icon === 'portrait' ? 9 : ar.icon === 'landscape' ? 14 : ar.icon === 'ultrawide' ? 17 : 11, height: ar.icon === 'portrait' ? 15 : ar.icon === 'landscape' ? 8 : ar.icon === 'ultrawide' ? 5 : 11, opacity: 0.78 }} />
                        <span className="text-[13px]">{t(`imageNode.ratioValue.${ar.value}`, { defaultValue: ar.value })}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Generate button */}
        <div className="relative flex items-center rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: FLOATING_PANEL_BORDER, padding: '5px 6px 5px 12px', gap: 8 }}>
          <button
            disabled={!canEditModel}
            onClick={() => {
              if (!canEditModel) return;
              setShowCountMenu(!showCountMenu);
              setShowModelMenu(false);
              setShowRatioMenu(false);
            }}
            className={`flex h-[34px] min-w-[82px] items-center justify-center gap-1 transition-colors ${canEditModel ? 'hover:text-white' : ''}`}
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 600, opacity: canEditModel ? 1 : 0.45, cursor: canEditModel ? 'pointer' : 'not-allowed' }}
          >
            {formatGenerationCount(modelParams.count)}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          {canEditModel && showCountMenu && (
            <div className="absolute bottom-full left-0 mb-2 py-1 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 82 }}>
              {COUNT_OPTIONS.map((c) => (
                <button
                  key={c}
                  disabled={!canEditModel}
                  onClick={() => {
                    if (!canEditModel) return;
                    onModelParamsChange({ ...modelParams, count: c });
                    setShowCountMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-center text-[14px] transition-colors ${modelParams.count === c ? 'text-white bg-white/10' : 'text-white/75 hover:bg-white/5'}`}
                >
                  {formatGenerationCount(c)}
                </button>
              ))}
            </div>
          )}
          <div
            className="flex h-[34px] min-w-[52px] items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-medium"
            style={{
              color: 'rgba(255,255,255,0.48)',
              background: 'rgba(255,255,255,0.018)',
              border: '1px solid rgba(255,255,255,0.035)',
            }}
            title={t('imageNode.creditCost', { count: GENERATION_CREDIT_COST })}
          >
            <Zap className="h-3 w-3 fill-current text-[#b8a36d]" />
            <span>{GENERATION_CREDIT_COST}</span>
          </div>
          {generationTask?.status === 'failed' && generationTask.errorMessage ? (
            <button
              onClick={handleGenerateClick}
              disabled={!canGenerate}
              className="flex items-center justify-center gap-1 rounded-lg transition-colors"
              style={{
                height: 34,
                padding: '0 10px',
                background: 'rgba(239,68,68,0.16)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#fca5a5',
                fontSize: 14,
                opacity: canGenerate ? 1 : 0.5,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
              }}
              title={generationTask.errorMessage}
            >
              <span className="truncate" style={{ maxWidth: 120 }}>{t('imageNode.generationFailed')}</span>
              <span className="text-white/60">·</span>
              <span className="text-white/80 hover:text-white">{t('imageNode.retry')}</span>
            </button>
          ) : (
            <button
              onClick={handleGenerateClick}
              disabled={!canGenerate}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{
                width: 34,
                height: 34,
                background: canGenerate ? '#ffffff' : 'rgba(255,255,255,0.14)',
                opacity: canGenerate ? 1 : 0.45,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
              }}
              title={isGenerating ? t('imageNode.generating') : t('imageNode.generate')}
            >
              {isGenerating ? (
                <div className="relative flex items-center justify-center">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
                    <path d="M8 2A6 6 0 0 1 14 8" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              ) : (
                <ArrowUp className="w-4 h-4 text-black" />
              )}
            </button>
          )}
        </div>
      </div>
      <StylePickerModal
        open={canEditStyle && showStylePicker}
        selectedStyleId={selectedStyleId}
        onApply={(styleId) => {
          if (!canEditStyle) return;
          onStyleChange(styleId);
        }}
        onClose={() => setShowStylePicker(false)}
      />
      {slashMenuPortal}
    </div>
  );
}
