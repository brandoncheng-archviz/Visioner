import { useEffect, useRef } from 'react';
import { Aperture, Camera, ChevronLeft, ChevronRight, Focus, Grid3X3, MoveVertical, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import {
  CANVAS_NODE_CARD_SELECTED_BORDER_COLOR,
  FLOATING_PANEL_BACKGROUND,
} from '../../../constants/canvasConstants';
import type {
  CameraControllerData,
  CameraDepthOfField,
  CameraHeight,
  CameraLens,
  CameraPerspective,
  ImageNodeControllers,
} from './imageControllers.types';

interface CameraControlPanelProps {
  controllers?: ImageNodeControllers;
  disabled?: boolean;
  onChange: (controllers: ImageNodeControllers) => void;
  onClose: () => void;
}

type CameraOption<T extends string> = {
  value: T;
  labelKey: string;
  range?: string;
};

const CAMERA_HEIGHT_OPTIONS: CameraOption<CameraHeight>[] = [
  { value: 'low', labelKey: 'imageNode.controllers.camera.height.options.low', range: '0.2–1.3m' },
  { value: 'eyeLevel', labelKey: 'imageNode.controllers.camera.height.options.eyeLevel', range: '1.4–1.8m' },
  { value: 'slightlyHigh', labelKey: 'imageNode.controllers.camera.height.options.slightlyHigh', range: '1.9–4.0m' },
  { value: 'high', labelKey: 'imageNode.controllers.camera.height.options.high', range: '4.1–15m' },
  { value: 'birdsEye', labelKey: 'imageNode.controllers.camera.height.options.birdsEye', range: '15.1m+' },
];

const CAMERA_LENS_OPTIONS: CameraOption<CameraLens>[] = [
  { value: 'ultraWide', labelKey: 'imageNode.controllers.camera.lens.options.ultraWide', range: '14–20mm' },
  { value: 'wide', labelKey: 'imageNode.controllers.camera.lens.options.wide', range: '21–28mm' },
  { value: 'standard', labelKey: 'imageNode.controllers.camera.lens.options.standard', range: '35–50mm' },
  { value: 'telephoto', labelKey: 'imageNode.controllers.camera.lens.options.telephoto', range: '70–120mm' },
];

const CAMERA_PERSPECTIVE_OPTIONS: CameraOption<CameraPerspective>[] = [
  { value: 'onePoint', labelKey: 'imageNode.controllers.camera.perspective.options.onePoint' },
  { value: 'twoPoint', labelKey: 'imageNode.controllers.camera.perspective.options.twoPoint' },
  { value: 'threePointUp', labelKey: 'imageNode.controllers.camera.perspective.options.threePointUp' },
  { value: 'threePointDown', labelKey: 'imageNode.controllers.camera.perspective.options.threePointDown' },
];

const CAMERA_DEPTH_OPTIONS: CameraOption<CameraDepthOfField>[] = [
  { value: 'allSharp', labelKey: 'imageNode.controllers.camera.depthOfField.options.allSharp' },
  { value: 'subtle', labelKey: 'imageNode.controllers.camera.depthOfField.options.subtle' },
  { value: 'pronounced', labelKey: 'imageNode.controllers.camera.depthOfField.options.pronounced' },
];

const DEFAULT_CAMERA_CONTROLLER: Required<Omit<CameraControllerData, 'enabled'>> = {
  height: 'slightlyHigh',
  lens: 'wide',
  perspective: 'twoPoint',
  depthOfField: 'allSharp',
  preserveOriginalCameraFeatures: true,
};

export function CameraControlPanel({
  controllers,
  disabled = false,
  onChange,
  onClose,
}: CameraControlPanelProps) {
  const { t } = useTranslation();
  const camera = {
    ...DEFAULT_CAMERA_CONTROLLER,
    ...controllers?.camera,
  };
  const cameraEnabled = camera.enabled === true;

  const updateCamera = (patch: Partial<CameraControllerData>) => {
    if (disabled) return;
    onChange({
      ...controllers,
      camera: {
        ...camera,
        ...patch,
        enabled: true,
      },
    });
  };

  const setCameraEnabled = (enabled: boolean) => {
    if (disabled) return;
    onChange({
      ...controllers,
      camera: {
        ...camera,
        enabled,
      },
    });
  };

  const summary = [
    t(CAMERA_HEIGHT_OPTIONS.find((option) => option.value === camera.height)?.labelKey ?? CAMERA_HEIGHT_OPTIONS[2].labelKey),
    t(CAMERA_LENS_OPTIONS.find((option) => option.value === camera.lens)?.labelKey ?? CAMERA_LENS_OPTIONS[1].labelKey),
    t(CAMERA_PERSPECTIVE_OPTIONS.find((option) => option.value === camera.perspective)?.labelKey ?? CAMERA_PERSPECTIVE_OPTIONS[1].labelKey),
    t(CAMERA_DEPTH_OPTIONS.find((option) => option.value === camera.depthOfField)?.labelKey ?? CAMERA_DEPTH_OPTIONS[0].labelKey),
  ];

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-semibold text-white/90">{t('imageNode.controllers.camera.header')}</div>
          <div className="mt-1 text-[12px] text-white/42">{t('imageNode.controllers.camera.subtitle')}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/78"
          aria-label={t('imageNode.controllers.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="grid min-h-0 grid-cols-4 gap-3 px-5 py-4 transition-opacity duration-200"
        style={{ opacity: cameraEnabled ? 1 : 0.4 }}
      >
        <CameraSelectorColumn
          icon={(
            <div className="relative flex items-center gap-1">
              <Camera className="h-8 w-8" />
              <MoveVertical className="h-5 w-5 opacity-65" />
            </div>
          )}
          title={t('imageNode.controllers.camera.height.title')}
          options={CAMERA_HEIGHT_OPTIONS}
          value={camera.height}
          disabled={disabled || !cameraEnabled}
          onChange={(height) => updateCamera({ height })}
        />
        <CameraSelectorColumn
          icon={<Aperture className="h-10 w-10" strokeWidth={1.35} />}
          title={t('imageNode.controllers.camera.lens.title')}
          options={CAMERA_LENS_OPTIONS}
          value={camera.lens}
          disabled={disabled || !cameraEnabled}
          onChange={(lens) => updateCamera({ lens })}
        />
        <CameraSelectorColumn
          icon={<Grid3X3 className="h-9 w-9" strokeWidth={1.2} />}
          title={t('imageNode.controllers.camera.perspective.title')}
          options={CAMERA_PERSPECTIVE_OPTIONS}
          value={camera.perspective}
          disabled={disabled || !cameraEnabled}
          onChange={(perspective) => updateCamera({ perspective })}
        />
        <CameraSelectorColumn
          icon={<Focus className="h-10 w-10" strokeWidth={1.25} />}
          title={t('imageNode.controllers.camera.depthOfField.title')}
          options={CAMERA_DEPTH_OPTIONS}
          value={camera.depthOfField}
          disabled={disabled || !cameraEnabled}
          onChange={(depthOfField) => updateCamera({ depthOfField })}
        />
      </div>

      <div className="mx-5 mb-5 flex min-h-[58px] items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-2.5">
        <span className="shrink-0 text-[12px] font-medium text-white/52">
          {t('imageNode.controllers.camera.currentConfiguration')}
        </span>
        <div
          className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 transition-opacity duration-200"
          style={{ opacity: cameraEnabled ? 1 : 0.32 }}
          aria-hidden={!cameraEnabled}
        >
          {summary.map((label) => (
            <span
              key={label}
              className="rounded-md border border-white/[0.08] bg-white/[0.035] px-2 py-1 text-[12px] text-white/72"
            >
              {label}
            </span>
          ))}
        </div>
        <label className="flex shrink-0 items-center gap-2.5 text-[12px] text-white/62">
          <span>{t('imageNode.controllers.camera.cameraControl')}</span>
          <Switch
            checked={cameraEnabled}
            disabled={disabled}
            onCheckedChange={setCameraEnabled}
            style={{
              background: cameraEnabled
                ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR
                : 'rgba(255,255,255,0.12)',
            }}
          />
        </label>
      </div>
    </div>
  );
}

function CameraSelectorColumn<T extends string>({
  icon,
  title,
  options,
  value,
  disabled,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  options: CameraOption<T>[];
  value: T;
  disabled: boolean;
  onChange: (value: T) => void;
}) {
  const { t } = useTranslation();
  const selectedOption = options.find((option) => option.value === value) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const wheelAreaRef = useRef<HTMLDivElement>(null);
  const getOptionAtOffset = (offset: number) => {
    const index = (selectedIndex + offset + options.length) % options.length;
    return options[index];
  };
  const selectOffset = (offset: -1 | 1) => {
    if (disabled) return;
    onChange(getOptionAtOffset(offset).value);
  };
  useEffect(() => {
    const wheelArea = wheelAreaRef.current;
    if (!wheelArea) return;

    let accumulatedDelta = 0;
    let lastChangeAt = 0;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (disabled) return;

      const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      accumulatedDelta += delta;
      const now = Date.now();
      if (Math.abs(accumulatedDelta) < 8 || now - lastChangeAt < 120) return;

      selectOffset(accumulatedDelta > 0 ? 1 : -1);
      accumulatedDelta = 0;
      lastChangeAt = now;
    };

    wheelArea.addEventListener('wheel', handleWheel, { passive: false });
    return () => wheelArea.removeEventListener('wheel', handleWheel);
  });
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      selectOffset(-1);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      selectOffset(1);
    }
  };
  const visibleOptions = ([-1, 0, 1] as const).map((offset) => ({
    offset,
    option: getOptionAtOffset(offset),
  }));

  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.012]">
      <div className="flex h-11 items-center justify-center px-3 text-[13px] font-medium text-white/74">
        <span className="truncate">{title}</span>
      </div>
      <div className="flex h-[98px] items-center justify-center border-y border-white/[0.045]">
        <div className="flex h-[72px] w-[82px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.022] text-white/48">
          {icon}
        </div>
      </div>
      <div
        ref={wheelAreaRef}
        className="relative h-[188px] overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/[0.10]"
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="listbox"
        aria-label={title}
        aria-disabled={disabled}
      >
        <div
          className="pointer-events-none absolute inset-x-2 top-1/2 z-10 h-12 -translate-y-1/2 rounded-lg"
          style={{
            background: `linear-gradient(${CANVAS_NODE_CARD_SELECTED_BORDER_COLOR}1a, ${CANVAS_NODE_CARD_SELECTED_BORDER_COLOR}1a), ${FLOATING_PANEL_BACKGROUND}`,
            boxShadow: `inset 0 0 0 1px ${CANVAS_NODE_CARD_SELECTED_BORDER_COLOR}47`,
          }}
        />
        <div
          className="pointer-events-none absolute bottom-3 left-4 top-3 z-0 w-px opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.25px)',
            backgroundPosition: 'center',
            backgroundSize: '1px 7px',
          }}
        />
        <div
          className="pointer-events-none absolute bottom-3 right-4 top-3 z-0 w-px opacity-70"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.24) 1px, transparent 1.25px)',
            backgroundPosition: 'center',
            backgroundSize: '1px 7px',
          }}
        />
        {visibleOptions.map(({ option, offset }) => {
          const selected = offset === 0;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`absolute inset-x-2 flex h-12 items-center justify-center rounded-lg px-3 text-center transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-35 ${selected ? 'z-20' : 'z-[5] hover:text-white/74'}`}
              style={{
                top: `calc(50% + ${offset * 54}px)`,
                transform: 'translateY(-50%)',
                color: selected ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.58)',
                opacity: selected ? 1 : 0.48,
              }}
            >
              {selected && <ChevronRight className="h-3 w-3 shrink-0" style={{ color: CANVAS_NODE_CARD_SELECTED_BORDER_COLOR }} />}
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{t(option.labelKey)}</span>
              {selected && <ChevronLeft className="h-3 w-3 shrink-0" style={{ color: CANVAS_NODE_CARD_SELECTED_BORDER_COLOR }} />}
            </button>
          );
        })}
      </div>
      <div className="flex h-10 items-center justify-center border-t border-white/[0.05] px-2 text-[12px] text-white/46">
        {selectedOption.range ?? ''}
      </div>
    </section>
  );
}
