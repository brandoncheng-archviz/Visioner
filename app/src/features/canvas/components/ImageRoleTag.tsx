import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { ChevronDown, Check, Building2, MousePointerClick } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  imageRoleOptions,
  getImageRoleOption,
  getImageRoleLabel,
  localReferenceOptions,
  normalizeLocalReferenceType,
} from '../constants/imageUsages';
import { FLOATING_PANEL_BACKGROUND } from '../constants/canvasConstants';
import type { ImageRole, LocalReferenceType } from '../types/imageNode.types';

export function ImageRoleTag({
  role,
  customRoleLabel,
  localReferenceType,
  localReferenceLabel,
  onChange,
  onStartPointPick,
  open: controlledOpen,
  onOpenChange,
  rootClassName = 'absolute z-30 nodrag nowheel',
  rootStyle,
  hideTrigger = false,
  popoverTop = 28,
  disabled = false,
}: {
  role: ImageRole | null;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  onChange: (role: ImageRole | null, customRoleLabel?: string, localRefType?: LocalReferenceType, localRefLabel?: string) => void;
  onStartPointPick?: () => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  rootClassName?: string;
  rootStyle?: CSSProperties;
  hideTrigger?: boolean;
  popoverTop?: number;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const rawOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const open = disabled ? false : rawOpen;
  const [hoveredRole, setHoveredRole] = useState<ImageRole | null>(null);
  const [isTagHovered, setIsTagHovered] = useState(false);
  const [expandedLocalRef, setExpandedLocalRef] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayLabel = getImageRoleLabel(role, customRoleLabel, localReferenceType, localReferenceLabel);
  const normalizedLocalReferenceType = normalizeLocalReferenceType(localReferenceType);
  const selectedOption = getImageRoleOption(role, customRoleLabel);
  const previewOption = getImageRoleOption(hoveredRole || role);
  const DisplayIcon = selectedOption?.Icon || Building2;

  const hasActiveRole = Boolean(role && role !== 'undefined_usage');

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (disabled) {
        setInternalOpen(false);
        onOpenChange?.(false);
        return;
      }
      if (controlledOpen === undefined) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [controlledOpen, disabled, onOpenChange],
  );

  useEffect(() => {
    if (!open) {
      const raf = requestAnimationFrame(() => {
        setHoveredRole(null);
        setExpandedLocalRef(false);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  useEffect(() => {
    if (!disabled) return;
    setInternalOpen(false);
    onOpenChange?.(false);
    setIsTagHovered(false);
    setHoveredRole(null);
    setExpandedLocalRef(false);
  }, [disabled, onOpenChange]);

  const handleSelectPrimary = (nextRole: ImageRole) => {
    if (disabled) return;
    if (nextRole === 'local_reference') {
      setExpandedLocalRef(true);
      return;
    }
    onChange(nextRole);
    handleOpenChange(false);
  };

  const handleSelectLocalType = (type: LocalReferenceType, label: string) => {
    if (disabled) return;
    onChange('local_reference', undefined, type, label);
    setExpandedLocalRef(false);
    handleOpenChange(false);
  };

  const handleClearUsage = () => {
    if (disabled) return;
    onChange('undefined_usage', undefined, undefined, undefined);
    handleOpenChange(false);
  };

  const handleStartPointPick = () => {
    if (disabled) return;
    if (onStartPointPick) {
      onStartPointPick();
      handleOpenChange(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      handleOpenChange(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (expandedLocalRef) {
        setExpandedLocalRef(false);
        return;
      }
      handleOpenChange(false);
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, handleOpenChange, expandedLocalRef]);

  return (
    <div
      ref={rootRef}
      className={rootClassName}
      style={rootStyle || { top: 9, left: 9 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {!hideTrigger && (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onPointerDown={(event) => {
              if (!disabled) return;
              event.preventDefault();
              event.stopPropagation();
              handleOpenChange(false);
            }}
            onMouseDown={(event) => {
              if (!disabled) return;
              event.preventDefault();
              event.stopPropagation();
              handleOpenChange(false);
            }}
            onClick={() => {
              if (disabled) {
                handleOpenChange(false);
                return;
              }
              handleOpenChange(!open);
            }}
            onMouseEnter={() => {
              if (disabled) return;
              setIsTagHovered(true);
            }}
            onMouseLeave={() => {
              if (disabled) return;
              setIsTagHovered(false);
            }}
            className="image-role-tag-button flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-all disabled:cursor-default disabled:opacity-50"
            style={{
              background: isTagHovered && !disabled ? 'rgba(30, 41, 59, 0.86)' : 'rgba(15, 23, 42, 0.72)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              border: `1px solid ${isTagHovered && !disabled ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)'}`,
              color: 'rgba(255,255,255,0.88)',
              boxShadow: '0 8px 20px rgba(0,0,0,0.28)',
            }}
          >
            <DisplayIcon className="h-3 w-3" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.74)' }} />
            <span>{displayLabel || t('imageNode.definePurpose')}</span>
            <ChevronDown className="h-3 w-3" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.68)' }} />
          </button>
        </div>
      )}

      {open && (
        <div
          className="absolute left-0 overflow-hidden rounded-[14px] p-1.5"
          onMouseLeave={() => setHoveredRole(null)}
          style={{
            top: popoverTop,
            width: 330,
            maxWidth: 'calc(100vw - 32px)',
            background: FLOATING_PANEL_BACKGROUND,
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            border: '1px solid rgba(255,255,255,0.16)',
            boxShadow: '0 18px 42px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          {imageRoleOptions.map((option) => {
            const active = option.value === role;
            const hovered = hoveredRole === option.value;
            const isLocalRef = option.value === 'local_reference';
            return (
              <div key={option.value}>
                <button
                  type="button"
                  onMouseEnter={() => setHoveredRole(option.value)}
                  onFocus={() => setHoveredRole(option.value)}
                  onClick={() => handleSelectPrimary(option.value)}
                  className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[15px] transition-colors"
                  style={{
                    background: hovered ? 'rgba(255,255,255,0.09)' : active ? 'rgba(255,255,255,0.045)' : 'transparent',
                    color: hovered ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.82)',
                  }}
                >
                  <option.Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />
                  <span className="flex-1 font-medium">{option.label}</span>
                  {active && !isLocalRef && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />}
                  {active && isLocalRef && !expandedLocalRef && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />}
                </button>
                {isLocalRef && expandedLocalRef && (
                  <div className="mx-1.5 mb-1.5 mt-0.5 rounded-[10px] p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Section title */}
                    <div className="mb-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.54)' }}>
                      {t('reference.selectLocalElement', { defaultValue: '选择参考元素' })}
                    </div>

                    {/* Fixed chips */}
                    <div className="grid grid-cols-3 gap-1.5">
                      {localReferenceOptions.map((sub) => (
                        <button
                          key={sub.value}
                          type="button"
                          onClick={() => handleSelectLocalType(sub.value, sub.label)}
                          className="rounded-lg px-1.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/10"
                          style={{
                            background: normalizedLocalReferenceType === sub.value && !localReferenceLabel ? 'rgba(20,184,166,0.18)' : 'rgba(255,255,255,0.045)',
                            border: normalizedLocalReferenceType === sub.value && !localReferenceLabel ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(255,255,255,0.08)',
                            color: normalizedLocalReferenceType === sub.value && !localReferenceLabel ? '#2dd4bf' : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>

                    {/* Point-pick entry */}
                    {onStartPointPick && (
                      <button
                        type="button"
                        onClick={handleStartPointPick}
                        className="mt-2.5 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/5"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <MousePointerClick className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#2dd4bf' }} />
                        <div className="flex-1">
                          <div className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.84)' }}>
                            {t('reference.pointPickTitle', { defaultValue: '点选参考元素' })}
                          </div>
                          <div className="mt-0.5 text-[12px] leading-5" style={{ color: 'rgba(255,255,255,0.52)' }}>
                            {t('reference.pointPickHint', { defaultValue: '点击图片中的目标区域，选择要参考的局部内容' })}
                          </div>
                        </div>
                      </button>
                    )}

                  </div>
                )}
              </div>
            );
          })}

          {hasActiveRole && !expandedLocalRef && (
            <div className="mx-1.5 mt-1.5 border-t pt-2 pb-1" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <button
                type="button"
                onClick={handleClearUsage}
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.58)' }}
              >
                <span className="flex-1">{t('reference.clearUsage', { defaultValue: '清除参考用途' })}</span>
              </button>
            </div>
          )}

          {!expandedLocalRef && (
            <div
              className="mx-1.5 mt-2 border-t px-1 pt-3 pb-1.5 text-[14px] leading-relaxed"
              style={{
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.54)',
              }}
            >
              <div>{previewOption?.detail || t('reference.undefinedUsageDetail')}</div>
              {previewOption && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {previewOption.constraints.map((constraint) => (
                    <span
                      key={constraint}
                      className="rounded-md px-2 py-0.5 text-[12px] whitespace-nowrap"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(225,245,255,0.76)',
                      }}
                    >
                      <span style={{ color: previewOption.color }}>*</span> {t(`reference.constraints.${constraint}`, { defaultValue: constraint })}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
