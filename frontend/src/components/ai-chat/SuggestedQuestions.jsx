import { Sparkles, TrendingUp, Users, FileCheck, Clock, BarChart3, ListTodo, AlertTriangle, DollarSign } from 'lucide-react';

const ROLE_QUESTIONS = {
  ADMIN: [
    { icon: BarChart3, label: 'Dashboard summary', prompt: 'Give me a dashboard summary with key stats', color: 'text-violet-500 bg-violet-500/10' },
    { icon: AlertTriangle, label: 'Compliance overview', prompt: 'Show compliance status for all clients — any expiring documents or upcoming VAT deadlines?', color: 'text-amber-500 bg-amber-500/10' },
    { icon: Users, label: "Who's overworked?", prompt: 'Which employees are over-utilized this month?', color: 'text-rose-500 bg-rose-500/10' },
    { icon: DollarSign, label: 'Revenue this month', prompt: 'What is our total monthly revenue and outstanding invoices?', color: 'text-emerald-500 bg-emerald-500/10' },
    { icon: ListTodo, label: 'Overdue tasks', prompt: 'List all overdue tasks across all clients', color: 'text-orange-500 bg-orange-500/10' },
    { icon: TrendingUp, label: 'Top clients', prompt: 'Which clients are most profitable this month?', color: 'text-blue-500 bg-blue-500/10' },
  ],
  DIRECTOR: [
    { icon: BarChart3, label: 'Dashboard summary', prompt: 'Give me a dashboard summary with key stats', color: 'text-violet-500 bg-violet-500/10' },
    { icon: AlertTriangle, label: 'Compliance overview', prompt: 'Show compliance status for all clients — any expiring documents or upcoming VAT deadlines?', color: 'text-amber-500 bg-amber-500/10' },
    { icon: Users, label: "Who's overworked?", prompt: 'Which employees are over-utilized this month?', color: 'text-rose-500 bg-rose-500/10' },
    { icon: DollarSign, label: 'Revenue this month', prompt: 'What is our total monthly revenue and outstanding invoices?', color: 'text-emerald-500 bg-emerald-500/10' },
    { icon: TrendingUp, label: 'Client profitability', prompt: 'Show profitability analysis for all clients', color: 'text-blue-500 bg-blue-500/10' },
    { icon: ListTodo, label: 'Overdue tasks', prompt: 'List all overdue tasks across all clients', color: 'text-orange-500 bg-orange-500/10' },
  ],
  MANAGER: [
    { icon: Users, label: "Team workload", prompt: 'Show workload and utilization for my team this month', color: 'text-violet-500 bg-violet-500/10' },
    { icon: ListTodo, label: 'Overdue tasks', prompt: 'List overdue tasks in my team', color: 'text-rose-500 bg-rose-500/10' },
    { icon: AlertTriangle, label: 'Client compliance', prompt: 'Are there any clients with compliance issues in the next 30 days?', color: 'text-amber-500 bg-amber-500/10' },
    { icon: TrendingUp, label: 'Client profitability', prompt: 'Show profitability for my clients', color: 'text-emerald-500 bg-emerald-500/10' },
  ],
  EMPLOYEE: [
    { icon: ListTodo, label: 'My tasks today', prompt: 'Show my pending and in-progress tasks', color: 'text-violet-500 bg-violet-500/10' },
    { icon: Clock, label: 'Hours this week', prompt: 'How many hours have I logged this week?', color: 'text-blue-500 bg-blue-500/10' },
    { icon: AlertTriangle, label: 'Upcoming deadlines', prompt: 'What are my upcoming task deadlines?', color: 'text-amber-500 bg-amber-500/10' },
  ],
};

const CONTEXT_QUESTIONS = {
  client: [
    { icon: FileCheck, label: 'Client summary', prompt: 'Summarize this client — status, packages, and any issues', color: 'text-violet-500 bg-violet-500/10' },
    { icon: AlertTriangle, label: 'Missing documents', prompt: 'What documents are missing or expired for this client?', color: 'text-amber-500 bg-amber-500/10' },
    { icon: ListTodo, label: 'Open tasks', prompt: 'What are the open tasks for this client?', color: 'text-blue-500 bg-blue-500/10' },
    { icon: TrendingUp, label: 'Profitability', prompt: 'What is the profitability and time logged for this client?', color: 'text-emerald-500 bg-emerald-500/10' },
  ],
  analytics: [
    { icon: TrendingUp, label: 'Top clients', prompt: 'Which clients are most profitable?', color: 'text-emerald-500 bg-emerald-500/10' },
    { icon: Users, label: 'Top employees', prompt: 'Who are the top performing employees by utilization?', color: 'text-violet-500 bg-violet-500/10' },
  ],
};

const CAPABILITIES = [
  { icon: BarChart3, text: 'Analytics & Reports', color: 'text-violet-500' },
  { icon: FileCheck, text: 'Compliance & Docs', color: 'text-amber-500' },
  { icon: Users, text: 'Team & Workload', color: 'text-blue-500' },
  { icon: DollarSign, text: 'Invoices & Revenue', color: 'text-emerald-500' },
];

export function SuggestedQuestions({ role, pageContext, onSelect, isWide }) {
  const roleQuestions = ROLE_QUESTIONS[role] || ROLE_QUESTIONS.EMPLOYEE;

  const contextType = pageContext?.startsWith('client:') ? 'client'
    : pageContext?.startsWith('analytics') ? 'analytics'
    : null;

  const contextQuestions = contextType ? CONTEXT_QUESTIONS[contextType] || [] : [];
  const hasContext = contextQuestions.length > 0;

  // Show more suggestions in wide mode
  const maxQuestions = isWide ? 6 : 4;
  const displayQuestions = hasContext
    ? [...contextQuestions, ...roleQuestions].slice(0, maxQuestions)
    : roleQuestions.slice(0, maxQuestions);

  return (
    <div className="flex flex-col h-full px-5 py-6 gap-6 overflow-y-auto">
      {/* Welcome hero */}
      <div className="flex flex-col items-center text-center gap-4 pt-2">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          {/* Pulse ring */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 animate-ping opacity-20" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-bold text-foreground tracking-tight">Hi, I'm Aria</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-[280px]">
            Your AI assistant for clients, tasks, compliance&nbsp;&amp;&nbsp;analytics.
          </p>
        </div>

        {/* Capability pills */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {CAPABILITIES.map(({ icon: Icon, text, color }) => (
            <span
              key={text}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/50"
            >
              <Icon className={`h-3 w-3 ${color}`} />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* Context banner */}
      {hasContext && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/20 text-xs text-violet-600 dark:text-violet-400">
          <div className="h-1.5 w-1.5 rounded-full bg-violet-500 flex-shrink-0" />
          <span className="font-medium">Context active:</span>
          <span className="text-muted-foreground">Aria knows what you're viewing</span>
        </div>
      )}

      {/* Suggestions */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">
          {hasContext ? 'Suggestions for this page' : 'Try asking'}
        </p>

        <div className={`grid gap-2 ${isWide && displayQuestions.length > 3 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {displayQuestions.map((q, i) => {
            const Icon = q.icon;
            return (
              <button
                key={i}
                onClick={() => onSelect(q.prompt)}
                className="group flex items-center gap-3 text-left px-3.5 py-3 rounded-xl border border-border/60 bg-card hover:border-violet-500/40 hover:bg-violet-500/5 hover:shadow-sm transition-all duration-150"
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${q.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm text-foreground/75 group-hover:text-foreground transition-colors leading-tight">
                  {q.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <p className="text-center text-[11px] text-muted-foreground/60 mt-auto pb-1">
        Ask anything in natural language
      </p>
    </div>
  );
}
