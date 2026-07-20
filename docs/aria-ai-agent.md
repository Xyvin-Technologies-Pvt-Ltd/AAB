# Aria — AI Agent Architecture & Technical Reference

> **Version**: 1.0  
> **Last updated**: March 2026  
> **System**: AAcounting — Accounting Firm Management Platform (UAE)

---

## Table of Contents

1. [Overview](#1-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Backend Module Structure](#3-backend-module-structure)
4. [Core Concepts](#4-core-concepts)
   - 4.1 [Agentic Loop](#41-agentic-loop)
   - 4.2 [OpenAI Function Calling (Tool Use)](#42-openai-function-calling-tool-use)
   - 4.3 [Server-Sent Events (SSE) Streaming](#43-server-sent-events-sse-streaming)
   - 4.4 [Message History & Turn Management](#44-message-history--turn-management)
5. [Tool Catalogue](#5-tool-catalogue)
   - 5.1 [Read Tools](#51-read-tools)
   - 5.2 [Write Tools](#52-write-tools)
6. [System Prompt Design](#6-system-prompt-design)
7. [Data Model](#7-data-model)
8. [Security & RBAC](#8-security--rbac)
9. [Stability & Robustness Features](#9-stability--robustness-features)
10. [Performance Optimisations](#10-performance-optimisations)
11. [Frontend Architecture](#11-frontend-architecture)
12. [API Reference](#12-api-reference)
13. [Configuration](#13-configuration)
14. [Error Handling](#14-error-handling)

---

## 1. Overview

**Aria** is a full-stack AI agent embedded in the AAcounting platform. It allows authenticated users to query business data, generate reports, and create records using natural language — no dashboards or filters needed.

### Core capabilities

| Capability | Description |
|---|---|
| **Natural language queries** | Ask "Which clients have overdue VAT filings?" and get structured, formatted results |
| **Multi-step reasoning** | Aria chains multiple tool calls in a single response to answer complex questions |
| **Write actions** | Create tasks, bulk tasks, update statuses, and generate invoice drafts — always with explicit user confirmation |
| **UAE compliance knowledge** | Built-in expertise on VAT (FTA), Corporate Tax, Trade Licenses, Emirates ID, Passports |
| **Context awareness** | Aria detects the current page and pre-loads relevant context (e.g. "You are viewing Client: ABC Corp") |
| **Real-time streaming** | Responses stream token-by-token via SSE; tool execution progress is shown live |
| **Role-based access** | Every tool call respects the authenticated user's role — employees cannot access others' data |
| **Conversation history** | Sessions are persisted to MongoDB and resumable across page refreshes |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          BROWSER                                 │
│                                                                  │
│  ┌────────────────────────────┐    ┌──────────────────────────┐ │
│  │  Chat Panel (React/Zustand) │    │  AIChatButton (FAB)       │ │
│  │  ├── SuggestedQuestions    │    │  Detects page context     │ │
│  │  ├── ChatMessage           │    └──────────────────────────┘ │
│  │  ├── ToolCallCard          │                                  │
│  │  ├── ChatInput             │                                  │
│  │  └── ChatSessionList       │                                  │
│  └────────────┬───────────────┘                                  │
│               │  fetch() + ReadableStream (SSE)                  │
└───────────────┼─────────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       EXPRESS BACKEND                            │
│                                                                  │
│   POST /api/ai-chat/stream                                       │
│   ├── Auth middleware (JWT)                                      │
│   ├── Rate limiter (chatLimiter)                                 │
│   └── ai-chat.controller.js → ai-chat.service.js                │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │                   streamChat()                            │  │
│   │                                                           │  │
│   │  1. Load / create ChatSession (MongoDB)                   │  │
│   │  2. Save user message immediately                         │  │
│   │  3. buildMessages() → history + system prompt             │  │
│   │  4. getToolsForRole(user.role) → filtered tool schemas    │  │
│   │                                                           │  │
│   │  ┌─────────────────────────────────────────────────────┐ │  │
│   │  │               AGENTIC LOOP (max 5 rounds)            │ │  │
│   │  │                                                       │ │  │
│   │  │  ┌──────────────────────────────────────────────┐    │ │  │
│   │  │  │  OpenAI GPT-4o (stream: true, max_tokens: 4096) │  │ │  │
│   │  │  └──────────────┬───────────────────────────────┘    │ │  │
│   │  │                 │                                     │ │  │
│   │  │    ┌────────────┴────────────┐                       │ │  │
│   │  │    │                         │                       │ │  │
│   │  │  delta tokens           tool_calls                   │ │  │
│   │  │    │                         │                       │ │  │
│   │  │  SSE delta           executeTool() with              │ │  │
│   │  │  → browser           Promise.race(15s timeout)       │ │  │
│   │  │                             │                        │ │  │
│   │  │                      Tool Results → fed back         │ │  │
│   │  │                      into next OpenAI call           │ │  │
│   │  │                      (continue loop)                 │ │  │
│   │  │                                                       │ │  │
│   │  │  finish_reason = 'stop' → exit loop, save session    │ │  │
│   │  └─────────────────────────────────────────────────────┘ │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│   ┌──────────────────┐   ┌──────────────────────────────────┐   │
│   │ ai-chat.toolExecutor │   │          MongoDB                  │   │
│   │                  │   │  ├── clients                      │   │
│   │ 16 tools mapped  │──▶│  ├── employees                   │   │
│   │ to DB queries &  │   │  ├── tasks                        │   │
│   │ write operations │   │  ├── timeentries                  │   │
│   └──────────────────┘   │  ├── invoices                    │   │
│                           │  ├── packages                    │   │
│                           │  └── chatsessions                │   │
│                           └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Backend Module Structure

```
backend/modules/ai-chat/
├── ai-chat.model.js         # ChatSession Mongoose schema
├── ai-chat.route.js         # Express routes + rate limiting
├── ai-chat.controller.js    # HTTP request handlers, SSE setup
├── ai-chat.service.js       # Core agent logic, agentic loop, streaming
├── ai-chat.tools.js         # OpenAI function schemas + RBAC filtering
└── ai-chat.toolExecutor.js  # Tool implementations (DB queries & actions)
```

### File responsibilities

**`ai-chat.model.js`**  
Defines the `ChatSession` document schema. Stores the full conversation thread including user messages, assistant replies, and all tool call/result pairs. See [Section 7](#7-data-model) for schema details.

**`ai-chat.route.js`**  
Registers three route groups under `/api/ai-chat/`:
- `POST /stream` — main streaming endpoint with `chatLimiter` (rate limited separately from other API routes)
- `GET/DELETE /sessions` — list and delete chat history
- `GET /insights` — proactive dashboard insights endpoint

**`ai-chat.controller.js`**  
Sets SSE response headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache`), handles `req.on('close')` disconnect detection, and delegates to `streamChat()` in the service.

**`ai-chat.service.js`**  
The brain of the agent. Contains:
- `buildSystemPrompt()` — dynamic system prompt with current date
- `buildMessages()` — history reconstruction with context window management
- `truncateToolResult()` — payload size control
- `estimateTokens()` / `estimateMessageTokens()` — token counting
- `streamChat()` — the agentic loop

**`ai-chat.tools.js`**  
Exports `TOOL_DEFINITIONS` (the full OpenAI function-calling schema array) and `getToolsForRole(role)` which filters tools based on the user's role — employees get read-only tools, managers/admins also get write tools.

**`ai-chat.toolExecutor.js`**  
Implements every tool as a plain `async` function. Contains:
- `escapeRegex()` — sanitises search inputs
- `applyRBACFilter()` — scopes queries by user role
- `resolveClientId()` / `resolveEmployeeId()` — name-to-ID resolution helpers
- 16 tool executor functions
- `executeTool()` dispatcher

---

## 4. Core Concepts

### 4.1 Agentic Loop

The agent does not make a single OpenAI call. It iterates in a loop until OpenAI returns `finish_reason = 'stop'`:

```
┌─────────────────────────────────────────────────────────┐
│  while (continueLoop && toolRound < MAX_TOOL_ROUNDS)    │
│                                                         │
│  ① Call OpenAI with current message history + tools     │
│  ② Stream tokens → SSE delta events to browser         │
│                                                         │
│  If finish_reason == 'tool_calls':                      │
│    ③ For each tool call:                                │
│       - sendEvent('tool_start')                         │
│       - executeTool() with 15s timeout                  │
│       - truncateToolResult()                            │
│       - sendEvent('tool_end')                           │
│       - incremental save to MongoDB                     │
│    ④ Append assistant message + tool results to history │
│    ⑤ Continue loop (back to ①)                         │
│                                                         │
│  If finish_reason == 'stop':                            │
│    ⑥ Save final assistant message                       │
│    ⑦ sendEvent('done')                                  │
│    ⑧ Exit loop                                         │
└─────────────────────────────────────────────────────────┘
```

**Guard rails on the loop:**
- `MAX_TOOL_ROUNDS = 5` — hard cap to prevent infinite looping
- Abort check before every OpenAI call and every tool execution
- 15-second `Promise.race` timeout per individual tool execution
- `finish_reason === 'length'` detection appends a truncation warning

### 4.2 OpenAI Function Calling (Tool Use)

Tools are defined as JSON Schema objects conforming to the OpenAI function-calling specification. The model decides *which* tools to call and *with what arguments* — this is not hardcoded.

Example: when a user asks *"Which clients have VAT due this month?"*, the model selects `get_compliance_status` with `{ daysAhead: 30 }`. The result is fed back, and the model formats a markdown table in response.

For write operations, the model is instructed via the system prompt to:
1. First describe what it's about to do
2. Ask the user to confirm
3. Only call the write tool when the user confirms AND passes `confirmed: true` in the arguments

This creates a two-step human-in-the-loop flow for all mutations.

### 4.3 Server-Sent Events (SSE) Streaming

The backend streams a continuous HTTP response using the SSE protocol. Each event is a JSON line:

```
data: {"type":"tool_start","name":"search_clients","id":"call_abc123"}\n\n
data: {"type":"tool_end","name":"search_clients","id":"call_abc123","result":{...}}\n\n
data: {"type":"delta","content":"Here are the clients"}\n\n
data: {"type":"delta","content":" with upcoming VAT filings:"}\n\n
data: {"type":"done","sessionId":"6789...","title":"VAT Filing Clients"}\n\n
```

**Event types:**

| Event | Payload | Purpose |
|---|---|---|
| `delta` | `{ content: string }` | Streamed token — appended to current message |
| `tool_start` | `{ name, id }` | Tool is executing — show spinner in UI |
| `tool_end` | `{ name, id, result }` | Tool complete — show result card |
| `done` | `{ sessionId, title }` | Stream finished — update session state |
| `error` | `{ message }` | Error occurred — show error in UI |

**Keep-alive:** During tool execution (which can take 2–10 seconds), SSE comment lines are sent every 5 seconds (`': keepalive\n\n'`) to prevent proxy timeouts (nginx, Cloudflare).

**Abort:** When the user clicks Stop, the frontend calls `abortController.abort()`. The backend detects the closed connection via `res.on('close')` and sets `aborted = true`, checked before every iteration.

### 4.4 Message History & Turn Management

OpenAI enforces a strict message ordering rule: every `assistant` message containing `tool_calls` **must** be immediately followed by one `tool` message per `tool_call_id`. Violating this returns a `400` error.

The `buildMessages()` function enforces this by:
1. Iterating through saved `sessionMessages`
2. For each assistant message with tool calls, looking ahead to collect all corresponding tool result messages
3. **If any tool result is missing, the entire turn is silently skipped** (rather than sending a broken history)
4. Only complete, validated turns are included in the messages array sent to OpenAI

**Context window management:**
- Token count is estimated with the heuristic: `chars / 4 ≈ tokens`
- If estimated tokens exceed `100,000` (~80% of GPT-4o's 128k window), the oldest conversation messages are dropped
- The system prompt and most recent 20 messages (10 user-assistant pairs) are always kept

---

## 5. Tool Catalogue

### 5.1 Read Tools

All read tools are available to all roles (ADMIN, DIRECTOR, MANAGER, EMPLOYEE), subject to RBAC data scoping.

#### `search_clients`
Search and list clients by name, status, emirate, VAT cycle, or compliance flag.

| Parameter | Type | Description |
|---|---|---|
| `search` | string | Partial name match |
| `status` | enum | `ACTIVE`, `INACTIVE`, `SUSPENDED` |
| `emirate` | string | e.g. Dubai, Abu Dhabi |
| `vatReturnCycle` | enum | `MONTHLY`, `QUARTERLY` |
| `hasComplianceIssues` | boolean | Filter to only clients with alerts |
| `limit` | number | Max results (default 20) |

---

#### `get_client_details`
Full client profile: business info, documents, partners, managers, packages, and compliance summary.

| Parameter | Type | Description |
|---|---|---|
| `clientId` | string | MongoDB ObjectId |
| `clientName` | string | Name search fallback if ID not known |

---

#### `get_compliance_status`
Compliance overview across all clients or a specific client. Checks trade licenses, VAT certificates, Emirates IDs, passports, VAT filing deadlines, and corporate tax due dates.

| Parameter | Type | Description |
|---|---|---|
| `clientId` | string | Optional — omit for all clients |
| `daysAhead` | number | Check items expiring within N days (default 30) |
| `includeExpired` | boolean | Include already expired items (default true) |

---

#### `search_tasks`
Filter tasks by status, client, assignee, priority, due date, or overdue flag.

| Parameter | Type | Description |
|---|---|---|
| `status` | enum | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`, `ARCHIVED` |
| `clientId` / `clientName` | string | Filter by client |
| `assignedToEmployeeId` / `assignedToName` | string | Filter by assignee |
| `priority` | enum | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `isOverdue` | boolean | Past due date and not completed |
| `dueBefore` / `dueAfter` | ISO string | Date range filter |
| `search` | string | Text search on task name |
| `limit` | number | Max results (default 20) |

---

#### `get_employee_workload`
Hours logged, active task count, utilisation percentage, and capacity for each employee over a date range.

| Parameter | Type | Description |
|---|---|---|
| `employeeId` | string | Specific employee (omit for all) |
| `employeeName` | string | Name search fallback |
| `startDate` / `endDate` | ISO string | Period (defaults to current month) |

*Implemented with aggregation pipelines — O(1) DB queries regardless of employee count.*

---

#### `get_invoice_summary`
Revenue totals, outstanding amounts, overdue invoices, and per-status breakdown.

| Parameter | Type | Description |
|---|---|---|
| `clientId` | string | Optional client filter |
| `status` | enum | `DRAFT`, `SENT`, `PAID`, `OVERDUE`, `CANCELLED` |
| `startDate` / `endDate` | ISO string | Date range |

---

#### `get_time_entries`
Time log entries filtered by employee, client, and date range with total hours summary.

| Parameter | Type | Description |
|---|---|---|
| `employeeId` / `employeeName` | string | Filter by employee |
| `clientId` / `clientName` | string | Filter by client |
| `startDate` / `endDate` | ISO string | Date range |
| `limit` | number | Max entries (default 20) |

---

#### `get_dashboard_stats`
High-level KPIs: active clients, total employees, active packages, pending tasks, overdue tasks, monthly hours logged, overdue invoices, and compliance alerts count.

No parameters required.

---

#### `get_analytics`
Financial analytics in three modes:

| `analyticsType` | Description |
|---|---|
| `package` | Contract value, hours logged, estimated cost, profit per package |
| `client` | Monthly revenue, estimated cost, profit per client |
| `employee` | Hours logged, capacity, utilisation %, revenue generated per employee |

*All three modes use aggregation pipelines — no N+1 queries.*

---

#### `search_employees`
Find employees by name, designation, or active status.

---

#### `get_packages`
List service packages for one or all clients, filtered by status or type.

---

### 5.2 Write Tools

Write tools are only available to **ADMIN**, **DIRECTOR**, and **MANAGER** roles. All write tools require `confirmed: true` in the arguments — the model asks the user before setting this.

#### `create_task`
Creates a single task linked to a client and package.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Task name |
| `clientId` | string | ✅ | Client to link |
| `packageId` | string | ✅ | Package to link |
| `description` | string | — | Task details |
| `category` | string | — | e.g. "VAT Filing", "Bookkeeping" |
| `priority` | enum | — | Default `MEDIUM` |
| `dueDate` | ISO string | — | Due date |
| `assignedTo` | string[] | — | Array of employee IDs |
| `confirmed` | boolean | ✅ | Must be `true` |

---

#### `create_bulk_tasks`
Creates the same task template across multiple clients in a single call (e.g. *"Create VAT filing tasks for all 12 quarterly clients due this month"*).

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskTemplate` | object | ✅ | Shared task fields (name, category, priority, dueDate) |
| `clientIds` | string[] | ✅ | Array of client IDs |
| `confirmed` | boolean | ✅ | Must be `true` |

---

#### `update_task_status`
Moves a task to a new status.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `taskId` | string | ✅ | Task to update |
| `status` | enum | ✅ | `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE` |
| `confirmed` | boolean | ✅ | Must be `true` |

---

#### `create_invoice_draft`
Generates a draft invoice for a client by aggregating all unbilled time entries, grouped by employee hourly rate.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `clientId` | string | ✅ | Client to invoice |
| `notes` | string | — | Invoice notes |
| `dueDate` | ISO string | — | Payment due (default +30 days) |
| `confirmed` | boolean | ✅ | Must be `true` |

---

## 6. System Prompt Design

The system prompt is rebuilt on every request via `buildSystemPrompt()` so the current date is always accurate (not frozen at server start).

The prompt covers:

1. **Identity** — Aria is an AI assistant for an UAE accounting firm management system
2. **Capabilities summary** — what it can read, act on, and its compliance expertise
3. **UAE domain knowledge** — VAT filing cycles, FTA rules, Corporate Tax thresholds, Trade License issuers, Emirates list, document types and their expiry rules
4. **Response formatting rules** — always use markdown, AED currency, readable dates, tables for tabular data
5. **Write operation protocol** — always describe the action, ask for confirmation, only call write tools with `confirmed: true`
6. **Current date** — injected dynamically per request

Additionally, if the user is on a specific page (e.g. `/clients/abc123`), a second system message is appended:
```
Current page context: client:abc123. The user may be asking about this specific entity.
```

---

## 7. Data Model

### `ChatSession` schema

```javascript
{
  userId:        ObjectId,    // ref: User — sessions are scoped per user
  title:         String,      // auto-generated from first message (first 7 words)
  messages: [{
    role:        String,      // 'user' | 'assistant' | 'tool' | 'system'
    content:     String,      // message text or tool result JSON string
    toolCalls: [{             // only on assistant messages
      id:        String,      // OpenAI tool_call_id (e.g. "call_abc123")
      name:      String,      // tool function name
      arguments: Mixed,       // parsed args passed to the tool
      result:    Mixed,       // tool execution result (truncated)
      executedAt: Date,
    }],
    toolCallId:  String,      // only on tool messages — matches assistant's tool_call id
    toolName:    String,      // only on tool messages
    timestamp:   Date,
  }],
  context: {
    pageContext:  String,     // e.g. "client:abc123", "dashboard", "tasks"
    contextData:  Mixed,      // reserved for pre-fetched context data
  },
  messageCount:  Number,      // denormalized count for list view
  lastMessageAt: Date,
  createdAt:     Date,        // auto (timestamps: true)
  updatedAt:     Date,        // auto (timestamps: true)
}
```

**Indexes:**
- `{ userId: 1 }` — fast lookup of user's sessions
- `{ userId: 1, updatedAt: -1 }` — sorted session list

---

## 8. Security & RBAC

### Role hierarchy

| Role | Read tools | Write tools | Data scope |
|---|---|---|---|
| `ADMIN` | All | All | All data |
| `DIRECTOR` | All | All | All data |
| `MANAGER` | All | All | All data (team-scoped for employee queries) |
| `EMPLOYEE` | Read-only | None | Own data only |

### RBAC enforcement

The `applyRBACFilter(query, user, entityType)` helper is called inside every tool executor before any DB query. It mutates the Mongoose query object:

- **EMPLOYEE**: Restricts `employee` queries to `{ _id: user.employeeId }` and `timeEntry`/`task` queries to `{ employeeId: user.employeeId }`
- **MANAGER**: Restricts employee queries to own employee or their managed team
- **ADMIN/DIRECTOR**: No restrictions

Write tools (`create_task`, `create_bulk_tasks`, `update_task_status`, `create_invoice_draft`) are filtered out of the tool list entirely for EMPLOYEE role via `getToolsForRole()` — the model never even sees these tools.

### Input sanitisation

All user-supplied search strings are passed through `escapeRegex()` before use in MongoDB `$regex` queries:

```javascript
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

This prevents ReDoS (Regular Expression Denial of Service) attacks via crafted search strings.

### Session isolation

Chat sessions are always fetched with both `_id` and `userId`:
```javascript
ChatSession.findOne({ _id: sessionId, userId: user._id })
```
A user cannot access another user's session even if they know the session ID.

### Rate limiting

The `/api/ai-chat/stream` endpoint has its own rate limiter (`chatLimiter`) separate from general API rate limits, protecting against:
- Accidental infinite request loops from the frontend
- Cost overruns from API abuse

---

## 9. Stability & Robustness Features

### Abort propagation

When the user clicks **Stop**:
1. Frontend calls `abortController.abort()`
2. Browser closes the SSE fetch connection
3. Backend fires `res.on('close')` → sets `aborted = true`
4. Backend checks `aborted` before every OpenAI call and before every tool execution
5. If aborted, function returns immediately — no further tokens or DB queries

### Loop guard

`MAX_TOOL_ROUNDS = 5` caps the agentic while loop. If the model calls tools 5 times without reaching a final response, the loop breaks and a message is appended to the response:
> *[Maximum tool execution rounds reached. Please start a new conversation if you need more assistance.]*

### Tool execution timeout

Each `executeTool()` call is wrapped in `Promise.race` with a 15-second timer:

```javascript
result = await Promise.race([
  executeTool(tc.name, parsedArgs, user),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Tool execution timeout')), 15000)
  ),
]);
```

If a MongoDB query hangs, the tool returns a structured error result and the agent can still continue or report the issue.

### SSE keep-alive

During tool execution (which may take 2–10 seconds), a `setInterval` fires every 5 seconds sending:
```
: keepalive\n\n
```
This is an SSE comment line (ignored by the browser parser) that keeps the TCP connection alive through nginx/Cloudflare proxies that close idle connections.

### Truncation detection

If OpenAI hits `max_tokens = 4096`, `finish_reason` is `'length'`. The agent detects this and appends:
> *[Response was truncated due to length. Please ask me to continue if you need more information.]*

### Incremental saves

Data is written to MongoDB progressively rather than in one large final write:

| Point in time | What is saved |
|---|---|
| Stream start | User message |
| After each tool | Tool call + result |
| Stream end | Final assistant response |

If the server crashes mid-stream, the user message and completed tool results are not lost.

### Tool result truncation

`truncateToolResult()` prevents large tool results from consuming the context window:
- Arrays capped at **10 items**
- String fields capped at **500 characters**
- Nested objects recursively truncated
- `truncated: true` flag added so the model knows to tell the user data was limited

### Context window management

Before sending messages to OpenAI, `buildMessages()` estimates the total token count (4 chars ≈ 1 token). If it exceeds `100,000` tokens (~80% of GPT-4o's 128k limit):
1. System messages are always kept
2. The most recent 20 conversation messages (10 turns) are kept
3. Older messages are dropped
4. A warning is logged

---

## 10. Performance Optimisations

### Aggregation pipelines (no N+1 queries)

`executeGetEmployeeWorkload` previously ran 2 queries per employee (N employees = 2N queries). It now uses two aggregation pipelines:

```javascript
// Single aggregation for all time entries
TimeEntry.aggregate([
  { $match: { employeeId: { $in: employeeIds }, date: { $gte: start, $lte: end } } },
  { $group: { _id: '$employeeId', totalMinutes: { $sum: '$minutesSpent' } } },
]);

// Single aggregation for all active tasks
Task.aggregate([
  { $match: { assignedTo: { $in: employeeIds }, status: { $in: [...] } } },
  { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
]);
```

The same pattern applies to:
- `executeGetAnalytics` (package, client, and employee modes)
- `executeGetDashboardStats` (compliance count via `$unwind` + `$match` + `$count`)

### MongoDB indexes used by tools

| Collection | Index | Used by |
|---|---|---|
| `chatsessions` | `{ userId: 1 }` | All session lookups |
| `chatsessions` | `{ userId: 1, updatedAt: -1 }` | Session list sorted |
| `timeentries` | `{ employeeId: 1, date: 1 }` | Workload, analytics |
| `timeentries` | `{ clientId: 1, date: 1 }` | Client analytics |
| `tasks` | `{ assignedTo: 1, status: 1 }` | Workload, task search |
| `clients` | `{ status: 1 }` | Client search |

---

## 11. Frontend Architecture

### Component tree

```
AppLayout
└── AIChatButton       (FAB, bottom-right, detects page context)
└── ChatPanel          (slide-out drawer, width: 420px / 720px)
    ├── Header         (Aria avatar, status dot, session title,
    │                   New / History / Maximize / Close buttons)
    ├── ChatSessionList  (shown when History is active)
    │   └── Session cards with delete
    ├── SuggestedQuestions  (shown when messages === [])
    │   ├── Capability pills
    │   ├── Context banner (if page context active)
    │   └── Suggestion cards (2-col grid in wide mode)
    ├── Messages area
    │   └── ChatMessage[]
    │       ├── ToolCallCard[] (expandable, shows tool name + result)
    │       └── ReactMarkdown (tables, lists, code, bold)
    └── ChatInput      (auto-resize textarea, send / stop button)
```

### State management (Zustand — `chatStore.js`)

| State field | Type | Description |
|---|---|---|
| `isOpen` | boolean | Panel visibility |
| `isWide` | boolean | 420px vs 720px panel width |
| `showSessions` | boolean | History view vs chat view |
| `activeSessionId` | string \| null | Current conversation ID |
| `activeSessionTitle` | string | Auto-generated title |
| `messages` | array | UI message objects for rendering |
| `isStreaming` | boolean | True while SSE stream is active |
| `streamingMessageId` | string | ID of the in-progress message |
| `abortController` | AbortController \| null | Used to cancel the stream |
| `sessions` | array | Cached session list |
| `pageContext` | string \| null | Current page route context |
| `insights` | array | Dashboard AI insights |

### SSE parsing (`api/aiChat.js`)

Uses `fetch` with `ReadableStream` (not `EventSource`) so that:
- Custom headers (Authorization JWT) can be sent
- The `AbortController` signal can be wired in
- Binary streaming works correctly across all browsers

```javascript
const response = await fetch('/api/ai-chat/stream', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, sessionId, pageContext }),
  signal: abortController.signal,
});

const reader = response.body.getReader();
// parse line-by-line, dispatch callbacks for each event type
```

### Wide mode

A `Maximize2` / `Minimize2` toggle in the panel header switches between:
- **Normal**: `420px` — side-by-side with content
- **Wide**: `720px` — more room for data tables and long responses

The `isWide` flag in the store is also passed to `SuggestedQuestions` to switch the suggestion grid from 1-column to 2-column.

---

## 12. API Reference

### `POST /api/ai-chat/stream`

Initiates a streaming chat turn.

**Auth:** Required (JWT Bearer)  
**Rate limit:** `chatLimiter` (separate limit)  
**Response:** `Content-Type: text/event-stream`

**Request body:**
```json
{
  "message": "Which employees are over-utilised this month?",
  "sessionId": "6789abc...",
  "pageContext": "dashboard"
}
```

`sessionId` is optional. If omitted, a new session is created.

**SSE Events:** See [Section 4.3](#43-server-sent-events-sse-streaming)

---

### `GET /api/ai-chat/sessions`

Returns paginated list of the authenticated user's chat sessions.

**Query params:** `page` (default 1), `limit` (default 20)

**Response:**
```json
{
  "sessions": [
    { "_id": "...", "title": "Employee utilisation", "messageCount": 6, "lastMessageAt": "..." }
  ],
  "total": 14,
  "page": 1,
  "limit": 20
}
```

---

### `GET /api/ai-chat/sessions/:id`

Returns a full session with all messages.

---

### `DELETE /api/ai-chat/sessions/:id`

Deletes a session (user-scoped — cannot delete another user's session).

---

### `GET /api/ai-chat/insights`

Returns AI-generated proactive insights for the dashboard (e.g. expiring licenses, over-utilised employees).

---

## 13. Configuration

| Variable | Location | Description |
|---|---|---|
| `OPENAI_API_KEY` | `backend/.env` | OpenAI API key |
| `MAX_TOOL_ROUNDS` | `ai-chat.service.js` (constant) | Max agentic loop iterations (default 5) |
| `MAX_CONTEXT_TOKENS` | `ai-chat.service.js` (constant) | Context window limit (default 100,000) |
| Tool timeout | `ai-chat.service.js` (inline) | Per-tool execution timeout (default 15s) |
| Keep-alive interval | `ai-chat.service.js` (inline) | SSE heartbeat interval (default 5s) |
| `max_tokens` | `ai-chat.service.js` (OpenAI call) | Max tokens per response (default 4096) |
| `temperature` | `ai-chat.service.js` (OpenAI call) | Model temperature (default 0.3 — factual) |
| `model` | `backend/config/openai.js` | OpenAI model (GPT-4o) |

---

## 14. Error Handling

| Scenario | Handling |
|---|---|
| OpenAI API error | Caught in `catch` block → `sendEvent('error', { message })` → shown in chat UI |
| Tool execution timeout (>15s) | `Promise.race` rejects → structured error result fed back to model → model reports to user |
| MongoDB query error | Caught in each tool's `try/catch` → `{ error: err.message }` returned to model |
| Malformed tool arguments | `JSON.parse` wrapped in try/catch → defaults to `{}` |
| SSE client disconnect | `res.on('close')` sets `aborted = true` → loop exits cleanly |
| Max tool rounds reached | Loop breaks → truncation message appended to response |
| `finish_reason === 'length'` | Truncation warning appended to response |
| Incomplete tool turn in history | Entire turn silently skipped in `buildMessages()` |
| Context window overflow | Older messages trimmed; system prompt + last 10 turns retained |
| Session not found | New session created automatically |
| Unauthorized session access | `findOne({ _id, userId })` returns null → 404 or new session |

---

*This document was generated from the live codebase of the AAcounting platform. For the most current implementation details, refer to the source files in `backend/modules/ai-chat/`.*
