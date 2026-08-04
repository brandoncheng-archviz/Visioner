import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Aperture, ChevronDown, ChevronUp, ScanLine, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Switch } from '@/components/ui/switch';
import { CANVAS_NODE_CARD_SELECTED_BORDER_COLOR } from '../../constants/canvasConstants';
import type {
  CameraAperture,
  CameraControlData,
  CameraFocalLength,
  CameraHeight,
} from '../../types/imageNodeData.types';
import {
  applyDiscreteWheelDelta,
  INITIAL_DISCRETE_WHEEL_STATE,
  normalizeWheelDelta,
  type DiscreteWheelState,
} from '../../utils/discreteWheel';
import { CameraPositionIcon } from './CameraPositionIcon';
import { CameraHeightGuide } from './CameraHeightGuide';
import { CameraApertureGuide, CameraFocalLengthGuide } from './CameraOpticsGuide';
import {
  CAMERA_APERTURE_PRESETS,
  CAMERA_FOCAL_LENGTH_PRESETS,
  CAMERA_HEIGHT_PRESETS,
  resolveCameraControl,
} from './cameraControlDisplay';

interface CameraOption<T extends string | number> {
  value: T;
  label: string;
  helper?: string;
}

type CameraWheelColumn = 'position' | 'focalLength' | 'aperture';

interface CameraWheelMotion {
  direction: -1 | 1;
  sequence: number;
}

const CAMERA_WHEEL_THRESHOLD = 32;
// Keep wheel-driven changes slower than the 200ms selector transition so a
// fast mouse wheel or trackpad fling cannot visually outrun the animation.
const CAMERA_WHEEL_MIN_STEP_INTERVAL_MS = 240;
const CAMERA_WHEEL_IDLE_RESET_MS = 360;

const createWheelStateByColumn = (): Record<CameraWheelColumn, DiscreteWheelState> => ({
  position: { ...INITIAL_DISCRETE_WHEEL_STATE },
  focalLength: { ...INITIAL_DISCRETE_WHEEL_STATE },
  aperture: { ...INITIAL_DISCRETE_WHEEL_STATE },
});

const createWheelMotionByColumn = (): Record<CameraWheelColumn, CameraWheelMotion> => ({
  position: { direction: 1, sequence: 0 },
  focalLength: { direction: 1, sequence: 0 },
  aperture: { direction: 1, sequence: 0 },
});

const CAMERA_HEIGHT_OPTIONS: CameraOption<CameraHeight>[] = CAMERA_HEIGHT_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.labelKey,
  helper: preset.fixedValue,
}));

const FOCAL_LENGTH_OPTIONS: CameraOption<CameraFocalLength>[] = CAMERA_FOCAL_LENGTH_PRESETS.map((preset) => ({
  value: preset.value,
  label: String(preset.value),
  helper: 'mm',
}));

const APERTURE_OPTIONS: CameraOption<CameraAperture>[] = CAMERA_APERTURE_PRESETS.map((preset) => ({
  value: preset.value,
  label: preset.value,
  helper: preset.value,
}));

export function CameraControlPanel({
  value,
  disabled = false,
  onChange,
  onClose,
}: {
  value?: CameraControlData;
  disabled?: boolean;
  onChange: (value: CameraControlData) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const camera = useMemo(() => resolveCameraControl(value), [value]);
  const parameterDisabled = disabled || !camera.enabled;
  const panelRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef(camera);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  const wheelStateRef = useRef(createWheelStateByColumn());
  const [wheelMotionByColumn, setWheelMotionByColumn] = useState(createWheelMotionByColumn);

  useLayoutEffect(() => {
    cameraRef.current = camera;
    disabledRef.current = disabled;
    onChangeRef.current = onChange;
  }, [camera, disabled, onChange]);

  const update = <K extends keyof CameraControlData>(key: K, nextValue: CameraControlData[K]) => {
    if (disabled) return;
    onChange({ ...camera, [key]: nextValue });
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const resetWheelStateAfterIdle = () => {
      globalThis.clearTimeout(idleTimer);
      idleTimer = globalThis.setTimeout(() => {
        wheelStateRef.current = createWheelStateByColumn();
      }, CAMERA_WHEEL_IDLE_RESET_MS);
    };

    const handlePanelWheelCapture = (event: WheelEvent) => {
      const columnElement = event.composedPath().find((entry) => (
        entry instanceof HTMLElement && entry.dataset.cameraWheelColumn
      ));
      const column = columnElement instanceof HTMLElement
        ? columnElement.dataset.cameraWheelColumn as CameraWheelColumn | undefined
        : undefined;
      if (!column) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      resetWheelStateAfterIdle();

      const currentCamera = cameraRef.current;
      if (disabledRef.current || !currentCamera.enabled) return;

      const delta = normalizeWheelDelta(
        event.deltaX,
        event.deltaY,
        event.deltaMode,
        window.innerHeight,
      );
      const now = performance.now();
      const result = applyDiscreteWheelDelta(
        wheelStateRef.current[column],
        delta,
        now,
        CAMERA_WHEEL_THRESHOLD,
        CAMERA_WHEEL_MIN_STEP_INTERVAL_MS,
      );
      wheelStateRef.current[column] = result.state;
      if (result.step === 0) return;

      const nextCamera = stepCameraValue(currentCamera, column, result.step);
      if (nextCamera === currentCamera) return;
      cameraRef.current = nextCamera;
      onChangeRef.current(nextCamera);
      setWheelMotionByColumn((current) => ({
        ...current,
        [column]: {
          direction: result.step,
          sequence: now,
        },
      }));
    };

    panel.addEventListener('wheel', handlePanelWheelCapture, { capture: true, passive: false });
    return () => {
      panel.removeEventListener('wheel', handlePanelWheelCapture, { capture: true });
      globalThis.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <div ref={panelRef} data-camera-wheel-panel="true" className="flex min-h-0 flex-col">
      <header className="flex items-start gap-4 border-b border-white/[0.06] px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-white/92">{t('imageNode.camera.header')}</h2>
          <p className="mt-1 text-[12px] tracking-[0.04em] text-white/40">{t('imageNode.camera.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/42 transition-colors hover:bg-white/[0.06] hover:text-white/78"
          aria-label={t('common.actions.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-3 gap-3 px-5 py-4 transition-all duration-200" style={{ opacity: camera.enabled ? 1 : 0.34 }}>
        <CameraWheelSelector
          column="position"
          icon={<CameraPositionIcon className="h-11 w-11" />}
          title={t('imageNode.camera.height.title')}
          titleAdornment={<CameraHeightGuide />}
          options={CAMERA_HEIGHT_OPTIONS}
          value={camera.height}
          wheelMotion={wheelMotionByColumn.position}
          disabled={parameterDisabled}
          translateLabels
          onChange={(height) => update('height', height)}
        />
        <CameraWheelSelector
          column="focalLength"
          icon={<LensIcon />}
          title={t('imageNode.camera.focalLength.title')}
          titleAdornment={<CameraFocalLengthGuide />}
          options={FOCAL_LENGTH_OPTIONS}
          value={camera.focalLength}
          wheelMotion={wheelMotionByColumn.focalLength}
          disabled={parameterDisabled}
          onChange={(focalLength) => update('focalLength', focalLength)}
        />
        <CameraWheelSelector
          column="aperture"
          icon={<Aperture className="h-10 w-10" strokeWidth={1.15} />}
          title={t('imageNode.camera.aperture.title')}
          titleAdornment={<CameraApertureGuide />}
          options={APERTURE_OPTIONS}
          value={camera.aperture}
          wheelMotion={wheelMotionByColumn.aperture}
          disabled={parameterDisabled}
          onChange={(aperture) => update('aperture', aperture)}
        />
      </div>

      <footer className="mx-5 mb-5 flex min-h-[62px] items-center gap-4 rounded-xl border border-white/[0.07] bg-white/[0.018] px-3.5 py-2.5">
        <span className="shrink-0 text-[12px] font-medium text-white/48">{t('imageNode.camera.currentConfiguration')}</span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 transition-opacity duration-200" style={{ opacity: camera.enabled ? 1 : 0.25 }}>
          <SummaryChip>{t(CAMERA_HEIGHT_OPTIONS.find((option) => option.value === camera.height)?.label ?? CAMERA_HEIGHT_OPTIONS[2].label)}</SummaryChip>
          <SummaryChip>{camera.focalLength}mm</SummaryChip>
          <SummaryChip>{camera.aperture}</SummaryChip>
          {camera.twoPointPerspective && <SummaryChip muted>{t('imageNode.camera.twoPointPerspective')}</SummaryChip>}
        </div>
        <div className="flex shrink-0 items-center gap-5 border-l border-white/[0.06] pl-4">
          <CameraSwitch
            label={t('imageNode.camera.twoPointPerspective')}
            checked={camera.twoPointPerspective}
            disabled={parameterDisabled}
            onCheckedChange={(checked) => update('twoPointPerspective', checked)}
          />
          <CameraSwitch
            label={t('imageNode.camera.cameraControl')}
            checked={camera.enabled}
            disabled={disabled}
            onCheckedChange={(checked) => update('enabled', checked)}
          />
        </div>
      </footer>
    </div>
  );
}

function CameraWheelSelector<T extends string | number>({
  column,
  icon,
  title,
  titleAdornment,
  options,
  value,
  wheelMotion: externalWheelMotion,
  disabled,
  translateLabels = false,
  onChange,
}: {
  column: CameraWheelColumn;
  icon: ReactNode;
  title: string;
  titleAdornment?: ReactNode;
  options: CameraOption<T>[];
  value: T;
  wheelMotion: CameraWheelMotion;
  disabled: boolean;
  translateLabels?: boolean;
  onChange: (value: T) => void;
}) {
  const { t } = useTranslation();
  const [clickMotion, setClickMotion] = useState<CameraWheelMotion>({ direction: 1, sequence: 0 });
  const wheelMotion = externalWheelMotion.sequence > clickMotion.sequence ? externalWheelMotion : clickMotion;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const optionAt = useCallback((offset: number) => options[selectedIndex + offset], [options, selectedIndex]);
  const hasPrevious = selectedIndex > 0;
  const hasNext = selectedIndex < options.length - 1;
  const selectOffset = useCallback((offset: -1 | 1) => {
    if (disabled) return;
    const nextOption = optionAt(offset);
    if (!nextOption) return;
    setClickMotion({ direction: offset, sequence: performance.now() });
    onChange(nextOption.value);
  }, [disabled, onChange, optionAt]);
  const selected = options[selectedIndex];
  const labelFor = (option: CameraOption<T>) => translateLabels ? t(option.label) : option.label;

  return (
    <section
      data-camera-wheel-column={column}
      className="nodrag nopan nowheel flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/[0.08]"
    >
      <div className="flex h-11 items-center justify-center px-3 text-[13px] font-medium tracking-[0.03em] text-white/68">
        <span className="relative">
          {title}
          {titleAdornment && (
            <span className="absolute left-full top-1/2 ml-1 -translate-y-1/2">{titleAdornment}</span>
          )}
        </span>
      </div>
      <div className="flex h-[92px] items-center justify-center border-y border-white/[0.045] bg-white/[0.008]">
        <div className="flex h-[68px] w-[82px] items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] text-white/46">{icon}</div>
      </div>
      <div
        className="nodrag nopan nowheel relative h-[166px] overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/[0.15]"
        tabIndex={disabled ? -1 : 0}
        role="listbox"
        aria-label={title}
        aria-disabled={disabled}
        onKeyDown={(event) => {
          if (event.key === 'ArrowUp') { event.preventDefault(); selectOffset(-1); }
          if (event.key === 'ArrowDown') { event.preventDefault(); selectOffset(1); }
        }}
      >
        <button type="button" disabled={disabled || !hasPrevious} onClick={() => selectOffset(-1)} className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-center text-white/28 transition-colors hover:text-white/65 disabled:cursor-default disabled:text-white/10"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" disabled={disabled || !hasNext} onClick={() => selectOffset(1)} className="absolute inset-x-0 bottom-0 z-30 flex h-8 items-center justify-center text-white/28 transition-colors hover:text-white/65 disabled:cursor-default disabled:text-white/10"><ChevronDown className="h-4 w-4" /></button>
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-11 -translate-y-1/2 rounded-lg border border-white/[0.10] bg-white/[0.045]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-[#252526] via-[#252526]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-[#252526] via-[#252526]/80 to-transparent" />
        {([-1, 0, 1] as const).map((offset) => {
          const option = optionAt(offset);
          if (!option) {
            return (
              <div
                key={`boundary-${offset}`}
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 z-[15] flex h-11 items-center justify-center text-[13px] text-white/10"
                style={{ top: `calc(50% + ${offset * 49}px)`, transform: 'translateY(-50%)' }}
              >
                —
              </div>
            );
          }
          const optionButton = (
            <button
              type="button"
              disabled={disabled}
              onClick={() => offset === 0 ? undefined : selectOffset(offset)}
              className={`flex h-11 w-full items-center justify-center rounded-lg px-3 text-center transition-all duration-200 ease-out disabled:cursor-default ${
                wheelMotion.sequence > 0
                  ? wheelMotion.direction > 0
                    ? 'animate-in fade-in slide-in-from-bottom-2'
                    : 'animate-in fade-in slide-in-from-top-2'
                  : ''
              }`}
              style={{
                color: offset === 0 ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.40)',
                opacity: offset === 0 ? 1 : 0.58,
                fontSize: offset === 0 ? 15 : 13,
              }}
            >
              <span className="truncate font-medium tabular-nums">{labelFor(option)}</span>
            </button>
          );
          return (
            <div
              key={`${option.value}-${offset}-${wheelMotion.sequence}`}
              className="absolute inset-x-3 z-[15] h-11"
              style={{ top: `calc(50% + ${offset * 49}px)`, transform: 'translateY(-50%)' }}
            >
              {optionButton}
            </div>
          );
        })}
      </div>
      <div className="flex h-10 items-center justify-center border-t border-white/[0.05] px-2 text-[12px] tabular-nums text-white/42">{selected.helper}</div>
    </section>
  );
}

function optionAtStep<T extends string | number>(options: CameraOption<T>[], value: T, step: -1 | 1) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return options[index + step];
}

function stepCameraValue(
  camera: CameraControlData,
  column: CameraWheelColumn,
  step: -1 | 1,
): CameraControlData {
  if (column === 'position') {
    const option = optionAtStep(CAMERA_HEIGHT_OPTIONS, camera.height, step);
    return option ? { ...camera, height: option.value } : camera;
  }
  if (column === 'focalLength') {
    const option = optionAtStep(FOCAL_LENGTH_OPTIONS, camera.focalLength, step);
    return option ? { ...camera, focalLength: option.value } : camera;
  }
  const option = optionAtStep(APERTURE_OPTIONS, camera.aperture, step);
  return option ? { ...camera, aperture: option.value } : camera;
}

function CameraSwitch({ label, checked, disabled, onCheckedChange }: { label: string; checked: boolean; disabled: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className={`flex items-center gap-2.5 text-[12px] ${disabled ? 'text-white/30' : 'text-white/62'}`}>
      <span className="whitespace-nowrap">{label}</span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        style={{ background: checked ? CANVAS_NODE_CARD_SELECTED_BORDER_COLOR : 'rgba(255,255,255,0.12)' }}
      />
    </label>
  );
}

function SummaryChip({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return <span className={`rounded-md border px-2 py-1 text-[12px] ${muted ? 'border-white/[0.06] bg-transparent text-white/44' : 'border-white/[0.08] bg-white/[0.035] text-white/72'}`}>{children}</span>;
}

function LensIcon() {
  return <div className="relative flex items-center justify-center"><ScanLine className="absolute h-11 w-11 opacity-25" strokeWidth={1} /><div className="flex h-9 w-9 items-center justify-center rounded-full border border-current"><div className="h-5 w-5 rounded-full border border-current opacity-70" /></div></div>;
}
