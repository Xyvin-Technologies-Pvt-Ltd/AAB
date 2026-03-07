import { successResponse, errorResponse } from '../../helpers/response.js';
import * as aiChatService from './ai-chat.service.js';
import logger from '../../helpers/logger.js';

/**
 * POST /api/ai-chat/stream
 * Streams a chat response using SSE (Server-Sent Events).
 * Body: { message, sessionId?, pageContext? }
 */
export const streamChat = async (req, res, next) => {
  try {
    const { message, sessionId, pageContext } = req.body;

    if (!message || !message.trim()) {
      return errorResponse(res, 400, 'Message is required.');
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Handle client disconnect
    let closed = false;
    req.on('close', () => {
      closed = true;
    });

    await aiChatService.streamChat({
      sessionId,
      message: message.trim(),
      user: req.user,
      pageContext,
      res,
    });

    if (!closed) {
      res.end();
    }
  } catch (err) {
    logger.error('Chat stream controller error', { error: err.message });
    if (!res.headersSent) {
      return next(err);
    }
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
};

/**
 * GET /api/ai-chat/sessions
 * List all chat sessions for the authenticated user.
 */
export const getSessions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const data = await aiChatService.getUserSessions(req.user._id, page, limit);
    return successResponse(res, 200, 'Sessions retrieved successfully', data);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai-chat/sessions/:id
 * Get a specific chat session with full message history.
 */
export const getSession = async (req, res, next) => {
  try {
    const session = await aiChatService.getSession(req.params.id, req.user._id);

    if (!session) {
      return errorResponse(res, 404, 'Session not found.');
    }

    return successResponse(res, 200, 'Session retrieved successfully', { session });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/ai-chat/sessions/:id
 * Delete a specific chat session.
 */
export const deleteSession = async (req, res, next) => {
  try {
    const deleted = await aiChatService.deleteSession(req.params.id, req.user._id);

    if (!deleted) {
      return errorResponse(res, 404, 'Session not found.');
    }

    return successResponse(res, 200, 'Session deleted successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/ai-chat/insights
 * Get proactive AI-generated insights for the dashboard widget.
 */
export const getInsights = async (req, res, next) => {
  try {
    const insights = await aiChatService.generateInsights(req.user);
    return successResponse(res, 200, 'Insights retrieved successfully', { insights });
  } catch (err) {
    next(err);
  }
};
