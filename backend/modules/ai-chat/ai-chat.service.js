import { openaiConfig } from '../../config/openai.js';
import { getToolsForRole } from './ai-chat.tools.js';
import { executeTool } from './ai-chat.toolExecutor.js';
import ChatSession from './ai-chat.model.js';
import logger from '../../helpers/logger.js';

const MAX_TOOL_ROUNDS = 5;
const MAX_CONTEXT_TOKENS = 100000; // ~80% of gpt-4o's 128k window

/**
 * Build the system prompt dynamically with current date.
 */
const buildSystemPrompt = () => {
  const today = new Date().toLocaleDateString('en-AE', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return `You are Aria, an intelligent AI assistant for an accounting firm management system based in the UAE. You help accountants, managers, and employees manage clients, tasks, time tracking, invoices, and compliance.

## Your Capabilities
- **Read & Analyze**: Query clients, tasks, employees, time entries, invoices, analytics, and compliance status
- **Act & Create**: Create tasks, update task status, generate draft invoices (with user confirmation)
- **Compliance Expertise**: Deep knowledge of UAE compliance: VAT (FTA), Corporate Tax, Trade License renewals, Emirates ID, Passports

## UAE-Specific Knowledge
- VAT: Federal Tax Authority (FTA) oversees VAT. Quarterly clients file every 3 months, monthly clients file every month. TRN is the Tax Registration Number.
- Corporate Tax: UAE corporate tax at 9% for profits > AED 375,000. CTRN is the Corporate Tax Registration Number.
- Trade License: Issued by DED (Dubai Economic Department) or equivalent. Renewed annually.
- Emirates ID: 15-digit national ID, issued by ICA. Expires every 5 or 10 years.
- Emirates: Dubai, Abu Dhabi, Sharjah, Ajman, Umm Al Quwain, Ras Al Khaimah, Fujairah

## Response Guidelines
- Always use **markdown** for formatting: tables for lists of data, bullet points for summaries, bold for key values
- For monetary values, use AED (e.g., AED 10,000)
- When showing dates, use readable format (e.g., 15 Mar 2026)
- For write operations (create task, update status, generate invoice), ALWAYS describe what you're about to do and ask for confirmation before calling the tool
- If the user says "yes", "confirm", "proceed", or similar, then call the tool with confirmed: true
- Keep responses concise but complete
- If data is not found, suggest alternatives or ask clarifying questions

## Context
Today's date: ${today}
`;
};

/**
 * Estimate token count (rough approximation: 4 chars ≈ 1 token).
 */
const estimateTokens = (text) => {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
};

const estimateMessageTokens = (message) => {
  let tokens = 4; // Base overhead per message
  if (message.content) tokens += estimateTokens(message.content);
  if (message.tool_calls) {
    tokens += message.tool_calls.length * 10; // Overhead per tool call
    message.tool_calls.forEach((tc) => {
      tokens += estimateTokens(tc.function?.name || '');
      tokens += estimateTokens(tc.function?.arguments || '');
    });
  }
  return tokens;
};

/**
 * Truncate tool results to prevent context bloat.
 * - Cap arrays at 10 items
 * - Limit string fields to 500 chars
 * - Add truncated flag when data is cut
 */
const truncateToolResult = (result) => {
  if (!result || typeof result !== 'object') return result;

  const truncated = { ...result };
  let wasTruncated = false;

  // Handle arrays
  if (Array.isArray(truncated)) {
    if (truncated.length > 10) {
      wasTruncated = true;
      return {
        items: truncated.slice(0, 10),
        truncated: true,
        totalCount: truncated.length,
        message: `Showing first 10 of ${truncated.length} items. Ask with more specific filters to see others.`,
      };
    }
    return truncated;
  }

  // Handle objects
  for (const key in truncated) {
    if (typeof truncated[key] === 'string' && truncated[key].length > 500) {
      truncated[key] = truncated[key].substring(0, 500) + '... [truncated]';
      wasTruncated = true;
    } else if (Array.isArray(truncated[key]) && truncated[key].length > 10) {
      truncated[key] = truncated[key].slice(0, 10);
      wasTruncated = true;
    } else if (typeof truncated[key] === 'object' && truncated[key] !== null) {
      // Recursively truncate nested objects
      truncated[key] = truncateToolResult(truncated[key]);
    }
  }

  if (wasTruncated && !truncated.truncated) {
    truncated.truncated = true;
  }

  return truncated;
};

/**
 * Build the messages array for OpenAI from the session history.
 *
 * OpenAI requires a strict ordering: every assistant message that contains
 * tool_calls must be immediately followed by one tool message per tool_call_id.
 * We enforce this by grouping saved messages into "turns" and only including
 * a turn if ALL its tool responses are present in the history.
 *
 * Also manages context window by trimming older messages when approaching limits.
 */
const buildMessages = (sessionMessages, userMessage, pageContext) => {
  const systemPrompt = buildSystemPrompt();
  const messages = [{ role: 'system', content: systemPrompt }];

  if (pageContext) {
    messages.push({
      role: 'system',
      content: `Current page context: ${pageContext}. The user may be asking about this specific entity.`,
    });
  }

  // Group messages into complete turns, skipping any incomplete tool-call turns
  let i = 0;
  while (i < sessionMessages.length) {
    const msg = sessionMessages[i];

    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content || '' });
      i++;
      continue;
    }

    if (msg.role === 'assistant') {
      const hasPendingToolCalls = msg.toolCalls && msg.toolCalls.length > 0 &&
        msg.toolCalls.some((tc) => tc.id); // only include tool_calls that have IDs

      if (hasPendingToolCalls) {
        // Collect all expected tool_call_ids from this assistant message
        const expectedIds = msg.toolCalls
          .filter((tc) => tc.id)
          .map((tc) => tc.id);

        // Look ahead to find tool result messages for every expected ID
        const toolResultsMap = {};
        let j = i + 1;
        while (j < sessionMessages.length && sessionMessages[j].role === 'tool') {
          const toolMsg = sessionMessages[j];
          if (toolMsg.toolCallId) {
            toolResultsMap[toolMsg.toolCallId] = toolMsg;
          }
          j++;
        }

        // Only include this turn if ALL tool results are present
        const allResultsPresent = expectedIds.every((id) => toolResultsMap[id]);

        if (allResultsPresent) {
          const assistantMsg = {
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.toolCalls
              .filter((tc) => tc.id)
              .map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: typeof tc.arguments === 'string'
                    ? tc.arguments
                    : JSON.stringify(tc.arguments || {}),
                },
              })),
          };
          // OpenAI requires content to be null (not empty string) when tool_calls present
          if (!assistantMsg.content) assistantMsg.content = null;
          messages.push(assistantMsg);

          // Add tool results in the exact order of the tool_calls array
          for (const tc of assistantMsg.tool_calls) {
            const toolMsg = toolResultsMap[tc.id];
            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: tc.function.name,
              content: typeof toolMsg.content === 'string'
                ? toolMsg.content
                : JSON.stringify(toolMsg.content),
            });
          }
        }
        // Skip past all tool result messages for this turn
        i = j;
      } else {
        // Plain assistant message without tool calls
        messages.push({ role: 'assistant', content: msg.content || '' });
        i++;
      }
      continue;
    }

    // Skip orphaned tool messages (shouldn't happen but be safe)
    i++;
  }

  messages.push({ role: 'user', content: userMessage });

  // Context window management: trim if approaching limits
  let totalTokens = messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  
  if (totalTokens > MAX_CONTEXT_TOKENS) {
    logger.warn('Context window approaching limit, trimming older messages', { 
      totalTokens, 
      messageCount: messages.length 
    });

    // Keep system messages, trim from the front (oldest user/assistant exchanges)
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    // Keep last 10 turns (user + assistant pairs)
    const recentMessages = conversationMessages.slice(-20);
    
    const trimmedMessages = [...systemMessages, ...recentMessages];
    totalTokens = trimmedMessages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
    
    logger.info('Context trimmed', { 
      originalCount: messages.length, 
      trimmedCount: trimmedMessages.length,
      estimatedTokens: totalTokens 
    });

    return trimmedMessages;
  }

  return messages;
};

/**
 * Auto-generate a session title from the first user message.
 */
const generateTitle = (message) => {
  const clean = message.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).slice(0, 7).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1) || 'New Conversation';
};

/**
 * Main streaming chat handler.
 * Writes SSE events to the response object.
 *
 * SSE event types:
 *  - "delta"     : { content: string }  — streamed token
 *  - "tool_start": { name, id }         — tool is being called
 *  - "tool_end"  : { name, id, result } — tool result available
 *  - "done"      : { sessionId, title } — stream complete
 *  - "error"     : { message }          — error occurred
 */
export const streamChat = async ({ sessionId, message, user, pageContext, res }) => {
  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  const sendKeepAlive = () => {
    res.write(': keepalive\n\n');
  };

  let keepAliveInterval = null;

  try {
    // Load or create session
    let session = sessionId
      ? await ChatSession.findOne({ _id: sessionId, userId: user._id })
      : null;

    if (!session) {
      session = await ChatSession.create({
        userId: user._id,
        title: generateTitle(message),
        messages: [],
        context: { pageContext: pageContext || null },
      });
    }

    // Save user message immediately (incremental save)
    const userMsg = { role: 'user', content: message, timestamp: new Date() };
    session.messages.push(userMsg);
    session.messageCount = session.messages.length;
    session.lastMessageAt = new Date();
    if (session.title === 'New Conversation' && message) {
      session.title = generateTitle(message);
    }
    await session.save();

    const tools = getToolsForRole(user.role);
    const messages = buildMessages(session.messages.slice(0, -1), message, pageContext || session.context?.pageContext);

    // Track the new messages to save
    const newMessages = [];
    let assistantContent = '';
    const toolCallsForSave = [];

    // Abort signal tracking
    let aborted = false;
    res.on('close', () => {
      aborted = true;
      if (keepAliveInterval) clearInterval(keepAliveInterval);
    });

    // Agentic loop: keep calling OpenAI until no more tool calls
    let continueLoop = true;
    let currentMessages = messages;
    let toolRound = 0;

    while (continueLoop) {
      // Check abort before each OpenAI call
      if (aborted) {
        logger.info('Stream aborted by client');
        return;
      }

      // Loop guard: prevent infinite tool calling
      if (toolRound >= MAX_TOOL_ROUNDS) {
        logger.warn('Max tool rounds reached', { toolRound });
        sendEvent('delta', { 
          content: '\n\n_[Maximum tool execution rounds reached. Please start a new conversation if you need more assistance.]_' 
        });
        break;
      }

      toolRound++;

      const stream = await openaiConfig.client.chat.completions.create({
        model: openaiConfig.model,
        messages: currentMessages,
        tools,
        tool_choice: 'auto',
        stream: true,
        max_tokens: 4096,
        temperature: 0.3,
      });

      let currentToolCalls = {};
      let currentContent = '';
      let finishReason = null;

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        finishReason = chunk.choices[0]?.finish_reason || finishReason;

        // Stream text content
        if (delta?.content) {
          currentContent += delta.content;
          assistantContent += delta.content;
          sendEvent('delta', { content: delta.content });
        }

        // Accumulate tool calls
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!currentToolCalls[idx]) {
              currentToolCalls[idx] = { id: tc.id || '', name: '', args: '' };
            }
            if (tc.id) currentToolCalls[idx].id = tc.id;
            if (tc.function?.name) currentToolCalls[idx].name += tc.function.name;
            if (tc.function?.arguments) currentToolCalls[idx].args += tc.function.arguments;
          }
        }
      }

      if (finishReason === 'tool_calls' && Object.keys(currentToolCalls).length > 0) {
        // Execute all tool calls
        const toolCallResults = [];
        const assistantToolCallMsg = {
          role: 'assistant',
          content: currentContent || null,
          tool_calls: Object.values(currentToolCalls).map((tc) => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.args },
          })),
        };

        // Start keepalive during tool execution
        keepAliveInterval = setInterval(sendKeepAlive, 5000);

        for (const tc of Object.values(currentToolCalls)) {
          // Check abort before each tool execution
          if (aborted) {
            logger.info('Stream aborted during tool execution');
            if (keepAliveInterval) clearInterval(keepAliveInterval);
            return;
          }

          sendEvent('tool_start', { name: tc.name, id: tc.id });

          let parsedArgs = {};
          try {
            parsedArgs = JSON.parse(tc.args || '{}');
          } catch (e) {
            parsedArgs = {};
          }

          // Execute tool with timeout
          let result;
          try {
            result = await Promise.race([
              executeTool(tc.name, parsedArgs, user),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Tool execution timeout')), 15000)
              ),
            ]);
          } catch (err) {
            logger.error('Tool execution failed or timed out', { tool: tc.name, error: err.message });
            result = { 
              error: true, 
              message: err.message === 'Tool execution timeout' 
                ? 'Tool execution timed out after 15 seconds' 
                : err.message 
            };
          }

          // Truncate large results
          const truncatedResult = truncateToolResult(result);
          const resultStr = JSON.stringify(truncatedResult);

          sendEvent('tool_end', { name: tc.name, id: tc.id, result: truncatedResult });

          toolCallResults.push({
            role: 'tool',
            tool_call_id: tc.id,
            name: tc.name,
            content: resultStr,
          });

          // Track for saving (save as we go)
          toolCallsForSave.push({
            id: tc.id,
            name: tc.name,
            arguments: parsedArgs,
            result: truncatedResult,
            executedAt: new Date(),
          });

          // Incremental save: persist tool results as they complete
          try {
            const updatedSession = await ChatSession.findById(session._id);
            if (updatedSession) {
              const lastMsg = updatedSession.messages[updatedSession.messages.length - 1];
              if (lastMsg && lastMsg.role === 'assistant' && lastMsg.toolCalls) {
                // Update existing assistant message with new tool call
                lastMsg.toolCalls.push(toolCallsForSave[toolCallsForSave.length - 1]);
              }
              await updatedSession.save();
            }
          } catch (saveErr) {
            logger.error('Failed to incrementally save tool result', { error: saveErr.message });
          }
        }

        // Stop keepalive after tools complete
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
          keepAliveInterval = null;
        }

        // Add the assistant message (with tool calls) and tool results to messages
        currentMessages = [
          ...currentMessages,
          assistantToolCallMsg,
          ...toolCallResults,
        ];

        // Build a map of tool results keyed by tool_call_id for reliable lookup
        const toolResultsById = {};
        for (const r of toolCallResults) {
          toolResultsById[r.tool_call_id] = r;
        }

        // Save intermediate assistant message with tool calls
        newMessages.push({
          role: 'assistant',
          content: currentContent || '',
          toolCalls: Object.values(currentToolCalls).map((tc) => ({
            id: tc.id,
            name: tc.name,
            arguments: tc.args,
          })),
          timestamp: new Date(),
        });

        // Add tool result messages — matched by tool_call_id, in the same order as tool_calls
        for (const tc of Object.values(currentToolCalls)) {
          const resultMsg = toolResultsById[tc.id];
          if (resultMsg) {
            newMessages.push({
              role: 'tool',
              content: resultMsg.content,
              toolCallId: tc.id,
              toolName: tc.name,
              timestamp: new Date(),
            });
          }
        }

        // Reset for next loop iteration
        assistantContent = '';

      } else {
        // Final response — no more tool calls
        continueLoop = false;

        // Check if response was truncated due to max_tokens
        if (finishReason === 'length') {
          logger.warn('Response truncated due to max_tokens', { finishReason });
          assistantContent += '\n\n_[Response was truncated due to length. Please ask me to continue if you need more information.]_';
          sendEvent('delta', { content: '\n\n_[Response was truncated due to length. Please ask me to continue if you need more information.]_' });
        }

        newMessages.push({
          role: 'assistant',
          content: assistantContent,
          toolCalls: toolCallsForSave,
          timestamp: new Date(),
        });
      }
    }

    // Final save: add assistant's final response (user message and tool results already saved incrementally)
    if (newMessages.length > 0) {
      const finalSession = await ChatSession.findById(session._id);
      if (finalSession) {
        // Only push messages that haven't been saved yet (final assistant response)
        const lastNewMsg = newMessages[newMessages.length - 1];
        if (lastNewMsg && lastNewMsg.role === 'assistant') {
          finalSession.messages.push(lastNewMsg);
          finalSession.messageCount = finalSession.messages.length;
          finalSession.lastMessageAt = new Date();
          await finalSession.save();
        }
      }
    }

    sendEvent('done', { sessionId: session._id.toString(), title: session.title });

  } catch (err) {
    logger.error('AI Chat streaming error', { error: err.message, stack: err.stack });
    sendEvent('error', { message: err.message || 'An error occurred during chat processing.' });
  } finally {
    // Cleanup keepalive interval
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
    }
  }
};

/**
 * Get all sessions for a user (list view).
 */
export const getUserSessions = async (userId, page = 1, limit = 20) => {
  const sessions = await ChatSession.find({ userId })
    .select('title messageCount lastMessageAt createdAt')
    .sort({ updatedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  const total = await ChatSession.countDocuments({ userId });

  return { sessions, total, page, limit };
};

/**
 * Get a specific session with all messages.
 */
export const getSession = async (sessionId, userId) => {
  return ChatSession.findOne({ _id: sessionId, userId }).lean();
};

/**
 * Delete a session.
 */
export const deleteSession = async (sessionId, userId) => {
  return ChatSession.findOneAndDelete({ _id: sessionId, userId });
};

/**
 * Generate proactive insights for the dashboard.
 * Returns an array of insight strings.
 */
export const generateInsights = async (user) => {
  try {
    const [stats, compliance] = await Promise.all([
      executeTool('get_dashboard_stats', {}, user),
      executeTool('get_compliance_status', { daysAhead: 30 }, user),
    ]);

    const insights = [];

    if (stats.overdueTasks > 0) {
      insights.push({ type: 'warning', icon: 'clock', message: `${stats.overdueTasks} task${stats.overdueTasks > 1 ? 's are' : ' is'} overdue` });
    }
    if (stats.overdueInvoices > 0) {
      insights.push({ type: 'error', icon: 'invoice', message: `${stats.overdueInvoices} invoice${stats.overdueInvoices > 1 ? 's' : ''} overdue for payment` });
    }
    if (compliance.clientsWithIssues > 0) {
      insights.push({ type: 'warning', icon: 'shield', message: `${compliance.clientsWithIssues} client${compliance.clientsWithIssues > 1 ? 's have' : ' has'} compliance issues in the next 30 days` });
    }
    if (stats.pendingTasks > 0) {
      insights.push({ type: 'info', icon: 'tasks', message: `${stats.pendingTasks} pending tasks across all clients` });
    }

    return insights.slice(0, 5);
  } catch (err) {
    logger.error('Insights generation error', { error: err.message });
    return [];
  }
};
