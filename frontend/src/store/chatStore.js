import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export const useChatStore = create(subscribeWithSelector((set, get) => ({
  // Panel state
  isOpen: false,
  showSessions: false,
  isWide: false,

  // Active session
  activeSessionId: null,
  activeSessionTitle: 'New Conversation',

  // Messages in the active session (UI state)
  messages: [],

  // Streaming state
  isStreaming: false,
  streamingMessageId: null,
  abortController: null,

  // Sessions list cache
  sessions: [],
  sessionsLoading: false,

  // Page context injected from current page
  pageContext: null,

  // Insights for dashboard widget
  insights: [],
  insightsLoading: false,

  // ── Actions ──────────────────────────────────────────────────────────────

  openChat: (pageContext = null) => {
    set({ isOpen: true, pageContext, showSessions: false });
  },

  closeChat: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
    }
    set({ isOpen: false });
  },

  toggleChat: (pageContext = null) => {
    const { isOpen } = get();
    if (isOpen) {
      get().closeChat();
    } else {
      get().openChat(pageContext);
    }
  },

  setPageContext: (ctx) => set({ pageContext: ctx }),

  showSessionsList: () => set({ showSessions: true }),
  hideSessionsList: () => set({ showSessions: false }),
  toggleWide: () => set((state) => ({ isWide: !state.isWide })),

  // Start a new conversation (clear active session)
  startNewChat: () => {
    const { abortController } = get();
    if (abortController) abortController.abort();
    set({
      activeSessionId: null,
      activeSessionTitle: 'New Conversation',
      messages: [],
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      showSessions: false,
    });
  },

  // Load an existing session
  loadSession: (session) => {
    const { abortController } = get();
    if (abortController) abortController.abort();

    // Convert stored messages to display format
    const displayMessages = (session.messages || [])
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m, i) => ({
        id: `hist-${i}`,
        role: m.role,
        content: m.content || '',
        toolCalls: m.toolCalls || [],
        timestamp: m.timestamp,
      }));

    set({
      activeSessionId: session._id,
      activeSessionTitle: session.title,
      messages: displayMessages,
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      showSessions: false,
    });
  },

  // Add a user message to the display
  addUserMessage: (content) => {
    const id = `msg-${Date.now()}`;
    const message = {
      id,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return id;
  },

  // Start a new assistant message placeholder for streaming
  startAssistantMessage: () => {
    const id = `msg-${Date.now()}-ai`;
    const message = {
      id,
      role: 'assistant',
      content: '',
      toolCalls: [],
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({
      messages: [...state.messages, message],
      streamingMessageId: id,
      isStreaming: true,
    }));
    return id;
  },

  // Append a delta to the streaming assistant message
  appendDelta: (delta) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId
          ? { ...m, content: m.content + delta }
          : m
      ),
    }));
  },

  // Add a tool call to the streaming message
  addToolCall: (toolCall) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId
          ? {
              ...m,
              toolCalls: [
                ...(m.toolCalls || []).filter((tc) => tc.id !== toolCall.id),
                toolCall,
              ],
            }
          : m
      ),
    }));
  },

  // Update a tool call with its result
  updateToolCallResult: (toolId, result) => {
    const { streamingMessageId } = get();
    if (!streamingMessageId) return;
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId
          ? {
              ...m,
              toolCalls: (m.toolCalls || []).map((tc) =>
                tc.id === toolId ? { ...tc, result, status: 'done' } : tc
              ),
            }
          : m
      ),
    }));
  },

  // Finalize the streaming message
  finalizeMessage: (sessionId, sessionTitle) => {
    const { streamingMessageId } = get();
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId ? { ...m, isStreaming: false } : m
      ),
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
      activeSessionId: sessionId || state.activeSessionId,
      activeSessionTitle: sessionTitle || state.activeSessionTitle,
    }));
  },

  // Handle stream error
  handleStreamError: (errorMessage) => {
    const { streamingMessageId } = get();
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId
          ? { ...m, content: `Sorry, an error occurred: ${errorMessage}`, isStreaming: false, isError: true }
          : m
      ),
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
    }));
  },

  // Stop current stream
  stopStreaming: () => {
    const { abortController, streamingMessageId } = get();
    if (abortController) abortController.abort();
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === streamingMessageId ? { ...m, isStreaming: false, isStopped: true } : m
      ),
      isStreaming: false,
      streamingMessageId: null,
      abortController: null,
    }));
  },

  setAbortController: (ctrl) => set({ abortController: ctrl }),

  // Sessions list
  setSessions: (sessions) => set({ sessions }),
  setSessionsLoading: (loading) => set({ sessionsLoading: loading }),

  removeSession: (sessionId) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s._id !== sessionId),
    }));
    // If current session was deleted, start new
    const { activeSessionId } = get();
    if (activeSessionId === sessionId) {
      get().startNewChat();
    }
  },

  // Insights
  setInsights: (insights) => set({ insights }),
  setInsightsLoading: (loading) => set({ insightsLoading: loading }),
})));
