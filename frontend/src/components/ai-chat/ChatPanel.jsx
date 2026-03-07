import { useEffect, useRef, useCallback } from 'react';
import { X, Plus, History, Bot, Sparkles, ChevronLeft, Maximize2, Minimize2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { streamChatMessage } from '@/api/aiChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatSessionList } from './ChatSessionList';
import { SuggestedQuestions } from './SuggestedQuestions';

export function ChatPanel() {
  const messagesEndRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  const {
    isOpen, closeChat, showSessions, showSessionsList, hideSessionsList,
    messages, isStreaming, activeSessionId, activeSessionTitle, pageContext,
    addUserMessage, startAssistantMessage, appendDelta, addToolCall,
    updateToolCallResult, finalizeMessage, handleStreamError, stopStreaming,
    setAbortController, startNewChat, isWide, toggleWide,
  } = useChatStore();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = useCallback(async (text) => {
    if (!text.trim() || isStreaming) return;

    addUserMessage(text);
    startAssistantMessage();

    const abortCtrl = new AbortController();
    setAbortController(abortCtrl);

    await streamChatMessage({
      message: text,
      sessionId: activeSessionId,
      pageContext,
      abortController: abortCtrl,
      onDelta: (delta) => appendDelta(delta),
      onToolStart: ({ id, name }) => {
        addToolCall({ id, name, status: 'running' });
      },
      onToolEnd: ({ id, name, result }) => {
        updateToolCallResult(id, result);
      },
      onDone: ({ sessionId, title }) => {
        finalizeMessage(sessionId, title);
      },
      onError: (msg) => {
        handleStreamError(msg);
      },
    });
  }, [isStreaming, activeSessionId, pageContext, addUserMessage, startAssistantMessage, setAbortController, appendDelta, addToolCall, updateToolCallResult, finalizeMessage, handleStreamError]);

  if (!isOpen) return null;

  const panelWidth = isWide ? 'sm:w-[720px]' : 'sm:w-[420px]';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] md:hidden"
        onClick={closeChat}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 z-50 w-full ${panelWidth} flex flex-col bg-background border-l border-border/50 shadow-2xl transition-[width] duration-300 ease-in-out`}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm flex-shrink-0">
          {/* Back button (only in sessions view) */}
          {showSessions ? (
            <button
              onClick={hideSessionsList}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Back to chat"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-sm shadow-violet-500/30">
              <Bot className="h-4 w-4 text-white" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            {showSessions ? (
              <h2 className="text-sm font-semibold text-foreground">Conversation History</h2>
            ) : (
              <>
                <h2 className="text-sm font-semibold truncate leading-tight">
                  {activeSessionTitle}
                </h2>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <p className="text-[10px] text-muted-foreground">Aria · AI Assistant</p>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-0.5">
            {!showSessions && (
              <>
                <button
                  onClick={startNewChat}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={showSessionsList}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Chat history"
                >
                  <History className="h-4 w-4" />
                </button>
              </>
            )}
            {/* Wide/Narrow toggle — hidden on mobile */}
            <button
              onClick={toggleWide}
              className="hidden sm:flex w-7 h-7 items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={isWide ? 'Narrow panel' : 'Widen panel'}
            >
              {isWide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={closeChat}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {showSessions ? (
          <div className="flex-1 overflow-hidden">
            <ChatSessionList />
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {messages.length === 0 ? (
                <SuggestedQuestions
                  role={user?.role}
                  pageContext={pageContext}
                  onSelect={handleSend}
                  isWide={isWide}
                />
              ) : (
                <div className="px-4 py-4 space-y-4">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <ChatInput
              onSend={handleSend}
              onStop={stopStreaming}
              isStreaming={isStreaming}
              disabled={false}
            />
          </>
        )}
      </div>
    </>
  );
}
