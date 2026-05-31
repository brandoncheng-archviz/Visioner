import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  imageRoleOptions,
  getImageRoleOption,
  getImageRoleLabel,
  localReferenceOptions,
  validateCustomReferenceLabel,
} from '../constants/imageUsages';
import { FLOATING_PANEL_BACKGROUND } from '../constants/canvasConstants';
import type { ImageRole, LocalReferenceType } from '../types/imageNode.types';

export function ImageRoleTag({
  role,
  customRoleLabel,
  localReferenceType,
  localReferenceLabel,
  onChange,
  open: controlledOpen,
  onOpenChange,
}: {
  role: ImageRole | null;
  customRoleLabel?: string;
  localReferenceType?: LocalReferenceType;
  localReferenceLabel?: string;
  onChange: (role: ImageRole | null, customRoleLabel?: string, localReferenceType?: LocalReferenceType, localReferenceLabel?: string) => void;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [hoveredRole, setHoveredRole] = useState<ImageRole | null>(null);
  const [isTagHovered, setIsTagHovered] = useState(false);
  const [expandedLocalRef, setExpandedLocalRef] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const customInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayLabel = getImageRoleLabel(role, customRoleLabel, localReferenceType, localReferenceLabel);
  const selectedOption = getImageRoleOption(role, customRoleLabel);
  const previewOption = getImageRoleOption(hoveredRole || role);
  const DisplayIcon = selectedOption?.Icon || Building2;

  const hasActiveRole = Boolean(role && role !== 'undefined_usage');

  useEffect(() => {
    if (!open) {
      setHoveredRole(null);
      setExpandedLocalRef(false);
      setCustomInput('');
    }
  }, [open]);

  useEffect(() => {
    if (expandedLocalRef) {
      customInputRef.current?.focus();
    }
  }, [expandedLocalRef]);

  const handleSelectPrimary = (nextRole: ImageRole) => {
    if (nextRole === 'local_reference') {
      setExpandedLocalRef(true);
      onChange('local_reference');
      return;
    }
    onChange(nextRole);
    setOpen(false);
  };

  const handleSelectLocalType = (type: LocalReferenceType, label: string) => {
    onChange('local_reference', undefined, type, label);
    setExpandedLocalRef(false);
    setOpen(false);
  };

  const submitCustomLocal = () => {
    const result = validateCustomReferenceLabel(customInput);
    if (!result.ok) {
      setCustomInput('');
      setExpandedLocalRef(false);
      return;
    }
    onChange('local_reference', undefined, 'custom', result.label);
    setCustomInput('');
    setExpandedLocalRef(false);
    setOpen(false);
  };

  const handleClearUsage = () => {
    onChange('undefined_usage', undefined, undefined, undefined);
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
      if (expandedLocalRef) {
        setExpandedLocalRef(false);
        setCustomInput('');
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutside, true);
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside, true);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [open, setOpen, expandedLocalRef]);

  return (
    <div
      ref={rootRef}
      className="absolute z-30 nodrag nowheel"
      style={{ top: 9, left: 9 }}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setIsTagHovered(true)}
          onMouseLeave={() => setIsTagHovered(false)}
          className="image-role-tag-button flex h-6 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium transition-all"
          style={{
            background: isTagHovered ? 'rgba(30, 41, 59, 0.86)' : 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1px solid ${isTagHovered ? 'rgba(255,255,255,0.24)' : 'rgba(255,255,255,0.12)'}`,
            color: 'rgba(255,255,255,0.88)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.28)',
          }}
        >
          <DisplayIcon className="h-3 w-3" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.74)' }} />
          <span>{displayLabel || t('imageNode.definePurpose')}</span>
          <ChevronDown className="h-3 w-3" style={{ color: selectedOption ? selectedOption.color : 'rgba(255,255,255,0.68)' }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute left-0 top-[28px] overflow-hidden rounded-[14px] p-1.5"
          onMouseLeave={() => setHoveredRole(null)}
          style={{
            width: 300,
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
                  className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12px] transition-colors"
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
                    <div className="mb-2 text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {t('reference.selectLocalElement', { defaultValue: '选择或输入参考元素' })}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {localReferenceOptions.map((sub) => (
                        <button
                          key={sub.value}
                          type="button"
                          onClick={() => handleSelectLocalType(sub.value, sub.label)}
                          className="rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors hover:bg-white/10"
                          style={{
                            background: localReferenceType === sub.value && !localReferenceLabel ? 'rgba(20,184,166,0.18)' : 'rgba(255,255,255,0.045)',
                            border: localReferenceType === sub.value && !localReferenceLabel ? '1px solid rgba(20,184,166,0.4)' : '1px solid rgba(255,255,255,0.08)',
                            color: localReferenceType === sub.value && !localReferenceLabel ? '#2dd4bf' : 'rgba(255,255,255,0.75)',
                          }}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                    <div className="mt-2.5">
                      <input
                        ref={customInputRef}
                        value={customInput}
                        onChange={(event) => setCustomInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            if (customInput.trim()) submitCustomLocal();
                          }
                          if (event.key === 'Escape') {
                            event.preventDefault();
                            setExpandedLocalRef(false);
                            setCustomInput('');
                          }
                        }}
                        placeholder={t('imageNode.customPurposeInputPlaceholder', { defaultValue: '这张图主要参考什么？' })}
                        className="w-full rounded-[9px] px-2 py-1.5 text-[12px] outline-none"
                        style={{
                          background: 'rgba(255,255,255,0.08)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'rgba(255,255,255,0.9)',
                        }}
                      />
                      <div className="mt-1.5 text-[11px] leading-4" style={{ color: 'rgba(255,255,255,0.46)' }}>
                        {t('imageNode.customPurposeExample', { defaultValue: '例如：铺装 / 水景 / 入口 / 栏杆' })}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedLocalRef(false);
                          setCustomInput('');
                        }}
                        className="rounded-md px-2.5 py-1 text-[11px] transition-colors hover:bg-white/10"
                        style={{ color: 'rgba(255,255,255,0.62)' }}
                      >
                        {t('common.cancel', { defaultValue: '取消' })}
                      </button>
                      <button
                        type="button"
                        onClick={submitCustomLocal}
                        disabled={!customInput.trim()}
                        className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors"
                        style={{
                          color: customInput.trim() ? '#ffffff' : 'rgba(255,255,255,0.35)',
                          background: customInput.trim() ? 'rgba(20,184,166,0.35)' : 'rgba(255,255,255,0.06)',
                          cursor: customInput.trim() ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {t('common.apply', { defaultValue: '应用' })}
                      </button>
                    </div>
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
                className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[12px] transition-colors hover:bg-white/5"
                style={{ color: 'rgba(255,255,255,0.58)' }}
              >
                <span className="flex-1">{t('reference.clearUsage', { defaultValue: '清除用途' })}</span>
              </button>
            </div>
          )}

          {!expandedLocalRef && (
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
