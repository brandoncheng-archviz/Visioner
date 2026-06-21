import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Image, X, Zap } from 'lucide-react';
import {
  FLOATING_PANEL_BACKGROUND,
  FLOATING_PANEL_BORDER,
  IMAGE_NODE_CONTROL_HEIGHT,
  IMAGE_NODE_CONTROL_WIDTH,
} from '../constants/canvasConstants';
import {
  DEFAULT_TEXT_NODE_MODEL,
  TEXT_NODE_MODELS,
  TEXT_NODE_PLACEHOLDER,
} from '../constants/textNode';
import { formatShortcut, getPlatformShortcutLabels } from '../utils/shortcutLabels';
import type { TextNodeModel, TextReferenceInfo } from '../types/basicNode.types';

export interface TextNodeImageReference {
  nodeId: string;
  title: string;
  imageUrl: string;
}

interface TextNodeInputPanelProps {
  value: string;
  model?: TextNodeModel;
  isProcessing?: boolean;
  canSubmit: boolean;
  focusRequestId: number;
  textReferences: TextReferenceInfo[];
  imageReferences: TextNodeImageReference[];
  onChange: (value: string) => void;
  onModelChange: (model: TextNodeModel) => void;
  onSubmit: () => void;
  onFocusTextReference: (nodeId: string) => void;
  onFocusImageReference: (nodeId: string) => void;
  onRemoveTextReference: (nodeId: string) => void;
  onRemoveImageReference: (nodeId: string) => void;
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

export function TextNodeInputPanel({
  value,
  model = DEFAULT_TEXT_NODE_MODEL,
  isProcessing = false,
  canSubmit,
  focusRequestId,
  textReferences,
  imageReferences,
  onChange,
  onModelChange,
  onSubmit,
  onFocusTextReference,
  onFocusImageReference,
  onRemoveTextReference,
  onRemoveImageReference,
}: TextNodeInputPanelProps) {
  const shortcuts = getPlatformShortcutLabels();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showModels, setShowModels] = useState(false);
  const selectedModel = useMemo(
    () => TEXT_NODE_MODELS.find((item) => item.name === model) || TEXT_NODE_MODELS[1],
    [model],
  );
  useEffect(() => {
    if (focusRequestId <= 0) return;
    if (isProcessing) return;
    inputRef.current?.focus();
  }, [focusRequestId, isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;

    const frame = window.requestAnimationFrame(() => {
      setShowModels(false);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isProcessing]);

  return (
    <div
      className="nodrag nowheel flex flex-col rounded-xl"
      style={{
        width: IMAGE_NODE_CONTROL_WIDTH,
        height: IMAGE_NODE_CONTROL_HEIGHT,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
      }}
    >
      {(textReferences.length > 0 || imageReferences.length > 0) && (
        <div className="flex items-center gap-2 px-[14px] pb-2 pt-[14px]">
          {textReferences.map((reference, index) => {
            const summary = reference.content.trim() || '当前文本节点暂无内容';
            return (
              <div
                key={reference.nodeId}
                role="button"
                tabIndex={0}
                onClick={() => onFocusTextReference(reference.nodeId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onFocusTextReference(reference.nodeId);
                }}
                className="nodrag nowheel group/text-ref relative h-[50px] w-[54px] flex-shrink-0 cursor-pointer rounded-lg text-left outline-none"
              >
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-[260px] max-w-[320px] -translate-x-1/2 rounded-xl p-3 text-left group-hover/text-ref:block group-focus-visible/text-ref:block"
                  style={{
                    background: 'rgba(8,8,10,0.98)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    boxShadow: '0 14px 34px rgba(0,0,0,0.58)',
                  }}
                >
                  <div className="truncate text-[12px] font-medium text-white/78">{reference.title}</div>
                  <div className="mt-2 line-clamp-6 whitespace-pre-wrap break-words text-[12px] leading-5 text-white/58">
                    {summary}
                  </div>
                </div>

                <div
                  className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-lg text-white/38 transition-colors group-hover/text-ref:bg-white/[0.07] group-hover/text-ref:text-white/52 group-focus-visible/text-ref:text-white/58"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.14)',
                  }}
                >
                  <TextReferenceIcon />
                  <span
                    className="absolute right-0 top-0 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white/72 group-hover/text-ref:hidden"
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
                      onRemoveTextReference(reference.nodeId);
                    }}
                    className="nodrag nowheel absolute right-0 top-0 z-30 hidden h-[18px] w-[18px] items-center justify-center rounded-full text-white/78 transition-colors hover:bg-black hover:text-white group-hover/text-ref:flex"
                    style={{ background: 'rgba(0,0,0,0.78)', border: '1px solid rgba(255,255,255,0.18)' }}
                    title="断开文本引用"
                    aria-label="断开文本引用"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {imageReferences.map((reference, index) => (
            <div
              key={reference.nodeId}
              role="button"
              tabIndex={0}
              draggable={false}
              onClick={() => onFocusImageReference(reference.nodeId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onFocusImageReference(reference.nodeId);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              className="nodrag nowheel group/ref relative h-[50px] w-[54px] flex-shrink-0 cursor-pointer rounded-lg outline-none"
              style={{
                touchAction: 'none',
              }}
            >
              {reference.imageUrl && (
                <div
                  className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden -translate-x-1/2 rounded-xl group-hover/ref:block group-focus-visible/ref:block"
                  style={{
                    background: FLOATING_PANEL_BACKGROUND,
                    border: FLOATING_PANEL_BORDER,
                    boxShadow: '0 14px 32px rgba(0,0,0,0.48)',
                  }}
                >
                  <img
                    src={reference.imageUrl}
                    alt=""
                    className="block rounded-t-xl"
                    style={{ width: 'auto', height: 'auto', maxWidth: 220, maxHeight: 200 }}
                  />
                  <div className="px-2 py-1.5 text-center text-[12px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {reference.title}
                  </div>
                </div>
              )}

              <div
                className="relative h-full w-full overflow-hidden rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(156,163,175,0.20)',
                }}
              >
                {reference.imageUrl ? (
                  <img src={reference.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/[0.05]">
                    <Image className="h-4 w-4" style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                )}
                <span
                  className="absolute right-0 top-0 z-20 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[9px] font-medium text-white/72 group-hover/ref:hidden"
                  style={{
                    background: 'rgba(0,0,0,0.78)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                >
                  {index + 1}
                </span>
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
                    onRemoveImageReference(reference.nodeId);
                  }}
                  onDragStart={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className="nodrag nowheel absolute right-0 top-0 z-30 hidden h-[18px] w-[18px] items-center justify-center rounded-full text-white transition-colors hover:bg-black group-hover/ref:flex"
                  style={{
                    background: 'rgba(0,0,0,0.78)',
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}
                  title="断开图片引用"
                  aria-label="断开图片引用"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className="min-h-0 flex-1"
        style={{ padding: textReferences.length > 0 || imageReferences.length > 0 ? '0 14px' : '14px 14px 0' }}
      >
        <textarea
          ref={inputRef}
          value={value}
          disabled={isProcessing}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              if (canSubmit) onSubmit();
            }
          }}
          placeholder={TEXT_NODE_PLACEHOLDER}
          className="nowheel w-full resize-none bg-transparent outline-none placeholder:text-[rgba(255,255,255,0.38)]"
          style={{
            color: 'rgba(255,255,255,0.94)',
            fontSize: 16,
            lineHeight: 1.58,
            height: '100%',
          }}
        />
      </div>

      <div className="flex items-center justify-between" style={{ padding: '4px 14px 14px' }}>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModels((current) => !current)}
            disabled={isProcessing}
            className="flex items-center gap-1.5 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}
          >
            <span style={{ color: 'rgba(255,255,255,0.72)' }}>脳</span>
            <span className="truncate" style={{ maxWidth: 150 }}>
              {selectedModel.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5" style={{ color: 'rgba(255,255,255,0.55)' }} />
          </button>

          {showModels && (
            <div
              className="absolute bottom-full left-0 z-30 mb-1 overflow-hidden rounded-lg py-1"
              style={{
                width: 190,
                background: FLOATING_PANEL_BACKGROUND,
                border: FLOATING_PANEL_BORDER,
                boxShadow: '0 12px 28px rgba(0,0,0,0.4)',
              }}
            >
              {TEXT_NODE_MODELS.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => {
                    onModelChange(item.name);
                    setShowModels(false);
                  }}
                  className={`w-full px-2 py-1.5 text-left transition-colors ${
                    item.name === selectedModel.name ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="text-[15px] text-white/85">{item.name}</div>
                  <div className="mt-0.5 text-[11px] text-white/40">{item.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="relative flex items-center rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: FLOATING_PANEL_BORDER,
            padding: '5px 6px 5px 12px',
            gap: 8,
          }}
        >
          <div
            className="flex h-[34px] min-w-[52px] items-center justify-center gap-1 rounded-lg px-2 text-[13px] font-medium"
            style={{
              color: 'rgba(255,255,255,0.48)',
              background: 'rgba(255,255,255,0.018)',
              border: '1px solid rgba(255,255,255,0.035)',
            }}
          >
            <Zap className="h-3 w-3 fill-current text-[#b8a36d]" />
            <span>{selectedModel.credits}</span>
          </div>

          <button
            type="button"
            onClick={() => {
              if (canSubmit) onSubmit();
            }}
            disabled={!canSubmit}
            className="flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed"
            style={{
              width: 34,
              height: 34,
              background: canSubmit ? '#ffffff' : 'rgba(255,255,255,0.14)',
              opacity: canSubmit ? 1 : 0.45,
            }}
            title={`Send (${formatShortcut(shortcuts.submit)})`}
          >
            {isProcessing ? (
              <div className="relative flex items-center justify-center">
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="rgba(0,0,0,0.15)" strokeWidth="2" />
                  <path d="M8 2A6 6 0 0 1 14 8" stroke="#000" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            ) : (
              <ArrowUp className="h-4 w-4 text-black" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
