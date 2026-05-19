import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import {
  Image,
  X,
  Bookmark,
  MapPin,
  Palette,
  ChevronDown,
  Zap,
  ArrowUp,
  Maximize2,
  Check,
  Star,
  Eye,
  Sun,
  Mountain,
  ScanEye,
  User,
  Pencil,
  Trash2 as TrashIcon,
} from 'lucide-react';
import type {
  PromptContent,
  ImageReferencePromptBlock,
  ReferenceInfo,
  ImageRole,
  PresetTab,
} from '../../types/imageNode.types';
import type { MarkAction, MarkItem, ModelParams } from '../../types/canvas.types';
import {
  FLOATING_PANEL_BACKGROUND,
  FLOATING_PANEL_BORDER,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  IMAGE_NODE_CONTROL_EXPANDED_HEIGHT,
  MODEL_OPTIONS,
  RESOLUTION_OPTIONS,
  RATIO_OPTIONS,
  COUNT_OPTIONS,
  MARK_ACTION_LABELS,
  MARK_ACTION_COLORS,
} from '../../constants/canvasConstants';
import { UNIQUE_USAGES, imageRoleOptions, getImageRoleLabel, getImageRoleColor, normalizeCustomReferenceLabel } from '../../constants/imageUsages';
import {
  PRESET_DATA,
  PRESET_TABS,
  MAX_MULTI_PRESETS_BY_GROUP,
  getPresetById,
  getStylePresetById,
} from '../../constants/presets';
import { createImageReferenceBlock, stripReferencePromptMetadata } from '../../utils/promptUtils';
import { areReferenceListsEqual, hasDefinedUsage } from '../../utils/referenceUtils';
import { StylePickerModal } from '../../components/StylePickerModal';

export function ImageNodeControlPanel({
  promptText,
  onPromptChange,
  promptContent,
  onPromptContentChange,
  marks,
  onMarksChange,
  selectedPresets,
  onPresetsChange,
  selectedStyleId,
  onStyleChange,
  modelParams,
  onModelParamsChange,
  onGenerate,
  canGenerate,
  references,
  onRemoveReference,
  onReorderReferences,
  onUseReference,
  onAssignReferenceRole,
  showToast,
}: {
  promptText: string;
  onPromptChange: (value: string) => void;
  promptContent: PromptContent[];
  onPromptContentChange: (content: PromptContent[]) => void;
  marks: MarkItem[];
  onMarksChange: (marks: MarkItem[]) => void;
  selectedPresets: string[];
  onPresetsChange: (presets: string[]) => void;
  selectedStyleId: string | null;
  onStyleChange: (styleId: string | null) => void;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  onGenerate: () => void;
  canGenerate: boolean;
  references: ReferenceInfo[];
  onRemoveReference: (nodeId: string) => void;
  onReorderReferences: (newOrder: string[]) => void;
  onUseReference: (reference: ReferenceInfo) => void;
  onAssignReferenceRole: (nodeId: string, role: ImageRole, customRoleLabel?: string) => ReferenceInfo | null;
  showToast?: (msg: string) => void;
}) {
  const [showMarkPanel, setShowMarkPanel] = useState(false);
  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [activePresetTab, setActivePresetTab] = useState<PresetTab>('常用');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [pendingReference, setPendingReference] = useState<ReferenceInfo | null>(null);
  const [pendingCustomInput, setPendingCustomInput] = useState(false);
  const [pendingCustomValue, setPendingCustomValue] = useState('');
  const [highlightedPromptBlockId, setHighlightedPromptBlockId] = useState<string | null>(null);
  const [hoveredPromptBlockId, setHoveredPromptBlockId] = useState<string | null>(null);
  const [editingPromptBlockId, setEditingPromptBlockId] = useState<string | null>(null);
  const [editingPromptText, setEditingPromptText] = useState('');
  const [markName, setMarkName] = useState('');
  const [markAction, setMarkAction] = useState<MarkAction>('enhance');
  const [markDesc, setMarkDesc] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const pendingCustomInputRef = useRef<HTMLInputElement>(null);
  const promptBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  /* ─── Reference thumbnail drag-and-drop reorder ─── */
  const [orderedRefs, setOrderedRefs] = useState(references);
  const [draggingRefId, setDraggingRefId] = useState<string | null>(null);
  const isDraggingRef = useRef(false);
  const orderedRefsRef = useRef(references);
  const referenceItemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const referenceRectsBeforeUpdateRef = useRef<Map<string, DOMRect> | null>(null);
  const referenceDragRef = useRef<{
    nodeId: string;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setOrderedRefs((currentRefs) => {
      const latestById = new Map(references.map((reference) => [reference.nodeId, reference]));
      const currentIds = new Set(currentRefs.map((reference) => reference.nodeId));
      const idsChanged = currentIds.size !== references.length || !references.every((reference) => currentIds.has(reference.nodeId));
      const nextRefs = idsChanged ? references : currentRefs.map((reference) => latestById.get(reference.nodeId) || reference);

      return areReferenceListsEqual(currentRefs, nextRefs) ? currentRefs : nextRefs;
    });
  }, [references]);

  useEffect(() => {
    orderedRefsRef.current = orderedRefs;
  }, [orderedRefs]);

  useLayoutEffect(() => {
    const previousRects = referenceRectsBeforeUpdateRef.current;
    if (!previousRects) return;
    referenceRectsBeforeUpdateRef.current = null;

    orderedRefsRef.current.forEach((ref) => {
      if (ref.nodeId === draggingRefId) return;
      const element = referenceItemRefs.current.get(ref.nodeId);
      const previousRect = previousRects.get(ref.nodeId);
      if (!element || !previousRect) return;

      const nextRect = element.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5) return;

      element.style.transition = 'none';
      element.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
      requestAnimationFrame(() => {
        element.style.transition = 'transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 120ms ease';
        element.style.transform = 'translate(0, 0)';
      });
    });
  }, [orderedRefs, draggingRefId]);

  const captureReferenceRects = useCallback(() => {
    const rects = new Map<string, DOMRect>();
    orderedRefsRef.current.forEach((ref) => {
      const element = referenceItemRefs.current.get(ref.nodeId);
      if (element) rects.set(ref.nodeId, element.getBoundingClientRect());
    });
    referenceRectsBeforeUpdateRef.current = rects;
  }, []);

  const reorderReferences = useCallback(
    (sourceIndex: number, targetIndex: number) => {
      if (sourceIndex === targetIndex) return;
      captureReferenceRects();
      const newRefs = [...orderedRefsRef.current];
      const [moved] = newRefs.splice(sourceIndex, 1);
      newRefs.splice(targetIndex, 0, moved);
      orderedRefsRef.current = newRefs;
      setOrderedRefs(newRefs);
      onReorderReferences(newRefs.map((r) => r.nodeId));
    },
    [captureReferenceRects, onReorderReferences],
  );

  const resetPointerReferenceDrag = useCallback(
    (keepClickBlocked = true) => {
      referenceDragRef.current = null;
      setDraggingRefId(null);
      if (keepClickBlocked) {
        window.setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      } else {
        isDraggingRef.current = false;
      }
    },
    [],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = referenceDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;

      event.preventDefault();
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
      if (distance > 3) drag.moved = true;

      let swapped = false;
      do {
        swapped = false;
        const currentRefs = orderedRefsRef.current;
        const currentIndex = currentRefs.findIndex((ref) => ref.nodeId === drag.nodeId);
        if (currentIndex < 0) return;

        const prevRef = currentRefs[currentIndex - 1];
        const nextRef = currentRefs[currentIndex + 1];
        const prevEl = prevRef ? referenceItemRefs.current.get(prevRef.nodeId) : null;
        const nextEl = nextRef ? referenceItemRefs.current.get(nextRef.nodeId) : null;

        if (prevEl) {
          const prevRect = prevEl.getBoundingClientRect();
          if (event.clientX < prevRect.left + prevRect.width / 2) {
            reorderReferences(currentIndex, currentIndex - 1);
            swapped = true;
            continue;
          }
        }

        if (nextEl) {
          const nextRect = nextEl.getBoundingClientRect();
          if (event.clientX > nextRect.left + nextRect.width / 2) {
            reorderReferences(currentIndex, currentIndex + 1);
            swapped = true;
          }
        }
      } while (swapped);
    };

    const handlePointerEnd = (event: PointerEvent) => {
      const drag = referenceDragRef.current;
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      resetPointerReferenceDrag(drag.moved);
    };

    const handleWindowBlur = () => resetPointerReferenceDrag(true);

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerEnd, { passive: false });
    window.addEventListener('pointercancel', handlePointerEnd, { passive: false });
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [reorderReferences, resetPointerReferenceDrag]);

  const handleRefPointerDown =
    (index: number) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      const ref = orderedRefsRef.current[index];
      if (!ref) return;
      referenceDragRef.current = {
        nodeId: ref.nodeId,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
      };
      isDraggingRef.current = true;
      setDraggingRefId(ref.nodeId);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      event.stopPropagation();
    };

  const handleThumbnailClick = (ref: ReferenceInfo) => {
    if (isDraggingRef.current) return;
    requestReferenceInsert(ref);
  };

  const imageReferenceBlocks = promptContent.filter((block): block is ImageReferencePromptBlock => block.type === 'image_reference');

  const selectedModel = MODEL_OPTIONS.find((m) => m.name === modelParams.model) || MODEL_OPTIONS[0];
  const selectedStyle = getStylePresetById(selectedStyleId);
  const visiblePresets = useMemo(
    () => PRESET_DATA.filter((preset) => preset.category !== 'style' && preset.tabs.includes(activePresetTab)),
    [activePresetTab],
  );
  const slashFilteredPresets = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    const presetPool = PRESET_DATA.filter((preset) => preset.category !== 'style');
    if (!query) return presetPool;

    return presetPool.filter(
      (preset) =>
        preset.name.toLowerCase().includes(query) ||
        preset.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [slashQuery]);

  const selectPreset = (presetId: string) => {
    const preset = getPresetById(presetId);
    if (!preset || preset.category === 'style') return;

    if (selectedPresets.includes(presetId)) {
      removePreset(presetId);
      return;
    }

    let nextPresets = selectedPresets.filter((id) => {
      const selectedPreset = getPresetById(id);
      if (!selectedPreset || selectedPreset.category === 'style') return false;
      if (selectedPreset.group !== preset.group) return true;
      return preset.selectType === 'multi';
    });

    if (preset.id === 'snow_scene') {
      nextPresets = nextPresets.filter((id) => id !== 'summer');
    } else if (preset.id === 'summer') {
      nextPresets = nextPresets.filter((id) => id !== 'snow_scene');
    }

    const groupLimit = MAX_MULTI_PRESETS_BY_GROUP[preset.group];
    if (preset.selectType === 'multi' && groupLimit) {
      const presetsInGroup = nextPresets.filter((id) => getPresetById(id)?.group === preset.group);
      const overflowCount = presetsInGroup.length - groupLimit + 1;
      if (overflowCount > 0) {
        const idsToRemove = new Set(presetsInGroup.slice(0, overflowCount));
        nextPresets = nextPresets.filter((id) => !idsToRemove.has(id));
      }
    }

    onPresetsChange([...nextPresets, presetId]);
  };

  const removePreset = (presetId: string) => {
    onPresetsChange(selectedPresets.filter((id) => id !== presetId));
  };

  const addMark = () => {
    if (!markName.trim()) return;
    const newMark: MarkItem = {
      id: `mark-${Date.now()}`,
      name: markName.trim(),
      action: markAction,
      sourceIndex: 1,
      description: markDesc.trim(),
    };
    onMarksChange([...marks, newMark]);
    // 只插入元素锚点，不自动追加动作描述
    const markPrompt = `@${newMark.name}（@${newMark.sourceIndex}）`;
    const newText = promptText ? `${promptText}\n${markPrompt}` : markPrompt;
    onPromptChange(newText);
    setMarkName('');
    setMarkDesc('');
    setShowMarkPanel(false);
  };

  const removeMark = (markId: string) => {
    onMarksChange(marks.filter((m) => m.id !== markId));
  };

  const closeReferenceMenus = () => {
    setShowReferenceMenu(false);
    setPendingReference(null);
    setPendingCustomInput(false);
    setPendingCustomValue('');
  };

  useEffect(() => {
    const referencesById = new Map(references.map((reference) => [reference.nodeId, reference]));
    let changed = false;
    const nextContent = promptContent.map((block) => {
      if (block.type !== 'image_reference') return block;
      const reference = referencesById.get(block.sourceNodeId);
      if (!reference) return block;
      const nextBlock = createImageReferenceBlock(reference);
      const updatedBlock = {
        ...block,
        usage: nextBlock.usage,
        thumbnailUrl: nextBlock.thumbnailUrl,
        promptText: stripReferencePromptMetadata(block.promptText || nextBlock.promptText),
      };
      if (updatedBlock.usage !== block.usage || updatedBlock.thumbnailUrl !== block.thumbnailUrl || updatedBlock.promptText !== block.promptText) {
        changed = true;
      }
      return updatedBlock;
    });
    if (changed) {
      onPromptContentChange(nextContent);
    }
  }, [onPromptContentChange, promptContent, references]);

  const removePendingAtMarker = () => {
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
    onPromptContentChange(promptContent.filter((item) => item.type === 'text' || item.id !== blockId));
    if (editingPromptBlockId === blockId) {
      setEditingPromptBlockId(null);
      setEditingPromptText('');
    }
  };

  const startEditPromptReferenceBlock = (block: ImageReferencePromptBlock) => {
    setEditingPromptBlockId(block.id);
    setEditingPromptText(stripReferencePromptMetadata(block.promptText));
  };

  const savePromptReferenceBlock = (blockId: string) => {
    const nextPromptText = stripReferencePromptMetadata(editingPromptText);
    onPromptContentChange(
      promptContent.map((item) =>
        item.type === 'image_reference' && item.id === blockId
          ? { ...item, promptText: nextPromptText }
          : item,
      ),
    );
    setEditingPromptBlockId(null);
    setEditingPromptText('');
  };

  const cancelEditPromptReferenceBlock = () => {
    setEditingPromptBlockId(null);
    setEditingPromptText('');
  };

  const requestReferenceInsert = (reference: ReferenceInfo) => {
    if (!hasDefinedUsage(reference)) {
      setPendingReference(reference);
      setShowReferenceMenu(false);
      return;
    }
    onUseReference(reference);
    insertReferenceBlock(reference);
  };

  useEffect(() => {
    if (pendingCustomInput) {
      pendingCustomInputRef.current?.focus();
    }
  }, [pendingCustomInput]);

  const handleReferenceRoleSelect = (role: ImageRole, customRoleLabel?: string) => {
    if (!pendingReference) return;
    // 检查唯一用途冲突
    if (UNIQUE_USAGES.includes(role)) {
      const conflictingRef = references.find((ref) => ref.nodeId !== pendingReference.nodeId && ref.role === role);
      if (conflictingRef) {
        showToast?.(`该节点已存在【${getImageRoleLabel(role)}】引用，请先删除现有引用或选择其他用途。`);
        setPendingReference(null);
        setPendingCustomInput(false);
        setPendingCustomValue('');
        return;
      }
    }
    const roleLabel = getImageRoleLabel(role, customRoleLabel);
    const updatedReference = onAssignReferenceRole(pendingReference.nodeId, role, customRoleLabel) || { ...pendingReference, role, roleLabel, customRoleLabel };
    setPendingReference(null);
    setPendingCustomInput(false);
    setPendingCustomValue('');
    onUseReference(updatedReference);
    insertReferenceBlock(updatedReference);
  };

  const submitPendingCustomRole = () => {
    const label = normalizeCustomReferenceLabel(pendingCustomValue);
    if (!label) {
      setPendingCustomInput(false);
      return;
    }
    // 自定义用途名称唯一性校验
    const existingCustom = references.find(
      (ref) => ref.role === 'custom_reference' && ref.customRoleLabel?.toLowerCase() === label.toLowerCase(),
    );
    if (existingCustom) {
      showToast?.(`该自定义用途名称"${label}"已被占用，请使用其他名称。`);
      return;
    }
    handleReferenceRoleSelect('custom_reference', label);
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

    if (showReferenceMenu && references.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index + 1) % references.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveReferenceIndex((index) => (index - 1 + references.length) % references.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        requestReferenceInsert(references[activeReferenceIndex]);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        closeReferenceMenus();
      }
    }

    if (pendingReference && event.key === 'Escape') {
      event.preventDefault();
      closeReferenceMenus();
    }

    // Prompt input line break shortcuts (when no menu is open)
    if (!showSlashMenu && !showReferenceMenu && !pendingReference) {
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

  const insertSlashPreset = (presetId: string) => {
    selectPreset(presetId);
    closeSlashMenu();
    // Remove the slash query from prompt text
    const input = promptInputRef.current;
    const cursor = input?.selectionStart ?? promptText.length;
    const textBefore = promptText.slice(0, cursor);
    const textAfter = promptText.slice(cursor);
    const lastSlashIndex = textBefore.lastIndexOf('/');
    if (lastSlashIndex >= 0) {
      const newText = promptText.slice(0, lastSlashIndex) + textAfter;
      onPromptChange(newText);
      requestAnimationFrame(() => {
        promptInputRef.current?.focus();
        promptInputRef.current?.setSelectionRange(lastSlashIndex, lastSlashIndex);
      });
    }
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    if (nextText[cursor - 1] === '@' && references.length > 0) {
      setActiveReferenceIndex(0);
      setPendingReference(null);
      setShowReferenceMenu(true);
      return;
    }
    if (showReferenceMenu && nextText[cursor - 1] !== '@') {
      setShowReferenceMenu(false);
    }
  };

  return (
    <div
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
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 14px 8px' }}>
        <div className="flex items-center gap-2">
          {/* 预设 */}
          <div className="relative">
            <button
              onClick={() => { setShowPresetMenu(!showPresetMenu); setShowMarkPanel(false); setShowStylePicker(false); }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ width: 54, height: 50, padding: '4px', background: selectedPresets.length > 0 ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.025)', border: FLOATING_PANEL_BORDER }}
            >
              <Bookmark className="w-4 h-4" style={{ color: selectedPresets.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: 12, color: selectedPresets.length > 0 ? '#a78bfa' : 'rgba(255,255,255,0.72)' }}>预设</span>
            </button>
            {showPresetMenu && (
              <div
                className="absolute top-full left-0 mt-1 rounded-xl z-30 overflow-hidden flex flex-col"
                style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 16px 40px rgba(0,0,0,0.48)', width: 420, maxHeight: 520 }}
                onWheel={(e) => e.stopPropagation()}
              >
                {/* Tabs */}
                <div className="flex items-center gap-1 px-3 pt-3 pb-2 border-b shrink-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {PRESET_TABS.map((tab) => {
                    const isActive = activePresetTab === tab;
                    const TabIcon = tab === '常用' ? Star : tab === '变真实' ? Eye : tab === '换氛围' ? Sun : tab === '换环境' ? Mountain : tab === '换视角' ? ScanEye : User;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActivePresetTab(tab as PresetTab)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors ${isActive ? 'text-white font-medium' : 'text-white/45 hover:text-white/70 hover:bg-white/5'}`}
                        style={isActive ? { background: 'rgba(167,139,250,0.18)' } : {}}
                      >
                        <TabIcon className="w-3 h-3" />
                        {tab}
                      </button>
                    );
                  })}
                </div>
                {/* Cards */}
                <div className="p-3 overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
                  {activePresetTab === '我的' ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <Bookmark className="w-10 h-10 text-white/10 mb-3" />
                      <div className="text-[13px] text-white/40">暂无自定义预设</div>
                      <div className="text-[11px] text-white/25 mt-1">你可以将当前预设组合保存到这里</div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {visiblePresets.map((preset) => {
                        const isSelected = selectedPresets.includes(preset.id);
                        return (
                          <button
                            key={preset.id}
                            onClick={() => selectPreset(preset.id)}
                            className={`relative group rounded-xl overflow-hidden text-left transition-all border ${isSelected ? 'border-[#a78bfa]' : 'border-white/[0.06] hover:border-white/15'}`}
                            style={{ background: 'rgba(30,30,40,0.6)' }}
                          >
                            {/* Thumbnail */}
                            <div className="relative w-full overflow-hidden" style={{ height: 88 }}>
                              <img
                                src={preset.thumbnail}
                                alt={preset.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />
                              {/* Check indicator */}
                              {isSelected && (
                                <div className="absolute top-2 right-2 flex items-center justify-center rounded-full" style={{ width: 18, height: 18, background: '#a78bfa', boxShadow: '0 2px 8px rgba(167,139,250,0.4)' }}>
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </div>
                              )}
                            </div>
                            {/* Info */}
                            <div className="p-2">
                              <div className="text-[12px] font-medium text-white/90 truncate">{preset.name}</div>
                              <div className="text-[11px] text-white/40 truncate mt-0.5">{preset.shortDescription}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                {/* Selected presets footer */}
                {selectedPresets.length > 0 && (
                  <div className="shrink-0 px-3 py-2.5 border-t flex items-center gap-2" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                    <span className="text-[11px] text-white/35 shrink-0">已选预设</span>
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {selectedPresets.map((presetId) => {
                        const preset = getPresetById(presetId);
                        if (!preset) return null;
                        return (
                          <span
                            key={presetId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px]"
                            style={{ background: 'rgba(167,139,250,0.14)', color: '#c4b5fd', border: '1px solid rgba(167,139,250,0.22)' }}
                          >
                            {preset.name}
                            <button
                              onClick={(e) => { e.stopPropagation(); removePreset(presetId); }}
                              className="hover:text-white transition-colors"
                              style={{ color: 'rgba(196,181,253,0.7)' }}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => onPresetsChange([])}
                      className="flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 transition-colors shrink-0"
                    >
                      <TrashIcon className="w-3 h-3" />
                      清空
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 标记 */}
          <div className="relative">
            <button
              onClick={() => { setShowMarkPanel(!showMarkPanel); setShowPresetMenu(false); setShowStylePicker(false); }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ width: 54, height: 50, padding: '4px', background: marks.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)', border: FLOATING_PANEL_BORDER }}
            >
              <MapPin className="w-4 h-4" style={{ color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: 12, color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.72)' }}>标记</span>
            </button>
            {showMarkPanel && (
              <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 220 }}>
                <div className="text-[12px] text-white/55 mb-2">添加元素标记</div>
                <input value={markName} onChange={(e) => setMarkName(e.target.value)} placeholder="元素名称" className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <select value={markAction} onChange={(e) => setMarkAction(e.target.value as MarkAction)} className="w-full bg-transparent text-[13px] mb-2 outline-none" style={{ color: 'rgba(255,255,255,0.9)', background: FLOATING_PANEL_BACKGROUND }} onPointerDown={(e) => e.stopPropagation()}>
                  {Object.entries(MARK_ACTION_LABELS).map(([key, label]) => (<option key={key} value={key}>{label}</option>))}
                </select>
                <input value={markDesc} onChange={(e) => setMarkDesc(e.target.value)} placeholder="动作描述" className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <button onClick={addMark} className="w-full text-center text-[12px] py-1.5 rounded bg-white/10 text-white/90 hover:bg-white/15 transition-colors">添加</button>
                {marks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {marks.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[12px]">
                        <span style={{ color: MARK_ACTION_COLORS[m.action] }}>@{m.name}（{MARK_ACTION_LABELS[m.action]}）</span>
                        <button onClick={() => removeMark(m.id)} className="text-white/30 hover:text-white/60">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* 风格 */}
          <div className="relative">
            <button
              onClick={() => {
                if (selectedPresets.length === 0) {
                  showToast?.('请先选择预设规则，再勾选风格增强');
                  return;
                }
                setShowStylePicker(true);
                setShowPresetMenu(false);
                setShowMarkPanel(false);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                if (selectedPresets.length === 0) {
                  showToast?.('请先选择预设规则，再勾选风格增强');
                  return;
                }
                setShowStylePicker(true);
                setShowPresetMenu(false);
                setShowMarkPanel(false);
              }}
              className="group/style-btn relative flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{
                width: 54,
                height: 50,
                padding: selectedStyle ? 0 : '4px',
                background: selectedStyle ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.025)',
                border: selectedStyle ? '1px solid rgba(167,139,250,0.7)' : FLOATING_PANEL_BORDER,
                opacity: selectedPresets.length === 0 ? 0.45 : 1,
              }}
              title={selectedPresets.length === 0 ? '请先选择预设规则，再勾选风格增强' : '选择整体视觉风格'}
            >
              {selectedStyle ? (
                <span className="pointer-events-none h-full w-full overflow-hidden rounded-lg">
                  <img src={selectedStyle.thumbnail} alt="" className="h-full w-full object-cover opacity-90" draggable={false} />
                </span>
              ) : (
                <>
                  <Palette className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.7)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}>风格</span>
                </>
              )}
              {selectedStyle && (
                <div className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-[210px] rounded-xl p-2.5 text-left group-hover/style-btn:block" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 14px 32px rgba(0,0,0,0.46)' }}>
                  <div className="text-[12px] font-medium text-white/90">{selectedStyle.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>{selectedStyle.description}</div>
                  <div className="mt-2 text-[11px]" style={{ color: 'rgba(167,139,250,0.86)' }}>点击更换风格 / 移除风格</div>
                </div>
              )}
            </button>
          </div>
          {/* 引用缩略图 — 支持拖拽排序 */}
          <div className="flex items-center gap-2">
            {orderedRefs.map((ref, idx) => (
              <div
                key={ref.nodeId}
                ref={(element) => {
                  if (element) {
                    referenceItemRefs.current.set(ref.nodeId, element);
                  } else {
                    referenceItemRefs.current.delete(ref.nodeId);
                  }
                }}
                role="button"
                tabIndex={0}
                draggable={false}
                onClick={() => handleThumbnailClick(ref)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleThumbnailClick(ref);
                }}
                onPointerDown={handleRefPointerDown(idx)}
                onPointerCancel={() => resetPointerReferenceDrag(true)}
                className="nodrag nowheel group/ref relative flex-shrink-0 cursor-grab rounded-lg outline-none active:cursor-grabbing"
                style={{
                  width: 54,
                  height: 50,
                  opacity: draggingRefId === ref.nodeId ? 0.48 : 1,
                  transform: draggingRefId === ref.nodeId ? 'scale(0.96)' : 'scale(1)',
                  transition: 'transform 160ms ease, opacity 120ms ease',
                  touchAction: 'none',
                }}
              >
                {ref.imageUrl && draggingRefId === null && (
                  <div
                    className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 overflow-hidden rounded-xl group-hover/ref:block"
                    style={{
                      width: 156,
                      background: FLOATING_PANEL_BACKGROUND,
                      border: FLOATING_PANEL_BORDER,
                      boxShadow: '0 14px 32px rgba(0,0,0,0.48)',
                    }}
                  >
                    <img
                      src={ref.imageUrl}
                      alt=""
                      className="w-full object-contain"
                      style={{
                        maxHeight: 200,
                        aspectRatio: ref.width && ref.height ? `${ref.width}/${ref.height}` : '1/1',
                      }}
                    />
                    <div className="px-2 py-1.5 text-[12px] text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {ref.roleLabel || '未定义用途'}
                    </div>
                  </div>
                )}
                <div
                  className="relative h-full w-full overflow-hidden rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${getImageRoleColor(ref.role)}` }}
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
                      referenceDragRef.current = null;
                      isDraggingRef.current = false;
                      setDraggingRefId(null);
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    onClickCapture={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onRemoveReference(ref.nodeId);
                    }}
                    onDragStart={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    className="nodrag nowheel absolute right-0 top-0 z-30 hidden items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black group-hover/ref:flex"
                    style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                    title="删除引用"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Expand */}
        <button
          onClick={() => setPromptExpanded((value) => !value)}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ width: 32, height: 32, color: promptExpanded ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
          title={promptExpanded ? '收起提示词框' : '展开提示词框'}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Prompt input */}
      <div style={{ padding: '4px 14px 12px' }}>
        <div className="relative">
          {imageReferenceBlocks.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {imageReferenceBlocks.map((block) => {
                const reference = references.find((item) => item.nodeId === block.sourceNodeId);
                const previewImage = reference?.imageUrl || block.thumbnailUrl;
                const highlighted = highlightedPromptBlockId === block.id;
                const hovered = hoveredPromptBlockId === block.id;
                const usageColor = getImageRoleColor(reference?.role ?? null);
                const isEditing = editingPromptBlockId === block.id;
                const displayPromptText = stripReferencePromptMetadata(block.promptText);

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
                    className={`group/prompt-ref relative inline-flex max-w-full items-center rounded-lg border px-1.5 py-1 text-[12px] transition-all ${isEditing ? 'w-full flex-wrap gap-1.5' : 'gap-1.5'}`}
                    style={{
                      background: hovered || highlighted ? 'rgba(255,255,255,0.052)' : 'rgba(255,255,255,0.035)',
                      borderColor: highlighted ? `${usageColor}66` : hovered ? `${usageColor}52` : 'rgba(255,255,255,0.10)',
                      boxShadow: 'none',
                      color: 'rgba(255,255,255,0.82)',
                    }}
                  >
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
                        color: 'rgba(255,255,255,0.72)',
                        background: 'rgba(255,255,255,0.045)',
                        border: `1px solid ${hovered || highlighted ? `${usageColor}52` : `${usageColor}38`}`,
                      }}
                    >
                      {block.usage}
                    </span>
                    {isEditing ? (
                      <>
                        <textarea
                          value={editingPromptText}
                          onChange={(event) => setEditingPromptText(event.target.value)}
                          onPointerDown={(event) => event.stopPropagation()}
                          className="basis-full resize-none rounded-md px-2 py-1.5 text-[12px] leading-5 outline-none nowheel"
                          style={{
                            minHeight: 74,
                            background: 'rgba(255,255,255,0.07)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.86)',
                          }}
                        />
                        <div className="flex basis-full justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelEditPromptReferenceBlock();
                            }}
                            className="rounded-md px-2 py-1 text-[12px] transition-colors hover:bg-white/10"
                            style={{ color: 'rgba(255,255,255,0.58)' }}
                          >
                            取消
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              savePromptReferenceBlock(block.id);
                            }}
                            className="rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:brightness-110"
                            style={{ background: 'rgba(0,212,255,0.16)', color: '#ffffff', border: '1px solid rgba(0,212,255,0.35)' }}
                          >
                            保存
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className="min-w-0 truncate" style={{ maxWidth: 360, color: 'rgba(255,255,255,0.62)' }}>{displayPromptText}</span>
                    )}
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditPromptReferenceBlock(block);
                        }}
                        className="ml-0.5 hidden h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 group-hover/prompt-ref:flex"
                        style={{ color: 'rgba(255,255,255,0.58)' }}
                        title="编辑图片引用提示词"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        removePromptReferenceBlock(block.id);
                      }}
                      className={`ml-0.5 h-4 w-4 flex-shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 ${isEditing ? 'hidden' : 'hidden group-hover/prompt-ref:flex'}`}
                      style={{ color: 'rgba(255,255,255,0.58)' }}
                      title="删除图片引用"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    {!isEditing && (
                      <div
                        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden rounded-xl px-3 py-2 text-left group-hover/prompt-ref:block"
                        style={{
                          width: 300,
                          background: FLOATING_PANEL_BACKGROUND,
                          border: FLOATING_PANEL_BORDER,
                          boxShadow: '0 16px 34px rgba(0,0,0,0.5)',
                        }}
                      >
                        <div>
                          <div className="text-[12px] font-medium leading-5" style={{ color: 'rgba(255,255,255,0.78)' }}>{block.usage}</div>
                          <div className="mt-1 max-h-28 overflow-y-auto pr-1 text-[12px] leading-5 nowheel" style={{ color: 'rgba(255,255,255,0.62)' }}>{displayPromptText}</div>
                        </div>
                      </div>
                    )}
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
            placeholder="描述你想要生成的画面内容，按/呼出指令，@引用素材"
            className="w-full bg-transparent resize-none outline-none placeholder:text-[rgba(255,255,255,0.38)] nowheel"
            style={{ color: 'rgba(255,255,255,0.94)', fontSize: 14, lineHeight: 1.58, minHeight: promptExpanded ? 176 : 104 }}
            rows={promptExpanded ? 7 : 4}
            onPointerDown={(e) => e.stopPropagation()}
          />
          {/* Slash menu */}
          {showSlashMenu && (
            <div
              className="absolute left-0 z-40 overflow-hidden rounded-xl py-1"
              style={{
                top: 0,
                width: 260,
                maxHeight: 240,
                overflowY: 'auto',
                background: FLOATING_PANEL_BACKGROUND,
                border: FLOATING_PANEL_BORDER,
                boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              {(() => {
                if (slashFilteredPresets.length === 0) {
                  return <div className="px-3 py-2 text-[13px] text-white/40">无匹配预设</div>;
                }
                return slashFilteredPresets.map((preset, index) => (
                  <button
                    key={preset.id}
                    onClick={() => insertSlashPreset(preset.id)}
                    onMouseEnter={() => setSlashIndex(index)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${index === slashIndex ? 'bg-white/8' : 'hover:bg-white/5'}`}
                  >
                    <span className="text-[13px] text-white/90">{preset.name}</span>
                    <span className="text-[11px] text-white/40">{preset.shortDescription}</span>
                  </button>
                ));
              })()}
            </div>
          )}
          {showReferenceMenu && references.length > 0 && (
            <div
              className="absolute left-0 top-7 z-40 overflow-hidden rounded-xl py-1"
              style={{
                width: 260,
                background: FLOATING_PANEL_BACKGROUND,
                border: FLOATING_PANEL_BORDER,
                boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
              }}
            >
              {references.map((reference, index) => (
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
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{reference.roleLabel || '未定义用途'}</span>
                </button>
              ))}
            </div>
          )}
          {pendingReference && (
            <div
              className="absolute left-0 top-7 z-40 overflow-hidden rounded-xl py-1"
              style={{
                width: 260,
                maxHeight: 300,
                overflowY: 'auto',
                background: FLOATING_PANEL_BACKGROUND,
                border: FLOATING_PANEL_BORDER,
                boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
              }}
              onWheel={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.58)' }}>选择图片用途</div>
              {imageRoleOptions.map((option) => {
                const RoleIcon = option.Icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => {
                      if (option.value === 'custom_reference') {
                        setPendingCustomInput(true);
                        setPendingCustomValue('');
                        return;
                      }
                      handleReferenceRoleSelect(option.value);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-[14px] transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(255,255,255,0.86)' }}
                  >
                    <RoleIcon className="h-4 w-4" style={{ color: option.color }} />
                    {option.label}
                  </button>
                );
              })}
              {pendingCustomInput && (
                <div className="px-3 py-2">
                  <input
                    ref={pendingCustomInputRef}
                    value={pendingCustomValue}
                    onChange={(event) => setPendingCustomValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        submitPendingCustomRole();
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault();
                        setPendingCustomInput(false);
                      }
                    }}
                    onBlur={submitPendingCustomRole}
                    placeholder="这张图主要参考什么？例如：铺装 / 水景 / 入口 / 栏杆"
                    className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom params bar */}
      <div className="flex items-center justify-between" style={{ padding: '4px 14px 14px' }}>
        <div className="flex items-center gap-4">
          {/* Model */}
          <div className="relative">
            <button onClick={() => { setShowModelMenu(!showModelMenu); setShowRatioMenu(false); setShowCountMenu(false); }} className="flex items-center gap-1.5 transition-colors hover:text-white" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ color: 'rgba(255,255,255,0.72)' }}>×</span>
              <span className="truncate" style={{ maxWidth: 150 }}>{selectedModel.name}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {showModelMenu && (
              <div className="absolute bottom-full left-0 mb-1 py-1 rounded-lg z-30 overflow-hidden" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 190 }}>
                {MODEL_OPTIONS.map((m) => (
                  <button key={m.name} onClick={() => { onModelParamsChange({ ...modelParams, model: m.name }); setShowModelMenu(false); }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 text-left transition-colors ${modelParams.model === m.name ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                    <span className="flex-shrink-0 flex items-center justify-center rounded text-[8px] font-bold text-white" style={{ width: 18, height: 18, background: m.iconBg }}>{m.icon}</span>
                    <span className="text-[13px] text-white/85">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Ratio · Resolution */}
          <div className="relative">
            <button onClick={() => { setShowRatioMenu(!showRatioMenu); setShowModelMenu(false); setShowCountMenu(false); }} className="flex items-center gap-1.5 transition-colors hover:text-white" style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>
              <Maximize2 className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.68)' }} />
              <span>{modelParams.ratio} · {modelParams.resolution}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {showRatioMenu && (
              <div className="absolute bottom-full left-0 mb-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 16px 34px rgba(0,0,0,0.48)', width: 326, padding: 8 }}>
                <div className="pb-2">
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>分辨率</div>
                  <div className="grid grid-cols-3 gap-2">
                    {RESOLUTION_OPTIONS.map((r) => (
                      <button
                        key={r}
                        onClick={() => onModelParamsChange({ ...modelParams, resolution: r })}
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
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>比例</div>
                  <div className="grid grid-cols-5 gap-2">
                    {RATIO_OPTIONS.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => { onModelParamsChange({ ...modelParams, ratio: ar.value }); setShowRatioMenu(false); }}
                        className="flex h-[64px] flex-col items-center justify-center gap-2 rounded-md transition-colors"
                        style={{
                          color: modelParams.ratio === ar.value ? '#ffffff' : 'rgba(255,255,255,0.58)',
                          background: 'rgba(255,255,255,0.035)',
                          border: modelParams.ratio === ar.value ? '1px solid rgba(255,255,255,0.9)' : FLOATING_PANEL_BORDER,
                        }}
                      >
                        <div className="border border-current rounded-[2px]" style={{ width: ar.icon === 'portrait' ? 9 : ar.icon === 'landscape' ? 14 : ar.icon === 'ultrawide' ? 17 : 11, height: ar.icon === 'portrait' ? 15 : ar.icon === 'landscape' ? 8 : ar.icon === 'ultrawide' ? 5 : 11, opacity: 0.78 }} />
                        <span className="text-[13px]">{ar.value}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Generate button */}
        <div className="relative flex items-center gap-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: FLOATING_PANEL_BORDER, padding: '5px 6px 5px 12px' }}>
          <button
            onClick={() => { setShowCountMenu(!showCountMenu); setShowModelMenu(false); setShowRatioMenu(false); }}
            className="flex items-center gap-1 transition-colors hover:text-white"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
          >
            {modelParams.count}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          {showCountMenu && (
            <div className="absolute bottom-full right-10 mb-2 py-1 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', minWidth: 80 }}>
              {COUNT_OPTIONS.map((c) => (
                <button key={c} onClick={() => { onModelParamsChange({ ...modelParams, count: c }); setShowCountMenu(false); }} className={`w-full px-3 py-2 text-left text-[14px] transition-colors ${modelParams.count === c ? 'text-white bg-white/10' : 'text-white/75 hover:bg-white/5'}`}>{c}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.62)' }}>
            <Zap className="w-3.5 h-3.5" />
            <span style={{ fontSize: 15 }}>14</span>
          </div>
          <button
            onClick={onGenerate}
            disabled={!canGenerate}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 34,
              height: 34,
              background: canGenerate ? '#ffffff' : 'rgba(255,255,255,0.14)',
              opacity: canGenerate ? 1 : 0.45,
            }}
            title="生成"
          >
            <ArrowUp className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
      <StylePickerModal
        open={showStylePicker}
        selectedStyleId={selectedStyleId}
        onApply={onStyleChange}
        onClose={() => setShowStylePicker(false)}
      />
    </div>
  );
}
