import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Aperture, Camera, ChevronDown, ChevronUp, MoveVertical, ScanLine, X } from 'lucide-react';
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

const DEFAULT_CAMERA_CONTROL: CameraControlData = {
  enabled: false,
  height: 'slightlyHigh',
  focalLength: 35,
  aperture: 'f/8',
  twoPointPerspective: true,
};

const CAMERA_HEIGHT_OPTIONS: CameraOption<CameraHeight>[] = [
  { value: 'low', label: 'imageNode.camera.height.options.low', helper: '0.2–1.3m' },
  { value: 'eyeLevel', label: 'imageNode.camera.height.options.eyeLevel', helper: '1.4–1.8m' },
  { value: 'slightlyHigh', label: 'imageNode.camera.height.options.slightlyHigh', helper: '1.9–4.0m' },
  { value: 'semiBirdsEye', label: 'imageNode.camera.height.options.semiBirdsEye', helper: '4.1–15m' },
  { value: 'birdsEye', label: 'imageNode.camera.height.options.birdsEye', helper: '15.1m+' },
];

const FOCAL_LENGTH_OPTIONS: CameraOption<CameraFocalLength>[] = [16, 24, 28, 35, 50, 70, 100].map((value) => ({
  value: value as CameraFocalLength,
  label: String(value),
  helper: 'mm',
}));

const APERTURE_OPTIONS: CameraOption<CameraAperture>[] = ['f/1.8', 'f/2.8', 'f/4', 'f/5.6', 'f/8', 'f/11', 'f/16'].map((value) => ({
  value: value as CameraAperture,
  label: value,
  helper: value,
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
  const camera = useMemo(() => ({ ...DEFAULT_CAMERA_CONTROL, ...value }), [value]);
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
          icon={<CameraHeightIcon />}
          title={t('imageNode.camera.height.title')}
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
  const optionAt = useCallback((offset: number) => options[(selectedIndex + offset + options.length) % options.length], [options, selectedIndex]);
  const selectOffset = useCallback((offset: -1 | 1) => {
    if (disabled) return;
    setClickMotion({ direction: offset, sequence: performance.now() });
    onChange(optionAt(offset).value);
  }, [disabled, onChange, optionAt]);
  const selected = optionAt(0);
  const labelFor = (option: CameraOption<T>) => translateLabels ? t(option.label) : option.label;

  return (
    <section
      data-camera-wheel-column={column}
      className="nodrag nopan nowheel flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.07] bg-black/[0.08]"
    >
      <div className="flex h-11 items-center justify-center px-3 text-[13px] font-medium tracking-[0.03em] text-white/68">{title}</div>
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
        <button type="button" disabled={disabled} onClick={() => selectOffset(-1)} className="absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-center text-white/28 transition-colors hover:text-white/65 disabled:cursor-default"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" disabled={disabled} onClick={() => selectOffset(1)} className="absolute inset-x-0 bottom-0 z-30 flex h-8 items-center justify-center text-white/28 transition-colors hover:text-white/65 disabled:cursor-default"><ChevronDown className="h-4 w-4" /></button>
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-10 h-11 -translate-y-1/2 rounded-lg border border-white/[0.10] bg-white/[0.045]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-12 bg-gradient-to-b from-[#252526] via-[#252526]/80 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-12 bg-gradient-to-t from-[#252526] via-[#252526]/80 to-transparent" />
        {([-1, 0, 1] as const).map((offset) => {
          const option = optionAt(offset);
          return (
            <button
              key={`${option.value}-${offset}-${wheelMotion.sequence}`}
              type="button"
              disabled={disabled}
              onClick={() => offset === 0 ? undefined : selectOffset(offset)}
              className={`absolute inset-x-3 z-[15] flex h-11 items-center justify-center rounded-lg px-3 text-center transition-all duration-200 ease-out disabled:cursor-default ${
                wheelMotion.sequence > 0
                  ? wheelMotion.direction > 0
                    ? 'animate-in fade-in slide-in-from-bottom-2'
                    : 'animate-in fade-in slide-in-from-top-2'
                  : ''
              }`}
              style={{
                top: `calc(50% + ${offset * 49}px)`,
                transform: 'translateY(-50%)',
                color: offset === 0 ? 'rgba(255,255,255,0.94)' : 'rgba(255,255,255,0.40)',
                opacity: offset === 0 ? 1 : 0.58,
                fontSize: offset === 0 ? 15 : 13,
              }}
            >
              <span className="truncate font-medium tabular-nums">{labelFor(option)}</span>
            </button>
          );
        })}
      </div>
      <div className="flex h-10 items-center justify-center border-t border-white/[0.05] px-2 text-[12px] tabular-nums text-white/42">{selected.helper}</div>
    </section>
  );
}

function optionAtStep<T extends string | number>(options: CameraOption<T>[], value: T, step: -1 | 1) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  return options[(index + step + options.length) % options.length];
}

function stepCameraValue(
  camera: CameraControlData,
  column: CameraWheelColumn,
  step: -1 | 1,
): CameraControlData {
  if (column === 'position') {
    return { ...camera, height: optionAtStep(CAMERA_HEIGHT_OPTIONS, camera.height, step).value };
  }
  if (column === 'focalLength') {
    return { ...camera, focalLength: optionAtStep(FOCAL_LENGTH_OPTIONS, camera.focalLength, step).value };
  }
  return { ...camera, aperture: optionAtStep(APERTURE_OPTIONS, camera.aperture, step).value };
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

function CameraHeightIcon() {
  return <div className="relative flex items-center gap-1"><Camera className="h-8 w-8" strokeWidth={1.35} /><MoveVertical className="h-5 w-5 opacity-60" strokeWidth={1.25} /></div>;
}

function LensIcon() {
  return <div className="relative flex items-center justify-center"><ScanLine className="absolute h-11 w-11 opacity-25" strokeWidth={1} /><div className="flex h-9 w-9 items-center justify-center rounded-full border border-current"><div className="h-5 w-5 rounded-full border border-current opacity-70" /></div></div>;
}
