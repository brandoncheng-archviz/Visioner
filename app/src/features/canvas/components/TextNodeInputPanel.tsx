import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown, Zap } from 'lucide-react';
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
import type { TextNodeModel } from '../types/basicNode.types';

interface TextNodeInputPanelProps {
  value: string;
  model?: TextNodeModel;
  isProcessing?: boolean;
  focusRequestId: number;
  onChange: (value: string) => void;
  onModelChange: (model: TextNodeModel) => void;
  onSubmit: () => void;
}

export function TextNodeInputPanel({
  value,
  model = DEFAULT_TEXT_NODE_MODEL,
  isProcessing = false,
  focusRequestId,
  onChange,
  onModelChange,
  onSubmit,
}: TextNodeInputPanelProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showModels, setShowModels] = useState(false);
  const selectedModel = useMemo(
    () => TEXT_NODE_MODELS.find((item) => item.name === model) || TEXT_NODE_MODELS[1],
    [model],
  );
  const canSubmit = value.trim().length > 0 && !isProcessing;

  useEffect(() => {
    if (focusRequestId <= 0) return;
    inputRef.current?.focus();
  }, [focusRequestId]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl"
      style={{
        width: IMAGE_NODE_CONTROL_WIDTH,
        height: IMAGE_NODE_CONTROL_HEIGHT,
        background: FLOATING_PANEL_BACKGROUND,
        border: FLOATING_PANEL_BORDER,
        boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
      }}
    >
      <div className="min-h-0 flex-1" style={{ padding: '14px 14px 0' }}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            event.stopPropagation();
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
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
            className="flex items-center gap-1.5 transition-colors hover:text-white"
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
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed"
            style={{
              width: 34,
              height: 34,
              background: canSubmit ? '#ffffff' : 'rgba(255,255,255,0.14)',
              opacity: canSubmit ? 1 : 0.45,
            }}
            title="Send (Ctrl / Cmd + Enter)"
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
