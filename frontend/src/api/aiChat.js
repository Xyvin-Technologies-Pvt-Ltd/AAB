import api from './axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

/**
 * Stream a chat message using fetch + ReadableStream for SSE.
 * Returns a cleanup function to abort the stream.
 *
 * @param {object} options
 * @param {string} options.message
 * @param {string|null} options.sessionId
 * @param {string|null} options.pageContext
 * @param {function} options.onDelta       - Called with each text token
 * @param {function} options.onToolStart   - Called when a tool starts executing
 * @param {function} options.onToolEnd     - Called when a tool finishes with result
 * @param {function} options.onDone        - Called when stream completes: { sessionId, title }
 * @param {function} options.onError       - Called with error message
 * @param {AbortController} options.abortController
 */
export const streamChatMessage = async ({
  message,
  sessionId,
  pageContext,
  onDelta,
  onToolStart,
  onToolEnd,
  onDone,
  onError,
  abortController,
}) => {
  const token = localStorage.getItem('token');

  try {
    const response = await fetch(`${BASE_URL}/ai-chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message, sessionId, pageContext }),
      signal: abortController?.signal,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Server error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep the last incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        let event;
        try {
          event = JSON.parse(jsonStr);
        } catch {
          continue;
        }

        switch (event.type) {
          case 'delta':
            onDelta?.(event.content);
            break;
          case 'tool_start':
            onToolStart?.({ id: event.id, name: event.name });
            break;
          case 'tool_end':
            onToolEnd?.({ id: event.id, name: event.name, result: event.result });
            break;
          case 'done':
            onDone?.({ sessionId: event.sessionId, title: event.title });
            break;
          case 'error':
            onError?.(event.message);
            break;
          default:
            break;
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Stream was intentionally stopped
      return;
    }
    onError?.(err.message || 'Connection error');
  }
};

/**
 * Get all chat sessions for the current user.
 */
export const getSessions = async (page = 1, limit = 20) => {
  const res = await api.get('/ai-chat/sessions', { params: { page, limit } });
  return res.data.data;
};

/**
 * Get a specific chat session with full message history.
 */
export const getSession = async (sessionId) => {
  const res = await api.get(`/ai-chat/sessions/${sessionId}`);
  return res.data.data.session;
};

/**
 * Delete a chat session.
 */
export const deleteSession = async (sessionId) => {
  const res = await api.delete(`/ai-chat/sessions/${sessionId}`);
  return res.data;
};

/**
 * Get AI insights for the dashboard widget.
 */
export const getInsights = async () => {
  const res = await api.get('/ai-chat/insights');
  return res.data.data.insights;
};
