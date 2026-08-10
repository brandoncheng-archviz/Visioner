import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  Image,
  X,
  ChevronDown,
  ArrowUp,
  Maximize2,
  ScanSearch,
  ImagePlus,
  Zap,
  Check,
  Lock,
  Unlock,
  SunMedium,
} from 'lucide-react';
import type {
  PromptContent,
  ImageReferencePromptBlock,
  ImageMarkReferencePromptBlock,
  ReferenceInfo,
} from '../../types/imageNode.types';
import type { ModelParams } from '../../types/canvas.types';
import type { TextReferenceInfo } from '../../types/basicNode.types';
import type { LightPreviewData } from '../../types/lightPreview.types';
import type { CameraControlData, ExteriorRenderWorkflowSource } from '../../types/imageNodeData.types';
import {
  FLOATING_PANEL_BACKGROUND,
  FLOATING_PANEL_BORDER,
  IMAGE_NODE_CONTROL_WIDTH,
  IMAGE_NODE_CONTROL_HEIGHT,
  IMAGE_NODE_CONTROL_EXPANDED_HEIGHT,
  MAX_REFERENCE_IMAGES_PER_NODE,
  RECOMMENDED_REFERENCE_IMAGES_PER_NODE,
} from '../../constants/canvasConstants';
import { IMAGE_MODEL_OPTIONS, getImageModelOption, type ImageModelResolution } from '../../constants/imageModelOptions';
import { getImageRoleLabel, getImageRoleColor } from '../../constants/imageUsages';
import { createImageReferenceBlock, stripReferencePromptMetadata } from '../../utils/promptUtils';
import {
  getReferenceUsageSortRank,
  sortReferencesByUsage,
} from '../../utils/referenceUtils';
import { formatReferenceLimitIssue, getReferenceLimitIssueForGenerate } from '../../utils/referenceLimits';
import { ModelAspectRatioOptions } from '../../components/ModelAspectRatioOptions';
import { ModelParamsSummaryButton } from '../../components/ModelParamsSummaryButton';
import {
  calculateRequestedSize,
  commitTargetSizeDraft,
  doesSizeMatchAspectRatio,
  getResolutionTier,
  isFixedAspectRatioPreset,
  isValidCustomAspectRatio,
  parseAspectRatio,
  updateTargetSizeDraft,
  validateRequestedSize,
  type AspectRatioPreset,
} from '../../utils/modelParams';
import { ImageNodeWorkflowSourceBadge } from './ImageNodeWorkflowSourceBadge';
import { CameraControlPopover } from './CameraControlPopover';
import { CameraPositionIcon } from './CameraPositionIcon';
import { CameraControlPreview } from './CameraControlPreview';
import { isCameraPopoverWheelEvent } from './cameraControlEvents';
import { ImageLightingControlPopover } from './ImageLightingControlPopover';

const GENERATION_CONTROL_BUTTON_CLASS =
  'border-[rgba(148,163,184,0.28)] bg-transparent text-[rgba(203,213,225,0.68)] hover:border-[rgba(148,163,184,0.55)] hover:bg-[rgba(148,163,184,0.08)] hover:text-[#CBD5E1]';
const GENERATION_CONTROL_BUTTON_DISABLED_CLASS =
  'border-[rgba(148,163,184,0.14)] bg-transparent text-[rgba(203,213,225,0.62)]';
const NODE_CONTROL_PANEL_BACKGROUND = '#1e1e1e';
const resizePromptReferenceTextarea = (element: HTMLTextAreaElement) => {
  const oneLineHeight = 24;
  const twoLineHeight = 44;
  const computedStyle = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(computedStyle.lineHeight) || 20;
  const verticalPadding = Number.parseFloat(computedStyle.paddingTop) + Number.parseFloat(computedStyle.paddingBottom);
  const oneLineContentHeight = lineHeight + verticalPadding;

  element.style.minHeight = '0px';
  element.style.maxHeight = 'none';
  element.style.height = '0px';
  const contentHeight = element.scrollHeight;
  const nextHeight = contentHeight > oneLineContentHeight + 1 ? twoLineHeight : oneLineHeight;

  element.style.minHeight = `${oneLineHeight}px`;
  element.style.maxHeight = `${twoLineHeight}px`;
  element.style.height = `${nextHeight}px`;
  element.style.overflowY = contentHeight > element.clientHeight ? 'auto' : 'hidden';
};
const GENERATION_CREDIT_COST = 14;
function getBoundedImagePreviewSize(width: number | undefined, height: number | undefined, maxWidth: number, maxHeight: number) {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

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
  workflowSource,
  onFocusWorkflowSource,
  modelParams,
  onModelParamsChange,
  cameraControl,
  onCameraControlChange,
  onGenerate,
  canGenerate,
  canEditPrompt,
  canEditPromptReferences,
  canEditLighting,
  canEditModel,
  canDeleteReference,
  canCreateMarks,
  isMarkModeActive,
  canSelectCanvasReference,
  isCanvasReferenceSelectionModeActive,
  isGenerating,
  generationTask,
  textReferences,
  onFocusTextReference,
  currentImageSize,
  references,
  onRemoveReference,
  onUseReference,
  onStartMarkMode,
  onStartCanvasReferenceSelection,
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
  workflowSource?: ExteriorRenderWorkflowSource;
  onFocusWorkflowSource?: (sourceNodeId: string) => void;
  modelParams: ModelParams;
  onModelParamsChange: (params: ModelParams) => void;
  cameraControl?: CameraControlData;
  onCameraControlChange: (value: CameraControlData) => void;
  onGenerate: () => void | Promise<void>;
  canGenerate: boolean;
  canEditPrompt: boolean;
  canEditPromptReferences: boolean;
  canEditLighting: boolean;
  canEditModel: boolean;
  canDeleteReference: boolean;
  canCreateMarks: boolean;
  isMarkModeActive: boolean;
  canSelectCanvasReference: boolean;
  isCanvasReferenceSelectionModeActive: boolean;
  isGenerating?: boolean;
  generationTask?: { status: string; progress: number; errorMessage: string | null } | null;
  textReferences: TextReferenceInfo[];
  onFocusTextReference: (nodeId: string) => void;
  currentImageSize?: { width?: number; height?: number } | null;
  autoOpenLightPanel?: boolean;
  onAcknowledgeAutoOpen?: () => void;
  references: ReferenceInfo[];
  onRemoveReference: (nodeId: string) => void;
  onUseReference: (reference: ReferenceInfo) => void;
  onStartMarkMode: () => void;
  onStartCanvasReferenceSelection: () => void;
  onUpdateMarkCandidate: (markId: string, candidateId: string) => void;
  showToast?: (msg: string) => void;
}) {
  const { t } = useTranslation();
  const translate = useCallback((key: string) => t(key), [t]);
  const [showLightPreview, setShowLightPreview] = useState(false);
  const [lightingButtonElement, setLightingButtonElement] = useState<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (autoOpenLightPanel && canEditLighting) {
      const timer = setTimeout(() => {
        setShowLightPreview(true);
        onAcknowledgeAutoOpen?.();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoOpenLightPanel, canEditLighting, onAcknowledgeAutoOpen]);

  useEffect(() => {
    if (canEditLighting) return;
    const timer = setTimeout(() => setShowLightPreview(false), 0);
    return () => clearTimeout(timer);
  }, [canEditLighting]);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [showCameraPopover, setShowCameraPopover] = useState(false);
  const [cameraButtonElement, setCameraButtonElement] = useState<HTMLButtonElement | null>(null);
  const [customFrameWidth, setCustomFrameWidth] = useState('1');
  const [customFrameHeight, setCustomFrameHeight] = useState('1');
  const [isFrameRatioLocked, setIsFrameRatioLocked] = useState(true);
  const [frameRatioMode, setFrameRatioMode] = useState<'adaptive' | 'preset' | 'custom'>(() => (
    modelParams.ratio === 'adaptive'
      ? 'adaptive'
      : isFixedAspectRatioPreset(modelParams.ratio)
        ? 'preset'
        : 'custom'
  ));
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [showReferenceMenu, setShowReferenceMenu] = useState(false);
  const [activeMarkCandidateBlockId, setActiveMarkCandidateBlockId] = useState<string | null>(null);
  const [markCandidateAnchorElement, setMarkCandidateAnchorElement] = useState<HTMLElement | null>(null);
  const [markCandidateAnchorRect, setMarkCandidateAnchorRect] = useState<DOMRect | null>(null);
  const [referencePreview, setReferencePreview] = useState<{ reference: ReferenceInfo; rect: DOMRect } | null>(null);
  const [textReferencePreview, setTextReferencePreview] = useState<{ reference: TextReferenceInfo; rect: DOMRect } | null>(null);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [highlightedPromptBlockId, setHighlightedPromptBlockId] = useState<string | null>(null);
  const [hoveredPromptBlockId, setHoveredPromptBlockId] = useState<string | null>(null);
  const [editingPromptBlockId, setEditingPromptBlockId] = useState<string | null>(null);
  const [editingMarkReferenceBlockId, setEditingMarkReferenceBlockId] = useState<string | null>(null);
  const [editingMarkPromptText, setEditingMarkPromptText] = useState('');
  const [editingMarkPromptInitialText, setEditingMarkPromptInitialText] = useState('');
  const [editingPromptText, setEditingPromptText] = useState('');
  const [editingPromptInitialText, setEditingPromptInitialText] = useState('');

  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const modelButtonRef = useRef<HTMLButtonElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const frameRatioButtonRef = useRef<HTMLButtonElement>(null);
  const frameRatioPanelRef = useRef<HTMLDivElement>(null);
  const markCandidateMenuRef = useRef<HTMLDivElement>(null);
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
      onMouseEnter={(event) => {
        if (!ref.imageUrl) return;
        setReferencePreview({ reference: ref, rect: event.currentTarget.getBoundingClientRect() });
      }}
      onMouseLeave={() => {
        setReferencePreview((current) => (current?.reference.nodeId === ref.nodeId ? null : current));
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
            setReferencePreview(null);
            onRemoveReference(ref.nodeId);
          }}
          onDragStart={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={`nodrag nowheel absolute right-0 top-0 z-30 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black ${canDeleteReference ? 'hidden group-hover/ref:flex' : 'hidden'}`}
          style={{ width: 18, height: 18, background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
          title={t('common.actions.remove')}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );

  const referencePreviewMaxImageWidth = 220;
  const referencePreviewMaxImageHeight = 180;
  const referencePreviewImageSize = referencePreview
    ? getBoundedImagePreviewSize(
        referencePreview.reference.width,
        referencePreview.reference.height,
        referencePreviewMaxImageWidth,
        referencePreviewMaxImageHeight,
      )
    : { width: referencePreviewMaxImageWidth, height: 154 };
  const referencePreviewWidth = referencePreviewImageSize.width + 12;
  const referencePreviewHeight = referencePreviewImageSize.height + 34;
  const referencePreviewGap = 8;
  const referencePreviewMargin = 12;
  const referencePreviewLeft = referencePreview
    ? Math.min(
        Math.max(referencePreviewMargin, referencePreview.rect.left),
        window.innerWidth - referencePreviewWidth - referencePreviewMargin,
      )
    : 0;
  const referencePreviewTop = referencePreview
    ? referencePreview.rect.top >= referencePreviewHeight + referencePreviewGap + referencePreviewMargin
      ? referencePreview.rect.top - referencePreviewHeight - referencePreviewGap
      : Math.min(
          referencePreview.rect.bottom + referencePreviewGap,
          window.innerHeight - referencePreviewHeight - referencePreviewMargin,
        )
    : 0;
  const referencePreviewPortal = referencePreview && referencePreview.reference.imageUrl
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[4300] overflow-hidden rounded-lg border border-white/10 bg-[#222224] p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.48)]"
          style={{
            left: referencePreviewLeft,
            top: referencePreviewTop,
            width: referencePreviewWidth,
            border: `1px solid ${getImageRoleColor(referencePreview.reference.role, referencePreview.reference.localReferenceType)}66`,
          }}
        >
          <div
            className="flex items-center justify-center overflow-hidden rounded-md bg-black/20"
            style={{
              width: referencePreviewImageSize.width,
              height: referencePreviewImageSize.height,
            }}
          >
            <img
              src={referencePreview.reference.imageUrl}
              alt=""
              draggable={false}
              className="h-full w-full object-contain"
            />
          </div>
          <div
            className="truncate px-1 pb-0.5 pt-1.5 text-center text-[12px] font-normal"
            style={{ color: 'rgba(255,255,255,0.72)' }}
          >
            {getImageRoleLabel(
              referencePreview.reference.role,
              referencePreview.reference.customRoleLabel,
              referencePreview.reference.localReferenceType,
              referencePreview.reference.localReferenceLabel,
              translate,
            ) || t('reference.roles.unassigned')}
          </div>
        </div>,
        document.body,
      )
    : null;

  const textReferencePreviewWidth = 260;
  const textReferencePreviewGap = 8;
  const textReferencePreviewMargin = 12;
  const textReferencePreviewCenterX = textReferencePreview
    ? textReferencePreview.rect.left + (textReferencePreview.rect.width / 2)
    : 0;
  const textReferencePreviewLeft = textReferencePreview
    ? Math.min(
        Math.max(textReferencePreviewMargin + (textReferencePreviewWidth / 2), textReferencePreviewCenterX),
        window.innerWidth - (textReferencePreviewWidth / 2) - textReferencePreviewMargin,
      )
    : 0;
  const shouldPlaceTextReferencePreviewAbove = textReferencePreview
    ? textReferencePreview.rect.top >= 128 + textReferencePreviewGap + textReferencePreviewMargin
    : true;
  const textReferencePreviewTop = textReferencePreview
    ? shouldPlaceTextReferencePreviewAbove
      ? textReferencePreview.rect.top - textReferencePreviewGap
      : textReferencePreview.rect.bottom + textReferencePreviewGap
    : 0;
  const textReferencePreviewPortal = textReferencePreview
    ? createPortal(
        <div
          className="pointer-events-none fixed z-[4300] rounded-xl p-3 text-left"
          style={{
            left: textReferencePreviewLeft,
            top: textReferencePreviewTop,
            width: textReferencePreviewWidth,
            transform: shouldPlaceTextReferencePreviewAbove ? 'translate(-50%, -100%)' : 'translateX(-50%)',
            background: 'rgba(8,8,10,0.98)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 14px 34px rgba(0,0,0,0.58)',
          }}
        >
          <div className="truncate text-[12px] font-medium text-white/78">{textReferencePreview.reference.title}</div>
          <div className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-[12px] leading-5 text-white/58">
            {textReferencePreview.reference.content.trim() || t('reference.status.textEmpty')}
          </div>
        </div>,
        document.body,
      )
    : null;

  const renderTextReference = (reference: TextReferenceInfo, index: number) => {
    return (
      <div
        key={reference.nodeId}
        role="button"
        tabIndex={0}
        onClick={() => onFocusTextReference(reference.nodeId)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') onFocusTextReference(reference.nodeId);
        }}
        onMouseEnter={(event) => {
          setTextReferencePreview({ reference, rect: event.currentTarget.getBoundingClientRect() });
        }}
        onMouseLeave={() => {
          setTextReferencePreview((current) => (current?.reference.nodeId === reference.nodeId ? null : current));
        }}
        onFocus={(event) => {
          setTextReferencePreview({ reference, rect: event.currentTarget.getBoundingClientRect() });
        }}
        onBlur={() => {
          setTextReferencePreview((current) => (current?.reference.nodeId === reference.nodeId ? null : current));
        }}
        className="nodrag nowheel group/text-ref relative h-[50px] w-[54px] flex-shrink-0 cursor-pointer rounded-lg text-left outline-none"
      >
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg text-white/38 transition-colors group-hover/text-ref:bg-white/[0.07] group-hover/text-ref:text-white/52 group-focus-visible/text-ref:text-white/58"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <TextReferenceIcon />
          <span
            className="absolute right-0 top-0 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white/72 transition-opacity group-hover/text-ref:opacity-0"
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
              setTextReferencePreview(null);
              onRemoveReference(reference.nodeId);
            }}
            className={`nodrag nowheel absolute right-0 top-0 z-30 h-[18px] w-[18px] items-center justify-center rounded-full text-white/78 transition hover:bg-black hover:text-white ${canDeleteReference ? 'flex opacity-0 pointer-events-none group-hover/text-ref:pointer-events-auto group-hover/text-ref:opacity-100' : 'hidden'}`}
            style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
            title={t('reference.actions.disconnectTextReference')}
            aria-label={t('reference.actions.disconnectTextReference')}
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
  const canEditMarkReferenceBlocks = canEditPromptReferences;
  const activeMarkCandidateBlock = imageMarkReferenceBlocks.find((block) => block.id === activeMarkCandidateBlockId);
  useEffect(() => {
    if (!activeMarkCandidateBlockId) return;
    if (!canEditMarkReferenceBlocks || !activeMarkCandidateBlock) return;

    const closeMarkCandidateMenu = () => {
      setActiveMarkCandidateBlockId(null);
      setMarkCandidateAnchorElement(null);
      setMarkCandidateAnchorRect(null);
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
  }, [activeMarkCandidateBlock, activeMarkCandidateBlockId, canEditMarkReferenceBlocks]);

  useEffect(() => {
    if (!activeMarkCandidateBlock || !markCandidateAnchorElement || !canEditMarkReferenceBlocks) {
      const frame = requestAnimationFrame(() => setMarkCandidateAnchorRect(null));
      return () => cancelAnimationFrame(frame);
    }
    let frame = 0;
    const updateAnchorRect = () => {
      const nextRect = markCandidateAnchorElement.getBoundingClientRect();
      setMarkCandidateAnchorRect((currentRect) => {
        if (
          currentRect
          && Math.abs(currentRect.left - nextRect.left) < 0.25
          && Math.abs(currentRect.top - nextRect.top) < 0.25
          && Math.abs(currentRect.width - nextRect.width) < 0.25
          && Math.abs(currentRect.height - nextRect.height) < 0.25
        ) return currentRect;
        return nextRect;
      });
      frame = requestAnimationFrame(updateAnchorRect);
    };
    updateAnchorRect();
    return () => cancelAnimationFrame(frame);
  }, [activeMarkCandidateBlock, canEditMarkReferenceBlocks, markCandidateAnchorElement]);

  const markCandidateMenuMargin = 12;
  const markCandidateMenuWidth = Math.min(180, Math.max(0, window.innerWidth - markCandidateMenuMargin * 2));
  const markCandidateMenuGap = 6;
  const markCandidateMenuEstimatedHeight = Math.min(280, (activeMarkCandidateBlock?.candidates.length ?? 0) * 28 + 8);
  const markCandidateSpaceBelow = markCandidateAnchorRect ? window.innerHeight - markCandidateAnchorRect.bottom - markCandidateMenuMargin - markCandidateMenuGap : 0;
  const markCandidateSpaceAbove = markCandidateAnchorRect ? markCandidateAnchorRect.top - markCandidateMenuMargin - markCandidateMenuGap : 0;
  const markCandidateOpenBelow = markCandidateSpaceBelow >= markCandidateMenuEstimatedHeight || markCandidateSpaceBelow >= markCandidateSpaceAbove;
  const markCandidateMenuLeft = markCandidateAnchorRect
    ? Math.min(Math.max(markCandidateMenuMargin, markCandidateAnchorRect.left), window.innerWidth - markCandidateMenuWidth - markCandidateMenuMargin)
    : markCandidateMenuMargin;
  const markCandidateMenuTop = markCandidateAnchorRect
    ? (markCandidateOpenBelow ? markCandidateAnchorRect.bottom + markCandidateMenuGap : markCandidateAnchorRect.top - markCandidateMenuGap)
    : markCandidateMenuMargin;
  const markCandidateMenuMaxHeight = Math.max(0, markCandidateOpenBelow ? markCandidateSpaceBelow : markCandidateSpaceAbove);
  const markCandidateMenuPortal = activeMarkCandidateBlock && markCandidateAnchorRect && canEditMarkReferenceBlocks
    ? createPortal(
        <div
          ref={markCandidateMenuRef}
          className="nodrag nopan nowheel fixed z-[4200] overflow-y-auto overscroll-contain rounded-lg border border-white/10 bg-[#252526] p-1 shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
          style={{ left: markCandidateMenuLeft, top: markCandidateMenuTop, width: markCandidateMenuWidth, transform: markCandidateOpenBelow ? undefined : 'translateY(-100%)', maxHeight: markCandidateMenuMaxHeight }}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
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
                setMarkCandidateAnchorElement(null);
                setMarkCandidateAnchorRect(null);
              }}
            >
              <span className="truncate">{candidate.label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )
    : null;

  const selectedModel = getImageModelOption(modelParams.model);
  const primaryReference = sortedReferences.find((reference) => getReferenceUsageSortRank(reference).group === 0);
  const adaptiveFrameRatioSource =
    (primaryReference?.width && primaryReference?.height
      ? { width: primaryReference.width, height: primaryReference.height }
      : null) ??
    (currentImageSize?.width && currentImageSize?.height
      ? { width: currentImageSize.width, height: currentImageSize.height }
      : null);
  const adaptiveFrameRatio = adaptiveFrameRatioSource && isValidCustomAspectRatio(adaptiveFrameRatioSource.width, adaptiveFrameRatioSource.height)
    ? `${adaptiveFrameRatioSource.width}:${adaptiveFrameRatioSource.height}`
    : '1:1';
  const displayFrameRatio = modelParams.ratio === 'adaptive' ? adaptiveFrameRatio : modelParams.ratio;
  const selectedFrameRatioDimensions = parseAspectRatio(displayFrameRatio) ?? parseAspectRatio(adaptiveFrameRatio) ?? { width: 1, height: 1 };
  const resolutionTier = getResolutionTier(modelParams.resolutionTier ?? modelParams.resolution);
  const requestedSize = validateRequestedSize(modelParams.requestedSize, resolutionTier)
    ? modelParams.requestedSize
    : calculateRequestedSize(modelParams.ratio, resolutionTier, adaptiveFrameRatioSource);
  const selectedAspectRatioOption: AspectRatioPreset | null = frameRatioMode === 'adaptive'
    ? 'adaptive'
    : frameRatioMode === 'preset' && isFixedAspectRatioPreset(modelParams.ratio)
      ? modelParams.ratio
      : null;

  const commitTargetSize = useCallback((widthValue: string, heightValue: string, options?: { showError?: boolean }) => {
    const committedSize = commitTargetSizeDraft(
      { width: widthValue, height: heightValue },
      resolutionTier,
      isFrameRatioLocked,
    );
    if (!committedSize) {
      if (options?.showError) showToast?.(t('imageNode.validation.invalidFrameRatio'));
      setCustomFrameWidth(String(requestedSize.width));
      setCustomFrameHeight(String(requestedSize.height));
      return false;
    }
    const matchesSelectedRatio = doesSizeMatchAspectRatio(committedSize, displayFrameRatio);
    const nextRatio = matchesSelectedRatio ? modelParams.ratio : `${committedSize.width}:${committedSize.height}`;
    setCustomFrameWidth(String(committedSize.width));
    setCustomFrameHeight(String(committedSize.height));
    setFrameRatioMode(
      nextRatio === 'adaptive' ? 'adaptive' : isFixedAspectRatioPreset(nextRatio) ? 'preset' : 'custom',
    );
    onModelParamsChange({
      ...modelParams,
      ratio: nextRatio,
      resolution: resolutionTier,
      resolutionTier,
      requestedSize: committedSize,
    });
    return true;
  }, [displayFrameRatio, isFrameRatioLocked, modelParams, onModelParamsChange, requestedSize, resolutionTier, showToast, t]);

  const handleCustomFrameWidthChange = (value: string) => {
    const draft = updateTargetSizeDraft({
      width: customFrameWidth,
      height: customFrameHeight,
      field: 'width',
      value,
      locked: isFrameRatioLocked,
      lockedRatio: selectedFrameRatioDimensions.width / selectedFrameRatioDimensions.height,
    });
    if (!draft) return;
    setCustomFrameWidth(draft.width);
    setCustomFrameHeight(draft.height);
  };

  const handleCustomFrameHeightChange = (value: string) => {
    const draft = updateTargetSizeDraft({
      width: customFrameWidth,
      height: customFrameHeight,
      field: 'height',
      value,
      locked: isFrameRatioLocked,
      lockedRatio: selectedFrameRatioDimensions.width / selectedFrameRatioDimensions.height,
    });
    if (!draft) return;
    setCustomFrameWidth(draft.width);
    setCustomFrameHeight(draft.height);
  };

  const handleCustomFrameInputCommit = () => {
    commitTargetSize(customFrameWidth, customFrameHeight, { showError: true });
  };

  const closeGenerationParamMenus = useCallback(() => {
    setShowModelMenu(false);
    setShowRatioMenu(false);
  }, []);

  useEffect(() => {
    if (!showModelMenu && !showRatioMenu) return;

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const interactiveElements = [
        modelButtonRef.current,
        modelMenuRef.current,
        frameRatioButtonRef.current,
        frameRatioPanelRef.current,
      ];
      if (interactiveElements.some((element) => element?.contains(target))) return;
      closeGenerationParamMenus();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      closeGenerationParamMenus();
    };

    document.addEventListener('pointerdown', handleOutsidePointerDown, true);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [closeGenerationParamMenus, showModelMenu, showRatioMenu]);

  const openRatioMenu = () => {
    setCustomFrameWidth(String(requestedSize.width));
    setCustomFrameHeight(String(requestedSize.height));
    setShowRatioMenu(true);
    setShowModelMenu(false);
    setShowCameraPopover(false);
  };

  const hasTooManyReferences = sortedReferences.length > MAX_REFERENCE_IMAGES_PER_NODE;
  const hasManyReferences = sortedReferences.length > RECOMMENDED_REFERENCE_IMAGES_PER_NODE;


  const handleGenerateClick = () => {
    if (!canGenerate) {
      showToast?.(t('imageNode.prompt.emptyGenerationHint'));
      return;
    }

    const limitIssue = getReferenceLimitIssueForGenerate(references);
    if (limitIssue) {
      showToast?.(formatReferenceLimitIssue(limitIssue, (key, values) => t(key, values)));
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
      setEditingPromptInitialText('');
    }
  };

  const startEditPromptReferenceBlock = (block: ImageReferencePromptBlock) => {
    if (!canEditPromptReferences) return;
    const promptText = stripReferencePromptMetadata(block.promptText);
    setEditingPromptBlockId(block.id);
    setEditingPromptText(promptText);
    setEditingPromptInitialText(promptText);
  };

  const savePromptReferenceBlock = (blockId: string) => {
    if (!canEditPromptReferences) return;
    const nextPromptText = stripReferencePromptMetadata(editingPromptText);
    const promptTextChanged = nextPromptText !== editingPromptInitialText;
    onPromptContentChange(
      promptContent.map((item) =>
        item.type === 'image_reference' && item.id === blockId
          ? {
              ...item,
              promptText: nextPromptText,
              promptTextEdited: item.promptTextEdited === true || promptTextChanged,
            }
          : item,
      ),
    );
    setEditingPromptBlockId(null);
    setEditingPromptText('');
    setEditingPromptInitialText('');
  };

  const startEditMarkReferenceBlock = (block: ImageMarkReferencePromptBlock) => {
    if (!canEditMarkReferenceBlocks) return;
    setEditingMarkReferenceBlockId(block.id);
    setEditingMarkPromptText(block.promptText);
    setEditingMarkPromptInitialText(block.promptText);
  };

  const saveMarkReferenceBlock = (blockId: string) => {
    if (!canEditMarkReferenceBlocks) return;
    const promptTextChanged = editingMarkPromptText !== editingMarkPromptInitialText;
    onPromptContentChange(promptContent.map((item) => item.type === 'image_mark_reference' && item.id === blockId
      ? { ...item, promptText: editingMarkPromptText, promptTextEdited: item.promptTextEdited === true || promptTextChanged }
      : item));
    setEditingMarkReferenceBlockId(null);
    setEditingMarkPromptText('');
    setEditingMarkPromptInitialText('');
  };

  const requestReferenceInsert = (reference: ReferenceInfo) => {
    if (!canEditPromptReferences) return;
    onUseReference(reference);
    insertReferenceBlock(reference);
  };

  const handlePromptKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!canEditPrompt) return;
    if (event.nativeEvent.isComposing) return;

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
    if (!showReferenceMenu) {
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

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!canEditPrompt) return;
    const nextText = event.target.value;
    const cursor = event.target.selectionStart;
    onPromptChange(nextText);

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
    // Portals keep React's component-tree event propagation. Let wheel events
    // from the camera popover reach its native capture listener before this
    // control-panel ancestor isolates the rest of the node from the canvas.
    if (isCameraPopoverWheelEvent(event)) return;
    event.stopPropagation();
  };

  return (
    <div
      onContextMenu={stopControlContextMenu}
      className="nodrag nowheel"
      style={{
        width: IMAGE_NODE_CONTROL_WIDTH,
        minHeight: promptExpanded ? IMAGE_NODE_CONTROL_EXPANDED_HEIGHT : IMAGE_NODE_CONTROL_HEIGHT,
        background: NODE_CONTROL_PANEL_BACKGROUND,
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
      {referencePreviewPortal}
      {textReferencePreviewPortal}
      {/* Top toolbar */}
      <div className="flex items-center justify-between" style={{ padding: '12px 14px 8px' }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Element mark */}
          <div className="relative">
            <button
              type="button"
              disabled={!canCreateMarks}
              aria-pressed={isMarkModeActive}
              onClick={() => {
                if (!canCreateMarks) return;
                setShowLightPreview(false);
                onStartMarkMode();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${canCreateMarks ? (isMarkModeActive ? 'border-cyan-400/90 bg-cyan-400/[0.08] text-cyan-100/90 hover:border-cyan-300 hover:bg-cyan-400/[0.11]' : GENERATION_CONTROL_BUTTON_CLASS) : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
              style={{
                width: 54,
                height: 50,
                padding: '4px',
                opacity: canCreateMarks ? 1 : 0.45,
                cursor: canCreateMarks ? 'pointer' : 'not-allowed',
              }}
              title={t('imageMark.button')}
            >
              <ScanSearch className="h-4 w-4" />
              <span style={{ fontSize: 14 }}>{t('imageMark.button')}</span>
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              disabled={!canSelectCanvasReference}
              aria-pressed={isCanvasReferenceSelectionModeActive}
              onClick={() => {
                if (!canSelectCanvasReference) return;
                setShowLightPreview(false);
                onStartCanvasReferenceSelection();
              }}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-colors ${canSelectCanvasReference ? (isCanvasReferenceSelectionModeActive ? 'border-[#2f6bff]/80 bg-[#2f6bff]/15 text-[#b8caff] hover:border-[#2f6bff] hover:bg-[#2f6bff]/20' : GENERATION_CONTROL_BUTTON_CLASS) : GENERATION_CONTROL_BUTTON_DISABLED_CLASS}`}
              style={{
                width: 54,
                height: 50,
                padding: '4px',
                opacity: canSelectCanvasReference ? 1 : 0.45,
                cursor: canSelectCanvasReference ? 'pointer' : 'not-allowed',
              }}
              title={t('reference.canvasSelection.buttonTitle')}
            >
              <ImagePlus className="h-4 w-4" />
              <span style={{ fontSize: 14 }}>{t('reference.canvasSelection.button')}</span>
            </button>
          </div>
          {workflowSource?.type === 'exteriorRender' && (
            <ImageNodeWorkflowSourceBadge
              source={workflowSource}
              onFocusSource={onFocusWorkflowSource}
            />
          )}
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
          title={promptExpanded ? t('common.actions.collapse') : t('common.actions.expand')}
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
              ? t('reference.validation.maxImages')
              : t('reference.validation.recommendedImages')}
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
                const isEditing = canEditMarkReferenceBlocks && editingMarkReferenceBlockId === block.id;
                return (
                  <div
                    key={block.id}
                    onClick={(event) => {
                      if (isEditing) return;
                      event.stopPropagation();
                      startEditMarkReferenceBlock(block);
                    }}
                    className="group/mark-ref relative flex w-[95%] max-w-[95%] self-start items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.035] px-1.5 py-1 text-[15px]"
                  >
                    <div className="group/mark-thumb relative h-6 w-6 flex-shrink-0">
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
                    <div className="flex min-w-0 max-w-[150px] flex-shrink items-center">
                        {block.candidates.length > 1 ? (
                          <button
                            data-mark-candidate-trigger={block.id}
                            type="button"
                            disabled={!canEditMarkReferenceBlocks}
                            onPointerDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (activeMarkCandidateBlockId === block.id) {
                                setActiveMarkCandidateBlockId(null);
                                setMarkCandidateAnchorElement(null);
                                setMarkCandidateAnchorRect(null);
                                return;
                              }
                              setActiveMarkCandidateBlockId(block.id);
                              setMarkCandidateAnchorElement(event.currentTarget);
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
                    {isEditing ? (
                      <textarea
                        autoFocus
                        ref={(element) => {
                          if (!element) return;
                          requestAnimationFrame(() => {
                            element.focus();
                            const end = element.value.length;
                            element.setSelectionRange(end, end);
                            resizePromptReferenceTextarea(element);
                          });
                        }}
                        value={editingMarkPromptText}
                        onChange={(event) => {
                          setEditingMarkPromptText(event.target.value);
                          resizePromptReferenceTextarea(event.currentTarget);
                        }}
                        onBlur={() => saveMarkReferenceBlock(block.id)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            saveMarkReferenceBlock(block.id);
                          }
                        }}
                        onPointerDown={stopControlEvent}
                        onMouseDown={stopControlEvent}
                        onWheel={stopControlEvent}
                        onWheelCapture={stopControlEvent}
                        className="nodrag nowheel min-w-0 flex-1 resize-none overflow-y-auto bg-transparent text-[15px] leading-5 outline-none"
                        style={{ minHeight: 24, maxHeight: 44, color: 'rgba(255,255,255,0.82)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 6, padding: '1px 6px' }}
                      />
                    ) : (
                      <span className="min-w-0 flex-1 truncate px-1.5 text-[15px] leading-5 text-white/65">{block.promptText}</span>
                    )}
                    {canEditMarkReferenceBlocks && !isEditing ? (
                      <button
                        type="button"
                        className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-black/25 text-white/70 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-200 group-hover/mark-ref:opacity-100"
                        onClick={(event) => {
                          event.stopPropagation();
                          onPromptContentChange(promptContent.filter((item) => !('id' in item) || item.id !== block.id));
                        }}
                        title={t('imageMark.removeChip')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <span className="ml-auto h-5 w-5 flex-shrink-0" aria-hidden="true" />
                    )}
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
                const usageColor = getImageRoleColor(reference?.role ?? null, reference?.localReferenceType);
                const isEditing = canEditPromptReferences && editingPromptBlockId === block.id;
                const hovered = canEditPromptReferences && !isEditing && isPromptBlockHovered;
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
                    onClick={(event) => {
                      if (isEditing) return;
                      event.stopPropagation();
                      startEditPromptReferenceBlock(block);
                    }}
                    className="group/prompt-ref relative flex w-[95%] max-w-[95%] self-start items-center gap-1.5 rounded-lg border px-1.5 py-1 text-[15px] transition-all"
                    style={{
                      background: hovered || highlighted ? 'rgba(255,255,255,0.052)' : 'rgba(255,255,255,0.035)',
                      borderColor: highlighted ? `${usageColor}66` : hovered ? `${usageColor}52` : 'rgba(255,255,255,0.10)',
                      boxShadow: 'none',
                      color: 'rgba(255,255,255,0.82)',
                      opacity: canEditPromptReferences ? 1 : 0.82,
                    }}
                    >
                    <div className="group/reference-thumb relative h-6 w-6 flex-shrink-0">
                      {previewImage ? (
                        <img src={previewImage} alt="" className="h-6 w-6 rounded object-cover" draggable={false} style={{ border: `1px solid ${usageColor}` }} />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${usageColor}` }}>
                          <Image className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.38)' }} />
                        </span>
                      )}
                    </div>
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
                            resizePromptReferenceTextarea(element);
                          });
                        }}
                        value={editingPromptText}
                        onChange={(event) => {
                          setEditingPromptText(event.target.value);
                          resizePromptReferenceTextarea(event.currentTarget);
                        }}
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
                          minHeight: 24,
                          maxHeight: 44,
                          color: 'rgba(255,255,255,0.82)',
                          whiteSpace: 'pre-wrap',
                          overflowWrap: 'anywhere',
                          border: '1px solid rgba(255,255,255,0.14)',
                          borderRadius: 6,
                          padding: '1px 6px',
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
                        className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-black/25 text-white/70 opacity-0 transition-all hover:bg-red-500/20 hover:text-red-200 group-hover/prompt-ref:opacity-100"
                        title={t('reference.actions.removeFromPrompt')}
                      >
                        <X className="h-3.5 w-3.5" />
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
            placeholder={t('imageNode.prompt.placeholder')}
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
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
                    {getImageRoleLabel(
                      reference.role,
                      reference.customRoleLabel,
                      reference.localReferenceType,
                      reference.localReferenceLabel,
                      translate,
                    ) || t('reference.roles.unassigned')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom params bar */}
      <div className="flex items-center justify-between" style={{ padding: '4px 14px 14px' }}>
        <div className="flex min-w-0 items-center gap-3">
          {/* Model */}
          <div className="relative">
            <button
              ref={modelButtonRef}
              disabled={!canEditModel}
              onClick={() => {
                if (!canEditModel) return;
                setShowModelMenu((value) => !value);
                setShowRatioMenu(false);
                setShowCameraPopover(false);
              }}
              className={`flex items-center gap-1.5 transition-colors ${canEditModel ? 'hover:text-white' : ''}`}
              style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', opacity: canEditModel ? 1 : 0.45, cursor: canEditModel ? 'pointer' : 'not-allowed' }}
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-semibold tracking-[-0.02em] text-white/90"
                style={{ background: selectedModel.iconBg }}
                aria-hidden="true"
              >
                {selectedModel.iconText}
              </span>
              <span className="truncate" style={{ maxWidth: 168 }}>{selectedModel.label}</span>
              <ChevronDown className="w-3.5 h-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
            </button>
            {canEditModel && showModelMenu && (
              <div
                ref={modelMenuRef}
                className="absolute bottom-full left-0 mb-1 py-1 rounded-lg z-30 overflow-hidden"
                style={{ background: FLOATING_PANEL_BACKGROUND, border: FLOATING_PANEL_BORDER, boxShadow: '0 12px 28px rgba(0,0,0,0.4)', width: 248 }}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                {IMAGE_MODEL_OPTIONS.map((m) => (
                  <button
                    key={m.id}
                    disabled={!canEditModel}
                    onClick={() => {
                      if (!canEditModel) return;
                      onModelParamsChange({
                        ...modelParams,
                        model: m.id,
                        resolution: m.resolutions.includes(modelParams.resolution as ImageModelResolution)
                          ? modelParams.resolution
                          : m.defaultResolution,
                      });
                      setShowModelMenu(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${modelParams.model === m.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold text-white/90" style={{ background: m.iconBg }}>{m.iconText}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-white/85">{m.label}</span>
                      <span className="block truncate text-[12px] text-white/42">{t(m.descriptionKey)} · {t('common.status.default')} {m.defaultResolution}</span>
                    </span>
                    {modelParams.model === m.id && <Check className="h-4 w-4 flex-shrink-0 text-white/70" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Ratio · Resolution */}
          <div className="relative">
            <ModelParamsSummaryButton
              ref={frameRatioButtonRef}
              disabled={!canEditModel}
              aspectRatio={modelParams.ratio}
              resolutionTier={resolutionTier}
              onClick={() => {
                if (!canEditModel) return;
                if (showRatioMenu) {
                  setShowRatioMenu(false);
                  return;
                }
                openRatioMenu();
              }}
            />
            {canEditModel && showRatioMenu && (
              <div
                ref={frameRatioPanelRef}
                className="absolute bottom-full left-0 z-30 flex flex-col rounded-xl"
                style={{
                  marginBottom: 8,
                  width: 440,
                  padding: 10,
                  background: FLOATING_PANEL_BACKGROUND,
                  border: FLOATING_PANEL_BORDER,
                  boxShadow: '0 14px 30px rgba(0,0,0,0.42)',
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <div>
                  <div className="mb-2 text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('modelParams.aspectRatio.label')}</div>
                  <ModelAspectRatioOptions
                    selectedValue={selectedAspectRatioOption}
                    adaptiveLabel={t('modelParams.aspectRatio.adaptive')}
                    disabled={!canEditModel}
                    onSelect={(value) => {
                      if (!canEditModel) return;
                      setFrameRatioMode(value === 'adaptive' ? 'adaptive' : 'preset');
                      const nextRequestedSize = calculateRequestedSize(value, resolutionTier, adaptiveFrameRatioSource);
                      setCustomFrameWidth(String(nextRequestedSize.width));
                      setCustomFrameHeight(String(nextRequestedSize.height));
                      onModelParamsChange({
                        ...modelParams,
                        ratio: value,
                        resolution: resolutionTier,
                        resolutionTier,
                        requestedSize: nextRequestedSize,
                      });
                    }}
                  />
                </div>

                <div className="order-3 mt-3 border-t border-white/[0.045] pt-3">
                  <div className="mb-2 text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('modelParams.targetSize.label')}</div>
                  <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr 40px' }}>
                    <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-white/[0.075] bg-white/[0.03] px-2.5">
                      <span className="text-[12px] text-white/38">{t('modelParams.aspectRatio.width')}</span>
                      <input
                        className="nodrag nopan nowheel min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white/82 outline-none"
                        value={customFrameWidth}
                        inputMode="numeric"
                        disabled={!canEditModel}
                        onChange={(event) => handleCustomFrameWidthChange(event.target.value)}
                        onBlur={handleCustomFrameInputCommit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleCustomFrameInputCommit();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </label>
                    <span className="flex h-9 items-center justify-center text-[13px] text-white/32">×</span>
                    <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-white/[0.075] bg-white/[0.03] px-2.5">
                      <span className="text-[12px] text-white/38">{t('modelParams.aspectRatio.height')}</span>
                      <input
                        className="nodrag nopan nowheel min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white/82 outline-none"
                        value={customFrameHeight}
                        inputMode="numeric"
                        disabled={!canEditModel}
                        onChange={(event) => handleCustomFrameHeightChange(event.target.value)}
                        onBlur={handleCustomFrameInputCommit}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            handleCustomFrameInputCommit();
                            event.currentTarget.blur();
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={!canEditModel}
                      onClick={() => setIsFrameRatioLocked((value) => !value)}
                      className="flex h-9 w-10 flex-shrink-0 items-center justify-center rounded-md transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white/82"
                      style={{
                        color: isFrameRatioLocked ? 'rgba(255,255,255,0.86)' : 'rgba(255,255,255,0.48)',
                        background: isFrameRatioLocked ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                        border: isFrameRatioLocked ? '1px solid rgba(255,255,255,0.58)' : '1px solid rgba(255,255,255,0.075)',
                      }}
                      title={isFrameRatioLocked ? t('modelParams.aspectRatio.lock') : t('modelParams.aspectRatio.unlock')}
                    >
                      {isFrameRatioLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="order-2 mt-3 border-t border-white/[0.045] pt-3">
                  <div className="mb-2 text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.62)' }}>{t('modelParams.resolution.label')}</div>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedModel.resolutions.map((r) => (
                      <button
                        key={r}
                        disabled={!canEditModel}
                        onClick={() => {
                          if (!canEditModel) return;
                          const nextRequestedSize = calculateRequestedSize(modelParams.ratio, r, adaptiveFrameRatioSource);
                          setCustomFrameWidth(String(nextRequestedSize.width));
                          setCustomFrameHeight(String(nextRequestedSize.height));
                          onModelParamsChange({
                            ...modelParams,
                            resolution: r,
                            resolutionTier: r,
                            requestedSize: nextRequestedSize,
                          });
                        }}
                        className="h-9 rounded-md text-[14px] font-medium transition-colors hover:bg-white/[0.065]"
                        style={{
                          color: modelParams.resolution === r ? '#ffffff' : 'rgba(255,255,255,0.54)',
                          background: modelParams.resolution === r ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                          border: modelParams.resolution === r ? '1px solid rgba(255,255,255,0.62)' : '1px solid rgba(255,255,255,0.075)',
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Camera is a bottom-level generation parameter, independent from controllers. */}
          <div className="group/camera relative flex-shrink-0">
            <CameraControlPreview value={cameraControl} />
            <button
              ref={setCameraButtonElement}
              type="button"
              disabled={!canEditModel}
              aria-pressed={showCameraPopover}
              aria-label={t('imageNode.camera.title')}
              onClick={() => {
                if (!canEditModel) return;
                setShowCameraPopover((value) => !value);
                setShowLightPreview(false);
                setShowModelMenu(false);
                setShowRatioMenu(false);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                cameraControl?.enabled
                  ? 'border-[#2f6bff]/55 bg-[#2f6bff]/15 text-[#8eb0ff] hover:border-[#2f6bff]/75 hover:bg-[#2f6bff]/20'
                  : showCameraPopover
                    ? 'border-white/[0.16] bg-white/[0.09] text-white/86'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/52 hover:border-white/[0.14] hover:bg-white/[0.065] hover:text-white/82'
              }`}
            >
              <CameraPositionIcon className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            <CameraControlPopover
              open={showCameraPopover}
              anchorElement={cameraButtonElement}
              value={cameraControl}
              disabled={!canEditModel}
              onChange={onCameraControlChange}
              onOpenChange={setShowCameraPopover}
            />
          </div>
          {/* Lighting is a lightweight sun-and-sky generation constraint. */}
          <div className="relative flex-shrink-0">
            <button
              ref={setLightingButtonElement}
              type="button"
              disabled={!canEditLighting}
              aria-pressed={showLightPreview}
              aria-label={t('imageNode.lighting.title')}
              title={t('imageNode.lighting.title')}
              onClick={() => {
                if (!canEditLighting) return;
                setShowLightPreview((value) => !value);
                setShowCameraPopover(false);
                setShowModelMenu(false);
                setShowRatioMenu(false);
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                lightPreview?.enabled
                  ? 'border-[#2f6bff]/55 bg-[#2f6bff]/15 text-[#8eb0ff] hover:border-[#2f6bff]/75 hover:bg-[#2f6bff]/20'
                  : showLightPreview
                    ? 'border-white/[0.16] bg-white/[0.09] text-white/86'
                    : 'border-white/[0.08] bg-white/[0.03] text-white/52 hover:border-white/[0.14] hover:bg-white/[0.065] hover:text-white/82'
              }`}
            >
              <SunMedium className="h-[18px] w-[18px]" strokeWidth={1.6} />
            </button>
            {showLightPreview && (
              <ImageLightingControlPopover
                anchorElement={lightingButtonElement}
                value={lightPreview}
                disabled={!canEditLighting}
                onChange={onLightPreviewChange}
                onOpenChange={setShowLightPreview}
              />
            )}
          </div>
        </div>
        {/* Credits + generate button */}
        <div className="relative flex items-center gap-3">
          <div
            className="flex h-[34px] min-w-[46px] items-center justify-center gap-1 text-[13px] font-medium"
            style={{
              color: 'rgba(255,255,255,0.52)',
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
              <span className="truncate" style={{ maxWidth: 120 }}>{t('imageNode.errors.generationFailed')}</span>
              <span className="text-white/60">·</span>
              <span className="text-white/80 hover:text-white">{t('common.actions.retry')}</span>
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
              title={isGenerating ? t('generation.status.generating') : t('generation.actions.generate')}
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
    </div>
  );
}
