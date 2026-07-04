import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  imageRoleOptions,
  getImageRoleOption,
  getImageRoleLabel,
} from '../constants/imageUsages';
import { FLOATING_PANEL_BACKGROUND } from '../constants/canvasConstants';
import type { ImageRole, LocalReferenceType } from '../types/imageNode.types';
import { stopCanvasWheelPropagation } from '../utils/canvasEvents';

export function ImageRoleTag({
  role,
  customRoleLabel,
  localReferenceType,
  localReferenceLabel,
  onChange,
  open: controlledOpen,
  onOpenChange,
  rootClassName = 'absolute z-30 nodrag nowheel',
  rootStyle,
  hideTrigger = false,
  disabled = false,
}: {
  role: ImageRole | null;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  onChange: (role: ImageRole | null, customRoleLabel?: string, localRefType?: LocalReferenceType, localRefLabel?: string) => void;
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
  const [rootElement, setRootElement] = useState<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayLabel = getImageRoleLabel(role, customRoleLabel, localReferenceType, localReferenceLabel);
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
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open]);

  useEffect(() => {
    if (!disabled) return;
    const raf = requestAnimationFrame(() => {
      setInternalOpen(false);
      onOpenChange?.(false);
      setIsTagHovered(false);
      setHoveredRole(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [disabled, onOpenChange]);

  const handleSelectPrimary = (nextRole: ImageRole) => {
    if (disabled) return;
    onChange(nextRole);
    handleOpenChange(false);
  };

  const handleClearUsage = () => {
    if (disabled) return;
    onChange('undefined_usage', undefined, undefined, undefined);
    handleOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && (rootElement?.contains(target) || menuRef.current?.contains(target))) {
        return;
      }
      handleOpenChange(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      handleOpenChange(false);
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, handleOpenChange, rootElement]);

  const anchorRect = open ? rootElement?.getBoundingClientRect() : null;
  const menuWidth = Math.min(330, window.innerWidth - 24);
  const estimatedHeight = 430;
  const availableBelow = anchorRect ? window.innerHeight - anchorRect.bottom - 20 : 0;
  const availableAbove = anchorRect ? anchorRect.top - 20 : 0;
  const openBelow = availableBelow >= Math.min(estimatedHeight, 280) || availableBelow >= availableAbove;
  const menuLeft = anchorRect
    ? Math.min(Math.max(12, anchorRect.left), window.innerWidth - menuWidth - 12)
    : 12;
  const menuTop = anchorRect ? (openBelow ? anchorRect.bottom + 8 : anchorRect.top - 8) : 12;
  const menuMaxHeight = Math.max(140, openBelow ? availableBelow : availableAbove);

  return (
    <>
      <div
      ref={setRootElement}
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

      </div>

      {open && anchorRect && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[4200] overflow-y-auto overscroll-contain rounded-[14px] p-1.5"
          onMouseLeave={() => setHoveredRole(null)}
          onWheelCapture={stopCanvasWheelPropagation}
          style={{
            left: menuLeft,
            top: menuTop,
            transform: openBelow ? undefined : 'translateY(-100%)',
            width: menuWidth,
            maxHeight: menuMaxHeight,
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
                  {active && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />}
                </button>
              </div>
            );
          })}

          {hasActiveRole && (
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
        </div>,
        document.body,
      )}
    </>
  );
}
