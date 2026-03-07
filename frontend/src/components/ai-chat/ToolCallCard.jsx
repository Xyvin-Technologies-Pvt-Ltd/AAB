import { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, CheckCircle2, Database, Search, BarChart3, FileText, Users, Clock, AlertTriangle } from 'lucide-react';

const TOOL_ICONS = {
  search_clients: Search,
  get_client_details: Users,
  get_compliance_status: AlertTriangle,
  search_tasks: CheckCircle2,
  get_employee_workload: Users,
  get_invoice_summary: FileText,
  get_time_entries: Clock,
  get_dashboard_stats: BarChart3,
  get_analytics: BarChart3,
  search_employees: Users,
  get_packages: FileText,
  create_task: CheckCircle2,
  create_bulk_tasks: CheckCircle2,
  update_task_status: CheckCircle2,
  create_invoice_draft: FileText,
};

const TOOL_LABELS = {
  search_clients: 'Searching clients',
  get_client_details: 'Loading client details',
  get_compliance_status: 'Checking compliance status',
  search_tasks: 'Searching tasks',
  get_employee_workload: 'Checking employee workload',
  get_invoice_summary: 'Loading invoice summary',
  get_time_entries: 'Loading time entries',
  get_dashboard_stats: 'Getting dashboard stats',
  get_analytics: 'Running analytics',
  search_employees: 'Searching employees',
  get_packages: 'Loading packages',
  create_task: 'Creating task',
  create_bulk_tasks: 'Creating bulk tasks',
  update_task_status: 'Updating task status',
  create_invoice_draft: 'Creating invoice draft',
};

export function ToolCallCard({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const { name, id, result, status } = toolCall;
  const isDone = status === 'done';
  const Icon = TOOL_ICONS[name] || Database;
  const label = TOOL_LABELS[name] || name.replace(/_/g, ' ');

  const resultStr = result ? JSON.stringify(result, null, 2) : null;
  const hasError = result?.error;

  return (
    <div className="my-1 rounded-lg border border-border/50 bg-muted/30 text-xs overflow-hidden">
      <button
        onClick={() => isDone && resultStr && setExpanded(!expanded)}
        className={`flex items-center gap-2 w-full px-3 py-2 text-left transition-colors ${
          isDone && resultStr ? 'hover:bg-muted/50 cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className={`flex-shrink-0 ${hasError ? 'text-destructive' : isDone ? 'text-green-500' : 'text-primary'}`}>
          {isDone ? (
            hasError ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          )}
        </div>
        <Icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className={`font-medium ${hasError ? 'text-destructive' : 'text-foreground/80'}`}>
          {label}
          {isDone && !hasError && result?.count !== undefined && (
            <span className="ml-1 text-muted-foreground font-normal">({result.count} results)</span>
          )}
          {hasError && <span className="ml-1 font-normal text-destructive/80">— {result.error}</span>}
        </span>
        {isDone && resultStr && (
          <span className="ml-auto text-muted-foreground">
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
      </button>

      {expanded && resultStr && (
        <div className="border-t border-border/50 px-3 py-2 bg-muted/20">
          <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
            {resultStr}
          </pre>
        </div>
      )}
    </div>
  );
}
