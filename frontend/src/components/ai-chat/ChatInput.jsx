import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChatInput({ onSend, onStop, isStreaming, disabled, placeholder }) {
  const [value, setValue] = useState('');
  const textareaRef = useRef(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  return (
    <div className="px-4 pt-3 pb-4 border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <div
        className={cn(
          'flex items-end gap-2.5 rounded-2xl border bg-card px-3.5 py-2.5 transition-all duration-200',
          disabled ? 'opacity-50' : 'border-border/60 focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/10 focus-within:shadow-sm'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isStreaming}
          placeholder={placeholder || 'Ask Aria anything…'}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-h-[22px] max-h-[120px] py-0.5 leading-relaxed"
        />

        <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-colors text-xs font-medium"
              title="Stop generating"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!value.trim() || disabled}
              className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 transition-opacity shadow-sm shadow-violet-500/20"
              title="Send message (Enter)"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">
        <kbd className="px-1 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send ·{' '}
        <kbd className="px-1 rounded bg-muted text-[10px] font-mono">Shift+Enter</kbd> for new line
      </p>
    </div>
  );
}
