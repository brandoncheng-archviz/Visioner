import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, ChevronDown } from 'lucide-react';
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

  useEffect(() => {
    if (focusRequestId <= 0) return;
    inputRef.current?.focus();
  }, [focusRequestId]);

  return (
    <div
      className="w-[640px] rounded-xl"
      style={{
        background: '#252526',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 16px 34px rgba(0,0,0,0.48)',
      }}
    >
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
        className="nowheel block h-[104px] w-full resize-none bg-transparent px-[14px] pb-3 pt-4 text-[16px] leading-[1.58] text-white/[0.94] outline-none placeholder:text-[rgba(255,255,255,0.38)]"
      />

      <div className="flex items-center justify-between px-[14px] pb-[14px] pt-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowModels((value) => !value)}
            className="flex items-center gap-1.5 transition-colors hover:text-white"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}
          >
            <span style={{ color: 'rgba(255,255,255,0.72)' }}>脳</span>
            <span className="truncate" style={{ maxWidth: 180 }}>
              {selectedModel.name}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-white/55" />
          </button>

          {showModels && (
            <div
              className="absolute bottom-full left-0 mb-1 w-[320px] overflow-hidden rounded-lg py-1"
              style={{
                background: '#252526',
                border: '1px solid rgba(255,255,255,0.08)',
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
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.05]"
                  style={{ background: item.name === selectedModel.name ? 'rgba(255,255,255,0.08)' : undefined }}
                >
                  <span>
                    <span className="block text-[14px] text-white/88">{item.name}</span>
                    <span className="mt-0.5 block text-[11px] text-white/42">{item.description}</span>
                  </span>
                  <span className="text-[11px] text-white/35">{item.credits} 积分</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className="relative flex items-center rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
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
            <span>{selectedModel.credits}</span>
            <span>积分</span>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isProcessing || !value.trim()}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-45"
            style={{ background: value.trim() ? '#ffffff' : 'rgba(255,255,255,0.14)' }}
            title="发送（Ctrl / Cmd + Enter）"
          >
            {isProcessing ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            ) : (
              <ArrowUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
