import { useState, useCallback, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  Pencil,
} from 'lucide-react';
import type {
  PromptContent,
  ImageReferencePromptBlock,
  ReferenceInfo,
  ImageRole,
  PresetItem,
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
import { UNIQUE_USAGES, imageRoleOptions, getImageRoleLabel, getImageRoleColor, validateCustomReferenceLabel } from '../../constants/imageUsages';
import {
  PRESET_DATA,
  getPresetById,
  getStylePresetById,
} from '../../constants/presets';
import { createImageReferenceBlock, stripReferencePromptMetadata } from '../../utils/promptUtils';
import { areReferenceListsEqual, hasDefinedUsage } from '../../utils/referenceUtils';
import { togglePresetSelection } from '../../utils/presetSelection';
import { StylePickerModal } from '../../components/StylePickerModal';
import { PresetPickerModal } from '../../components/PresetPickerModal';

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
  isGenerating,
  generationTask,
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
  onGenerate: () => void | Promise<void>;
  canGenerate: boolean;
  isGenerating?: boolean;
  generationTask?: { status: string; progress: number; errorMessage: string | null } | null;
  references: ReferenceInfo[];
  onRemoveReference: (nodeId: string) => void;
  onReorderReferences: (newOrder: string[]) => void;
  onUseReference: (reference: ReferenceInfo) => void;
  onAssignReferenceRole: (nodeId: string, role: ImageRole, customRoleLabel?: string) => ReferenceInfo | null;
  showToast?: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const [showMarkPanel, setShowMarkPanel] = useState(false);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [showStylePicker, setShowStylePicker] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCountMenu, setShowCountMenu] = useState(false);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [pendingReference, setPendingReference] = useState<ReferenceInfo | null>(null);
  const [pendingCustomInput, setPendingCustomInput] = useState(false);
  const [pendingCustomValue, setPendingCustomValue] = useState('');
  const [usageConflict, setUsageConflict] = useState<{
    role: ImageRole;
    customRoleLabel?: string;
    conflictingRef: ReferenceInfo;
  } | null>(null);
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
  const pendingUsageMenuRef = useRef<HTMLDivElement>(null);
  const promptBlockRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const customUsageSuggestions = ['\u94fa\u88c5\u53c2\u8003', '\u6c34\u666f\u53c2\u8003', '\u7acb\u9762\u706f\u5149', '\u5ba4\u5185\u5bb6\u5177'];
  const customUsagePlaceholderProps: Record<string, string> = { placeholder: '\u8f93\u5165\u81ea\u5b9a\u4e49\u7528\u9014' };

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
  const selectedPresetItems = useMemo(
    () =>
      selectedPresets
        .map((presetId) => getPresetById(presetId))
        .filter((preset): preset is PresetItem => Boolean(preset)),
    [selectedPresets],
  );
  const selectedPresetCount = selectedPresetItems.length;

  const removeSelectedPreset = useCallback((presetId: string) => {
    onPresetsChange(selectedPresets.filter((id) => id !== presetId));
  }, [onPresetsChange, selectedPresets]);

  const slashFilteredPresets = useMemo(() => {
    const query = slashQuery.trim().toLowerCase();
    const presetPool = PRESET_DATA.filter((preset) => preset.category !== 'style' && preset.tabs.length > 0);
    if (!query) return presetPool;

    return presetPool.filter(
      (preset) =>
        preset.name.toLowerCase().includes(query) ||
        preset.tags.some((tag) => tag.toLowerCase().includes(query)),
    );
  }, [slashQuery]);

  const selectPreset = (presetId: string) => {
    onPresetsChange(togglePresetSelection(selectedPresets, presetId));
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
    setUsageConflict(null);
  };

  useEffect(() => {
    if (!pendingReference) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && pendingUsageMenuRef.current?.contains(target)) {
        return;
      }
      closeReferenceMenus();
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeReferenceMenus();
      }
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [pendingReference]);

  useEffect(() => {
    const referencesById = new Map(references.map((reference) => [reference.nodeId, reference]));
    let changed = false;
    const nextContent = promptContent.flatMap((block) => {
      if (block.type !== 'image_reference') return block;
      const reference = referencesById.get(block.sourceNodeId);
      if (!reference) {
        changed = true;
        return [];
      }
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

  const applyReferenceRole = (reference: ReferenceInfo, role: ImageRole, customRoleLabel?: string, insertPromptBlock = true) => {
    const roleLabel = getImageRoleLabel(role, customRoleLabel);
    const updatedReference = onAssignReferenceRole(reference.nodeId, role, customRoleLabel) || { ...reference, role, roleLabel, customRoleLabel };
    onUseReference(updatedReference);
    if (insertPromptBlock) {
      insertReferenceBlock(updatedReference);
    } else {
      removePendingAtMarker();
      closeReferenceMenus();
    }
    return updatedReference;
  };

  const handleReferenceRoleSelect = (role: ImageRole, customRoleLabel?: string) => {
    if (!pendingReference) return;
    // 检查唯一用途冲突
    if (UNIQUE_USAGES.includes(role)) {
      const conflictingRef = references.find((ref) => ref.nodeId !== pendingReference.nodeId && ref.role === role);
      if (conflictingRef) {
        setUsageConflict({ role, customRoleLabel, conflictingRef });
        return;
      }
    }
    applyReferenceRole(pendingReference, role, customRoleLabel);
  };

  const replaceConflictingReference = () => {
    if (!pendingReference || !usageConflict) return;
    const oldBlock = imageReferenceBlocks.find((block) => block.sourceNodeId === usageConflict.conflictingRef.nodeId);
    onRemoveReference(usageConflict.conflictingRef.nodeId);
    const updatedReference = applyReferenceRole(pendingReference, usageConflict.role, usageConflict.customRoleLabel, false);
    if (!oldBlock) return;
    const nextBlock = createImageReferenceBlock(updatedReference);
    onPromptContentChange(
      promptContent.map((item) =>
        item.type === 'image_reference' && item.sourceNodeId === usageConflict.conflictingRef.nodeId
          ? nextBlock
          : item,
      ),
    );
    setHighlightedPromptBlockId(nextBlock.id);
    window.setTimeout(() => {
      setHighlightedPromptBlockId((currentId) => (currentId === nextBlock.id ? null : currentId));
    }, 900);
  };

  const submitPendingCustomRole = () => {
    const existingCustomLabels = references
      .filter((ref) => ref.role === 'custom_reference' && ref.nodeId !== pendingReference?.nodeId)
      .map((ref) => ref.customRoleLabel || ref.roleLabel);
    const result = validateCustomReferenceLabel(pendingCustomValue, existingCustomLabels);
    if (!result.ok) {
      showToast?.(result.message);
      return;
    }
    handleReferenceRoleSelect('custom_reference', result.label);
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

  const stopControlContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const openStylePicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
                    openStylePicker(event);
  };

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
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Top toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 14px 8px' }}>
        <div className="flex items-center gap-2">
          {/* Preset */}
          <div className="relative">
            <button
              onClick={() => { setShowPresetModal(true); setShowMarkPanel(false); setShowStylePicker(false); }}
              className="relative flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/[0.07]"
              style={{
                width: 54,
                height: 50,
                padding: '4px',
                background: selectedPresetCount > 0 ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                border: selectedPresetCount > 0 ? '1px solid rgba(255,255,255,0.34)' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: selectedPresetCount > 0 ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none',
              }}
            >
              <Bookmark className="w-4 h-4" style={{ color: selectedPresetCount > 0 ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.50)' }} />
              <span style={{ fontSize: 12, color: selectedPresetCount > 0 ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.56)' }}>{t('imageNode.preset')}</span>
            </button>
            {showPresetModal && (
              <PresetPickerModal
                open={showPresetModal}
                selectedPresetIds={selectedPresets}
                onApply={onPresetsChange}
                onClose={() => setShowPresetModal(false)}
              />
            )}
          </div>
          {/* Mark */}
          <div className="relative">
            <button
              onClick={() => { setShowMarkPanel(!showMarkPanel); setShowStylePicker(false); }}
              className="flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/5"
              style={{ width: 54, height: 50, padding: '4px', background: marks.length > 0 ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)', border: FLOATING_PANEL_BORDER }}
            >
              <MapPin className="w-4 h-4" style={{ color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.7)' }} />
              <span style={{ fontSize: 12, color: marks.length > 0 ? '#f59e0b' : 'rgba(255,255,255,0.72)' }}>{t('imageNode.mark')}</span>
            </button>
            {showMarkPanel && (
              <div className="absolute top-full left-0 mt-1 p-2 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 220 }}>
                <div className="text-[12px] text-white/55 mb-2">{t('imageNode.addElementMark')}</div>
                <input value={markName} onChange={(e) => setMarkName(e.target.value)} placeholder={t('imageNode.elementNamePlaceholder')} className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <select value={markAction} onChange={(e) => setMarkAction(e.target.value as MarkAction)} className="w-full bg-transparent text-[13px] mb-2 outline-none" style={{ color: 'rgba(255,255,255,0.9)', background: FLOATING_PANEL_BACKGROUND }} onPointerDown={(e) => e.stopPropagation()}>
                  {Object.entries(MARK_ACTION_LABELS).map(([key]) => (<option key={key} value={key}>{t(`mark.${key}`)}</option>))}
                </select>
                <input value={markDesc} onChange={(e) => setMarkDesc(e.target.value)} placeholder={t('imageNode.actionDescPlaceholder')} className="w-full bg-transparent outline-none text-[13px] mb-2" style={{ color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.12)' }} onPointerDown={(e) => e.stopPropagation()} />
                <button onClick={addMark} className="w-full text-center text-[12px] py-1.5 rounded bg-white/10 text-white/90 hover:bg-white/15 transition-colors">{t('imageNode.add')}</button>
                {marks.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {marks.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-[12px]">
                        <span style={{ color: MARK_ACTION_COLORS[m.action] }}>@{m.name}（{t(`mark.${m.action}`)}）</span>
                        <button onClick={() => removeMark(m.id)} className="text-white/30 hover:text-white/60">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Style */}
          <div className="relative">
            <button
              onClick={() => {
                setShowStylePicker(true);
                setShowMarkPanel(false);
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                setShowStylePicker(true);
                setShowMarkPanel(false);
              }}
              className="group/style-btn relative flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors hover:bg-white/[0.07]"
              style={{
                width: 54,
                height: 50,
                padding: selectedStyle ? 0 : '4px',
                background: selectedStyle ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)',
                border: selectedStyle ? '1px solid rgba(255,255,255,0.34)' : '1px solid rgba(255,255,255,0.10)',
                boxShadow: selectedStyle ? 'inset 0 0 0 1px rgba(255,255,255,0.08)' : 'none',
                opacity: 1,
              }}
              title={t('style.selectStyle')}
            >
              {selectedStyle ? (
                <span className="pointer-events-none h-full w-full overflow-hidden rounded-lg">
                  <img src={selectedStyle.coverImage} alt="" className="h-full w-full object-cover opacity-90" draggable={false} />
                </span>
              ) : (
                <>
                  <Palette className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.50)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.56)' }}>{t('imageNode.style')}</span>
                </>
              )}
              {selectedStyle && (
                <div className="pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-[210px] rounded-xl p-2.5 text-left group-hover/style-btn:block" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 14px 32px rgba(0,0,0,0.46)' }}>
                  <div className="text-[12px] font-medium text-white/90">{selectedStyle.title}</div>
                  <div className="mt-1 text-[11px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.56)' }}>{selectedStyle.shortDescription}</div>
                  <div className="mt-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.72)' }}>{t('imageNode.clickToChangeStyle')}</div>
                </div>
              )}
            </button>
          </div>
          {/* Reference thumbnails — supports drag sorting */}
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
                    className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 rounded-xl group-hover/ref:block"
                    style={{
                      background: FLOATING_PANEL_BACKGROUND,
                      border: FLOATING_PANEL_BORDER,
                      boxShadow: '0 14px 32px rgba(0,0,0,0.48)',
                    }}
                  >
                    <img
                      src={ref.imageUrl}
                      alt=""
                      className="block rounded-t-xl"
                      style={{
                        width: 'auto',
                        height: 'auto',
                        maxWidth: 220,
                        maxHeight: 200,
                      }}
                    />
                    <div className="px-2 py-1.5 text-[12px] text-center" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {ref.roleLabel || t('imageNode.undefinedUsage')}
                    </div>
                  </div>
                )}
                <div
                  className="relative h-full w-full overflow-hidden rounded-lg"
                  style={{
              background: ref.role === 'undefined_usage' ? 'rgba(156,163,175,0.08)' : 'rgba(255,255,255,0.04)',
              border: ref.role === 'undefined_usage' ? '1px solid rgba(156,163,175,0.20)' : `1px solid ${getImageRoleColor(ref.role)}`,
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
                    title={t('imageNode.removeReference')}
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
          title={promptExpanded ? t('imageNode.collapsePrompt') : t('imageNode.expandPrompt')}
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {selectedPresetItems.length > 0 && (
        <div className="px-3.5 pb-1">
          <div
            className="flex min-w-0 items-center gap-1.5 overflow-x-auto overscroll-contain rounded-lg px-2 py-1.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <span className="shrink-0 text-[12px]" style={{ color: 'rgba(255,255,255,0.42)' }}>已选预设：</span>
            {selectedPresetItems.map((preset) => (
              <span
                key={preset.id}
                className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-white/[0.14] bg-white/[0.06] px-2 text-[12px] text-white/[0.72] transition-colors hover:border-white/[0.22] hover:bg-white/[0.09] hover:text-white/[0.86]"
              >
                {preset.title || preset.name}
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSelectedPreset(preset.id);
                  }}
                  className="flex h-4 w-4 items-center justify-center rounded-full text-white/[0.45] transition-colors hover:bg-white/10 hover:text-white/[0.70]"
                  title={`移除${preset.title || preset.name}`}
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
                            {t('common.cancel')}
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
                            {t('common.save')}
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
                        title={t('imageNode.editReferencePrompt')}
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
                      title={t('imageNode.removeReferencePrompt')}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                    {!isEditing && (
                      <div
                        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden rounded-xl text-left group-hover/prompt-ref:block"
                        style={{
                          background: FLOATING_PANEL_BACKGROUND,
                          border: FLOATING_PANEL_BORDER,
                          boxShadow: '0 16px 34px rgba(0,0,0,0.5)',
                        }}
                      >
                        {previewImage && (
                          <img
                            src={previewImage}
                            alt=""
                            className="block rounded-t-xl"
                            style={{ width: 'auto', height: 'auto', maxWidth: 240, maxHeight: 220 }}
                          />
                        )}
                        <div className="px-2 py-1.5 text-center text-[12px] font-medium leading-5" style={{ color: 'rgba(255,255,255,0.78)' }}>{block.usage}</div>
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
            placeholder={t('imageNode.promptPlaceholder')}
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
                  return <div className="px-3 py-2 text-[13px] text-white/40">{t('imageNode.noMatchingPreset')}</div>;
                }
                return slashFilteredPresets.map((preset, index) => (
                  <button
                    key={preset.id}
                    onClick={() => insertSlashPreset(preset.id)}
                    onMouseEnter={() => setSlashIndex(index)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors ${index === slashIndex ? 'bg-white/8' : 'hover:bg-white/5'}`}
                  >
                    <span className="text-[13px] text-white/90">{t(`preset.${preset.id}.name`)}</span>
                    <span className="text-[11px] text-white/40">{t(`preset.${preset.id}.shortDescription`)}</span>
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
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{reference.roleLabel || t('imageNode.undefinedUsage')}</span>
                </button>
              ))}
            </div>
          )}
          {pendingReference && (
            <div
              ref={pendingUsageMenuRef}
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
              <div className="px-3 py-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.58)' }}>{t('imageNode.selectImagePurpose')}</div>
              {usageConflict && (
                <div className="mx-2 mb-1 rounded-lg p-2" style={{ background: 'rgba(255,255,255,0.055)', border: '1px solid rgba(255,255,255,0.10)' }}>
                  <div className="text-[12px] leading-5" style={{ color: 'rgba(255,255,255,0.72)' }}>
                    {t('imageNode.usageConflictTitle', { role: getImageRoleLabel(usageConflict.role, usageConflict.customRoleLabel) })}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <button
                      type="button"
                      onClick={replaceConflictingReference}
                      className="rounded-md px-2 py-1 text-[12px] font-medium transition-colors hover:bg-white/15"
                      style={{ color: '#ffffff', background: 'rgba(255,255,255,0.10)' }}
                    >
                      {t('common.replace')}
                    </button>
                    <button
                      type="button"
                      onClick={closeReferenceMenus}
                      className="rounded-md px-2 py-1 text-[12px] transition-colors hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.62)' }}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsageConflict(null)}
                      className="rounded-md px-2 py-1 text-[12px] transition-colors hover:bg-white/10"
                      style={{ color: 'rgba(255,255,255,0.62)' }}
                    >
                      {t('imageNode.changeUsage')}
                    </button>
                  </div>
                </div>
              )}
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
                    placeholder={t('imageNode.customPurposePlaceholder')}
                    {...customUsagePlaceholderProps}
                    className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  />
                  <div className="mt-2 text-[11px] leading-4" style={{ color: 'rgba(255,255,255,0.46)' }}>
                    {t('reference.customReferenceDesc')}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customUsageSuggestions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setPendingCustomValue(label)}
                        className="rounded-md px-1.5 py-0.5 text-[10px] transition-colors hover:bg-white/12"
                        style={{
                          background: 'rgba(255,255,255,0.055)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.64)',
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
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
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('imageNode.resolution')}</div>
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
                  <div className="text-[14px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('imageNode.ratio')}</div>
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
        <div className="relative flex items-center gap-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: FLOATING_PANEL_BORDER, padding: '5px 6px 5px 12px' }}>
          <button
            onClick={() => { setShowCountMenu(!showCountMenu); setShowModelMenu(false); setShowRatioMenu(false); }}
            className="flex items-center gap-1 transition-colors hover:text-white"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}
          >
            {t(`imageNode.countValue.${modelParams.count}`, { defaultValue: modelParams.count })}
            <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>
          {showCountMenu && (
            <div className="absolute bottom-full right-10 mb-2 py-1 rounded-lg z-30" style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', minWidth: 80 }}>
              {COUNT_OPTIONS.map((c) => (
                <button key={c} onClick={() => { onModelParamsChange({ ...modelParams, count: c }); setShowCountMenu(false); }} className={`w-full px-3 py-2 text-left text-[14px] transition-colors ${modelParams.count === c ? 'text-white bg-white/10' : 'text-white/75 hover:bg-white/5'}`}>{t(`imageNode.countValue.${c}`, { defaultValue: c })}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.62)' }}>
            <Zap className="w-3.5 h-3.5" />
            <span style={{ fontSize: 15 }}>14</span>
          </div>
          {generationTask?.status === 'failed' && generationTask.errorMessage ? (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className="flex items-center justify-center gap-1 rounded-lg transition-colors"
              style={{
                height: 34,
                padding: '0 10px',
                background: 'rgba(239,68,68,0.16)',
                border: '1px solid rgba(239,68,68,0.35)',
                color: '#fca5a5',
                fontSize: 12,
                opacity: isGenerating ? 0.5 : 1,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
              }}
              title={generationTask.errorMessage}
            >
              <span className="truncate" style={{ maxWidth: 120 }}>{t('imageNode.generationFailed')}</span>
              <span className="text-white/60">·</span>
              <span className="text-white/80 hover:text-white">{t('imageNode.retry')}</span>
            </button>
          ) : (
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
        open={showStylePicker}
        selectedStyleId={selectedStyleId}
        onApply={onStyleChange}
        onClose={() => setShowStylePicker(false)}
      />
    </div>
  );
}
