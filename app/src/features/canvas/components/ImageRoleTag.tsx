import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { imageRoleOptions, getImageRoleOption, validateCustomReferenceLabel } from '../constants/imageUsages';
import { FLOATING_PANEL_BACKGROUND } from '../constants/canvasConstants';
import type { ImageRole } from '../types/imageNode.types';

export function ImageRoleTag({
  role,
  customRoleLabel,
  onChange,
  open: controlledOpen,
  onOpenChange,
}: {
  role: ImageRole | null;
  customRoleLabel?: string;
  onChange: (role: ImageRole, customRoleLabel?: string) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [hoveredRole, setHoveredRole] = useState<ImageRole | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOption = getImageRoleOption(role, customRoleLabel);
  const previewOption = getImageRoleOption(hoveredRole || role, hoveredRole === 'custom_reference' ? customInput : customRoleLabel);
  const DisplayIcon = selectedOption?.Icon || Building2;
  const customUsageSuggestions = [
    t('imageNode.customSuggestions.paving', { defaultValue: '铺装参考' }),
    t('imageNode.customSuggestions.waterscape', { defaultValue: '水景参考' }),
    t('imageNode.customSuggestions.facadeLight', { defaultValue: '立面灯光' }),
    t('imageNode.customSuggestions.indoorFurniture', { defaultValue: '室内家具' }),
  ];

  useEffect(() => {
    if (!open) {
      setShowCustomInput(false);
      setHoveredRole(null);
    }
  }, [open]);

  useEffect(() => {
    if (showCustomInput) {
      customInputRef.current?.focus();
    }
  }, [showCustomInput]);

  const submitCustomRole = () => {
    const result = validateCustomReferenceLabel(customInput);
    if (!result.ok) {
      setShowCustomInput(false);
      return;
    }
    onChange('custom_reference', result.label);
    setCustomInput('');
    setShowCustomInput(false);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && rootRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      setShowCustomInput(false);
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, setOpen]);

  return (
    <div
      ref={rootRef}
      className="absolute z-30 nodrag nowheel"
      style={{ top: 8, left: 8 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="image-role-tag-button flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-colors"
          style={{
            background: selectedOption ? 'rgba(27, 36, 52, 0.82)' : 'rgba(20, 22, 28, 0.78)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${selectedOption ? selectedOption.color : 'rgba(255,255,255,0.2)'}`,
            color: selectedOption ? '#eaf7ff' : 'rgba(255,255,255,0.8)',
            boxShadow: selectedOption ? '0 0 0 1px rgba(0,212,255,0.08), 0 10px 24px rgba(0,0,0,0.34)' : '0 8px 18px rgba(0,0,0,0.28)',
          }}
        >
          <DisplayIcon className="h-2.5 w-2.5" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.68)' }} />
          <span>{selectedOption?.label || t('imageNode.definePurpose')}</span>
          <ChevronDown className="h-2.5 w-2.5" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.6)' }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 top-[28px] w-[214px] overflow-hidden rounded-[14px] p-1.5"
          onMouseLeave={() => setHoveredRole(null)}
          style={{
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
              <button
                key={option.value}
                type="button"
                onMouseEnter={() => setHoveredRole(option.value)}
                onFocus={() => setHoveredRole(option.value)}
                onClick={() => {
                  if (option.value === 'custom_reference') {
                    setShowCustomInput(true);
                    setCustomInput('');
                    return;
                  }
                  onChange(option.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12px] transition-colors"
                style={{
                  background: hovered ? 'rgba(255,255,255,0.09)' : active ? 'rgba(255,255,255,0.045)' : 'transparent',
                  color: hovered ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.82)',
                }}
              >
                <option.Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />
                <span className="flex-1 font-medium">{option.label}</span>
                {active && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: option.color }} />}
              </button>
            );
          })}
          {showCustomInput && (
            <div
              className="mx-1.5 my-1.5 rounded-[10px] p-2"
              style={{
                background: 'rgba(255,255,255,0.045)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <input
                ref={customInputRef}
                value={customInput}
                onChange={(event) => setCustomInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    submitCustomRole();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setShowCustomInput(false);
                    setOpen(false);
                  }
                }}
                placeholder={t('imageNode.customReferencePlaceholder', { defaultValue: '输入用途名称' })}
                className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.9)',
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {customUsageSuggestions.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCustomInput(label)}
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
              <div className="mt-2 text-[11px] leading-4" style={{ color: 'rgba(255,255,255,0.44)' }}>
                {t('imageNode.customReferenceDesc', { defaultValue: '用于定义具体局部参考内容。' })}
              </div>
            </div>
          )}
          {!showCustomInput && (
            <div
              className="mx-1.5 mt-2 border-t px-1 pt-3 pb-1.5 text-[12px] leading-relaxed"
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
                      className="rounded-md px-1.5 py-0.5 text-[10px] whitespace-nowrap"
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
