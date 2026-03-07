import { useEffect } from 'react';
import { Sparkles, AlertTriangle, Info, AlertCircle, Clock, Shield, FileText, CheckSquare, Loader2, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getInsights } from '@/api/aiChat';
import { useChatStore } from '@/store/chatStore';

const ICON_MAP = {
  clock: Clock,
  invoice: FileText,
  shield: Shield,
  tasks: CheckSquare,
  info: Info,
};

const TYPE_STYLES = {
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  error: {
    bg: 'bg-red-50 border-red-200',
    icon: 'text-red-600',
    dot: 'bg-red-500',
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    icon: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  success: {
    bg: 'bg-green-50 border-green-200',
    icon: 'text-green-600',
    dot: 'bg-green-500',
  },
};

const INSIGHT_PROMPTS = {
  clock: 'List all overdue tasks across all clients',
  invoice: 'Show me all overdue invoices with amounts',
  shield: 'Show compliance status for all clients — any expiring documents or upcoming VAT deadlines?',
  tasks: 'Show me a summary of all pending tasks',
};

export function AIInsightsWidget() {
  const openChat = useChatStore((s) => s.openChat);
  const isOpen = useChatStore((s) => s.isOpen);
  const { handleSend: _ } = {};

  const { data: insights = [], isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: getInsights,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const handleInsightClick = (insight) => {
    const prompt = INSIGHT_PROMPTS[insight.icon] || insight.message;
    openChat('dashboard');
    // Small delay to let panel open before sending message
    setTimeout(() => {
      useChatStore.getState().addUserMessage(prompt);
      useChatStore.getState().startAssistantMessage();
      // Trigger send via store (we'll dispatch through the API directly)
      import('@/api/aiChat').then(({ streamChatMessage }) => {
        const state = useChatStore.getState();
        const abortCtrl = new AbortController();
        useChatStore.getState().setAbortController(abortCtrl);

        streamChatMessage({
          message: prompt,
          sessionId: state.activeSessionId,
          pageContext: 'dashboard',
          abortController: abortCtrl,
          onDelta: (delta) => useChatStore.getState().appendDelta(delta),
          onToolStart: ({ id, name }) => useChatStore.getState().addToolCall({ id, name, status: 'running' }),
          onToolEnd: ({ id, name, result }) => useChatStore.getState().updateToolCallResult(id, result),
          onDone: ({ sessionId, title }) => useChatStore.getState().finalizeMessage(sessionId, title),
          onError: (msg) => useChatStore.getState().handleStreamError(msg),
        });
      });
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">AI Insights</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Analyzing your data...</span>
        </div>
      </div>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900">AI Insights</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 py-3">
          <CheckSquare className="h-4 w-4 text-green-500" />
          <span>All clear! No issues detected.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">AI Insights</span>
        <span className="ml-auto text-[10px] text-gray-400 font-medium uppercase tracking-wide">
          Live
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
      </div>

      {/* Insights list */}
      <div className="divide-y divide-gray-100">
        {insights.map((insight, i) => {
          const Icon = ICON_MAP[insight.icon] || Info;
          const styles = TYPE_STYLES[insight.type] || TYPE_STYLES.info;

          return (
            <button
              key={i}
              onClick={() => handleInsightClick(insight)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group"
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${styles.bg}`}>
                <Icon className={`h-3.5 w-3.5 ${styles.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 leading-snug">{insight.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Click to investigate with AI</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0 mt-1" />
            </button>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <button
          onClick={() => openChat('dashboard')}
          className="w-full flex items-center justify-center gap-2 text-xs text-violet-600 font-medium hover:text-violet-700 transition-colors"
        >
          <Sparkles className="h-3 w-3" />
          Ask Aria anything
        </button>
      </div>
    </div>
  );
}
