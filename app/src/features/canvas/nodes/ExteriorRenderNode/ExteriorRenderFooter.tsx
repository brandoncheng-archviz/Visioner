import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '@xyflow/react';
import { Check, ChevronDown, Lock, Unlock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FLOATING_PANEL_BACKGROUND, FLOATING_PANEL_BORDER } from '../../constants/canvasConstants';
import {
  IMAGE_MODEL_OPTIONS,
  getImageModelOption,
  type ImageModelResolution,
} from '../../constants/imageModelOptions';
import { ModelAspectRatioOptions } from '../../components/ModelAspectRatioOptions';
import { ModelParamsSummaryButton } from '../../components/ModelParamsSummaryButton';
import { GenerationSubmitControl } from '../../components/GenerationSubmitControl';
import {
  calculateRequestedSize,
  commitTargetSizeDraft,
  doesSizeMatchAspectRatio,
  getResolutionTier,
  isFixedAspectRatioPreset,
  isValidOutputSize,
  parseAspectRatio,
  updateTargetSizeDraft,
  validateRequestedSize,
  type AspectRatioPreset,
  type OutputSize,
} from '../../utils/modelParams';
import type { ExteriorRenderModelParams } from './exteriorRender.types';

const MODEL_MENU_WIDTH = 248;
const MODEL_MENU_HEIGHT = 192;
const FRAME_RATIO_PANEL_WIDTH = 440;
const FRAME_RATIO_PANEL_HEIGHT = 352;
const FLOATING_PANEL_GAP = 8;
const VIEWPORT_PADDING = 12;
const MODEL_DESCRIPTION_KEYS: Record<string, string> = {
  'Nano Banana 2': 'modelParams.model.nanoBanana2.description',
  'Nano Banana Pro': 'modelParams.model.nanoBananaPro.description',
  'GPT Image 2': 'modelParams.model.gptImage2.description',
};

type FloatingPosition = {
  left: number;
  top: number;
};

type ExteriorRenderFooterProps = {
  params: ExteriorRenderModelParams;
  isGenerating: boolean;
  canGenerate: boolean;
  disabled: boolean;
  validationMessage?: string;
  creditCost: number;
  adaptiveSourceSize?: OutputSize | null;
  onChange: (params: ExteriorRenderModelParams) => void;
  onGenerate: () => void;
};

function getFloatingPosition(
  anchor: HTMLElement | null,
  width: number,
  height: number,
  horizontalAlign: 'start' | 'center' = 'start',
): FloatingPosition | null {
  if (!anchor) return null;
  const rect = anchor.getBoundingClientRect();
  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - width - VIEWPORT_PADDING);
  const preferredLeft = horizontalAlign === 'center'
    ? rect.left + rect.width / 2 - width / 2
    : rect.left;
  const left = Math.min(Math.max(preferredLeft, VIEWPORT_PADDING), maxLeft);
  const topAbove = rect.top - height - FLOATING_PANEL_GAP;
  const topBelow = rect.bottom + FLOATING_PANEL_GAP;
  const top = topAbove >= VIEWPORT_PADDING
    ? topAbove
    : Math.min(topBelow, Math.max(VIEWPORT_PADDING, window.innerHeight - height - VIEWPORT_PADDING));
  return { left, top };
}

export function ExteriorRenderFooter({
  params,
  isGenerating,
  canGenerate,
  disabled,
  validationMessage,
  creditCost,
  adaptiveSourceSize,
  onChange,
  onGenerate,
}: ExteriorRenderFooterProps) {
  const { t } = useTranslation();
  const flowTransform = useStore((state) => state.transform);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const [customFrameWidth, setCustomFrameWidth] = useState('1');
  const [customFrameHeight, setCustomFrameHeight] = useState('1');
  const [isFrameRatioLocked, setIsFrameRatioLocked] = useState(true);
  const [modelMenuPosition, setModelMenuPosition] = useState<FloatingPosition | null>(null);
  const [frameRatioPanelPosition, setFrameRatioPanelPosition] = useState<FloatingPosition | null>(null);
  const modelButtonRef = useRef<HTMLButtonElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const frameRatioButtonRef = useRef<HTMLButtonElement | null>(null);
  const frameRatioPanelRef = useRef<HTMLDivElement | null>(null);

  const selectedModel = getImageModelOption(params.model);
  const adaptiveFrameRatio = isValidOutputSize(adaptiveSourceSize)
    ? `${adaptiveSourceSize.width}:${adaptiveSourceSize.height}`
    : '1:1';
  const displayFrameRatio = params.aspectRatio === 'adaptive' ? adaptiveFrameRatio : params.aspectRatio;
  const selectedFrameRatioDimensions = parseAspectRatio(displayFrameRatio) ?? { width: 1, height: 1 };
  const currentResolution = selectedModel.resolutions.includes(params.resolution as ImageModelResolution)
    ? (params.resolution as ImageModelResolution)
    : selectedModel.defaultResolution;
  const resolutionTier = getResolutionTier(params.resolutionTier ?? currentResolution);
  const requestedSize = validateRequestedSize(params.requestedSize, resolutionTier)
    ? params.requestedSize
    : calculateRequestedSize(params.aspectRatio, resolutionTier, adaptiveSourceSize);
  const selectedAspectRatioOption: AspectRatioPreset | null = params.aspectRatio === 'adaptive'
    ? 'adaptive'
    : isFixedAspectRatioPreset(params.aspectRatio)
      ? params.aspectRatio
      : null;

  useEffect(() => {
    if (!showModelMenu && !showRatioMenu) return;

    const closeGenerationParamMenus = () => {
      setShowModelMenu(false);
      setShowRatioMenu(false);
    };

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
  }, [showModelMenu, showRatioMenu]);

  useEffect(() => {
    if (!showModelMenu && !showRatioMenu) return;

    const updateFloatingPositions = () => {
      if (showModelMenu) {
        setModelMenuPosition(getFloatingPosition(modelButtonRef.current, MODEL_MENU_WIDTH, MODEL_MENU_HEIGHT));
      }
      if (showRatioMenu) {
        setFrameRatioPanelPosition(getFloatingPosition(frameRatioButtonRef.current, FRAME_RATIO_PANEL_WIDTH, FRAME_RATIO_PANEL_HEIGHT, 'center'));
      }
    };

    updateFloatingPositions();
    window.addEventListener('resize', updateFloatingPositions);
    window.addEventListener('scroll', updateFloatingPositions, true);
    return () => {
      window.removeEventListener('resize', updateFloatingPositions);
      window.removeEventListener('scroll', updateFloatingPositions, true);
    };
  }, [flowTransform, showModelMenu, showRatioMenu]);

  const openRatioMenu = () => {
    setCustomFrameWidth(String(requestedSize.width));
    setCustomFrameHeight(String(requestedSize.height));
    setFrameRatioPanelPosition(getFloatingPosition(frameRatioButtonRef.current, FRAME_RATIO_PANEL_WIDTH, FRAME_RATIO_PANEL_HEIGHT, 'center'));
    setShowRatioMenu(true);
    setShowModelMenu(false);
  };

  const commitTargetSize = (widthValue: string, heightValue: string) => {
    const committedSize = commitTargetSizeDraft(
      { width: widthValue, height: heightValue },
      resolutionTier,
      isFrameRatioLocked,
    );
    if (!committedSize) {
      setCustomFrameWidth(String(requestedSize.width));
      setCustomFrameHeight(String(requestedSize.height));
      return false;
    }
    const nextRatio = doesSizeMatchAspectRatio(committedSize, displayFrameRatio)
      ? params.aspectRatio
      : `${committedSize.width}:${committedSize.height}`;
    setCustomFrameWidth(String(committedSize.width));
    setCustomFrameHeight(String(committedSize.height));
    onChange({
      ...params,
      aspectRatio: nextRatio,
      resolution: resolutionTier,
      resolutionTier,
      requestedSize: committedSize,
    });
    return true;
  };

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

  const modelMenu = showModelMenu && modelMenuPosition && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={modelMenuRef}
        className="nodrag nowheel fixed z-[1000] overflow-hidden rounded-lg py-1"
        style={{
          left: modelMenuPosition.left,
          top: modelMenuPosition.top,
          width: MODEL_MENU_WIDTH,
          background: FLOATING_PANEL_BACKGROUND,
          border: FLOATING_PANEL_BORDER,
          boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
        }}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        {IMAGE_MODEL_OPTIONS.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => {
              onChange({
                ...params,
                model: model.id,
                resolution: model.resolutions.includes(params.resolution as ImageModelResolution)
                  ? params.resolution
                  : model.defaultResolution,
              });
              setShowModelMenu(false);
            }}
            className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${params.model === model.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
          >
            <span
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold text-white/90"
              style={{ background: model.iconBg }}
            >
              {model.iconText}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium text-white/85">{model.label}</span>
              <span className="block truncate text-[12px] text-white/42">
                {t(MODEL_DESCRIPTION_KEYS[model.id] || 'modelParams.model.nanoBanana2.description')} · {t('common.status.default')} {model.defaultResolution}
              </span>
            </span>
            {params.model === model.id && <Check className="h-4 w-4 flex-shrink-0 text-white/70" />}
          </button>
        ))}
      </div>,
      document.body,
    )
    : null;

  const frameRatioPanel = showRatioMenu && frameRatioPanelPosition && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={frameRatioPanelRef}
        className="nodrag nowheel fixed z-[1000] flex flex-col rounded-xl"
        style={{
          left: frameRatioPanelPosition.left,
          top: frameRatioPanelPosition.top,
          width: FRAME_RATIO_PANEL_WIDTH,
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
          <div className="mb-2 text-[13px] font-medium text-white/62">{t('modelParams.aspectRatio.label')}</div>
          <ModelAspectRatioOptions
            selectedValue={selectedAspectRatioOption}
            adaptiveLabel={t('modelParams.aspectRatio.adaptive')}
            disabled={disabled}
            onSelect={(value) => {
              const nextRequestedSize = calculateRequestedSize(value, resolutionTier, adaptiveSourceSize);
              setCustomFrameWidth(String(nextRequestedSize.width));
              setCustomFrameHeight(String(nextRequestedSize.height));
              onChange({
                ...params,
                aspectRatio: value,
                resolution: resolutionTier,
                resolutionTier,
                requestedSize: nextRequestedSize,
              });
            }}
          />
        </div>

        <div className="order-3 mt-3 border-t border-white/[0.045] pt-3">
          <div className="mb-2 text-[13px] font-medium text-white/62">{t('modelParams.targetSize.label')}</div>
          <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto 1fr 40px' }}>
            <label className="flex h-9 min-w-0 items-center gap-2 rounded-md border border-white/[0.075] bg-white/[0.03] px-2.5">
              <span className="text-[12px] text-white/38">{t('modelParams.aspectRatio.width')}</span>
              <input
                className="nodrag nopan nowheel min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white/82 outline-none"
                value={customFrameWidth}
                inputMode="numeric"
                onChange={(event) => handleCustomFrameWidthChange(event.target.value)}
                onBlur={() => commitTargetSize(customFrameWidth, customFrameHeight)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
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
                onChange={(event) => handleCustomFrameHeightChange(event.target.value)}
                onBlur={() => commitTargetSize(customFrameWidth, customFrameHeight)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                  }
                }}
              />
            </label>
            <button
              type="button"
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
          <div className="mb-2 text-[13px] font-medium text-white/62">{t('modelParams.resolution.label')}</div>
          <div className="grid grid-cols-3 gap-2">
            {selectedModel.resolutions.map((resolution) => (
              <button
                key={resolution}
                type="button"
                onClick={() => {
                  const nextRequestedSize = calculateRequestedSize(params.aspectRatio, resolution, adaptiveSourceSize);
                  setCustomFrameWidth(String(nextRequestedSize.width));
                  setCustomFrameHeight(String(nextRequestedSize.height));
                  onChange({
                    ...params,
                    resolution,
                    resolutionTier: resolution,
                    requestedSize: nextRequestedSize,
                  });
                }}
                className="h-9 rounded-md text-[14px] font-medium transition-colors hover:bg-white/[0.065]"
                style={{
                  color: currentResolution === resolution ? '#ffffff' : 'rgba(255,255,255,0.54)',
                  background: currentResolution === resolution ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                  border: currentResolution === resolution ? '1px solid rgba(255,255,255,0.62)' : '1px solid rgba(255,255,255,0.075)',
                }}
              >
                {resolution}
              </button>
            ))}
          </div>
        </div>
      </div>,
      document.body,
    )
    : null;

  return (
    <footer className={disabled ? 'pointer-events-none flex h-[62px] shrink-0 items-center justify-between gap-2 border-t border-white/[0.07] px-3 opacity-60' : 'flex h-[62px] shrink-0 items-center justify-between gap-2 border-t border-white/[0.07] px-3'} aria-disabled={disabled}>
      {modelMenu}
      {frameRatioPanel}
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative">
          <button
            ref={modelButtonRef}
            type="button"
            onClick={() => {
              setModelMenuPosition(getFloatingPosition(modelButtonRef.current, MODEL_MENU_WIDTH, MODEL_MENU_HEIGHT));
              setShowModelMenu((value) => !value);
              setShowRatioMenu(false);
            }}
            className="nodrag flex items-center gap-1.5 text-[14px] text-white/90 transition-colors hover:text-white"
          >
            <span
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-semibold tracking-[-0.02em] text-white/90"
              style={{ background: selectedModel.iconBg }}
              aria-hidden="true"
            >
              {selectedModel.iconText}
            </span>
            <span className="truncate" style={{ maxWidth: 116 }}>{selectedModel.label}</span>
            <ChevronDown className="h-3.5 w-3.5 text-white/55" />
          </button>

        </div>

        <div className="relative">
          <ModelParamsSummaryButton
            ref={frameRatioButtonRef}
            aspectRatio={params.aspectRatio}
            resolutionTier={resolutionTier}
            disabled={disabled}
            onClick={() => {
              if (showRatioMenu) {
                setShowRatioMenu(false);
                return;
              }
              openRatioMenu();
            }}
          />
        </div>
      </div>

      <GenerationSubmitControl
        creditCost={creditCost}
        isGenerating={isGenerating}
        disabled={disabled || !canGenerate}
        creditTitle={t('exteriorRender.footer.creditCost', { count: creditCost })}
        buttonTitle={isGenerating ? t('exteriorRender.processing.generating') : validationMessage || t('generation.actions.generate')}
        onGenerate={onGenerate}
      />
    </footer>
  );
}
