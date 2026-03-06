import { useQuery } from "@tanstack/react-query";
import { tasksApi } from "@/api/tasks";
import { Avatar } from "@/components/Avatar";
import { LoaderWithText } from "@/components/Loader";
import { AlertTriangle, CheckCircle2, Clock, ListTodo } from "lucide-react";

const STATUS_COLORS = {
  TODO: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-emerald-500",
};

const STATUS_LABELS = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  REVIEW: "Review",
  DONE: "Done",
};

const OVERLOAD_THRESHOLD = 10;

export const WorkloadView = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "workload"],
    queryFn: () => tasksApi.getWorkload(),
  });

  const workload = data?.data?.workload || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderWithText text="Loading workload..." />
      </div>
    );
  }

  if (workload.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ListTodo className="h-12 w-12 text-gray-200 mb-3" />
        <p className="text-sm font-medium text-gray-400">No workload data available</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 flex-shrink-0">
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${STATUS_COLORS[key]}`} />
            <span className="text-xs text-gray-600">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5 ml-4">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-gray-600">Overloaded ({">"}={OVERLOAD_THRESHOLD} tasks)</span>
        </div>
      </div>

      {/* Workload Rows */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {workload.map((row) => {
          const totalActive = (row.counts.TODO || 0) + (row.counts.IN_PROGRESS || 0) + (row.counts.REVIEW || 0);
          const totalAll = row.tasks.length;
          const isOverloaded = totalActive >= OVERLOAD_THRESHOLD;

          return (
            <div key={row.employee._id?.toString() || "unassigned"} className={`bg-white rounded-lg shadow-sm border ${isOverloaded ? "border-amber-200" : "border-gray-100"} p-4`}>
              <div className="flex items-center gap-4">
                {/* Employee Info */}
                <div className="flex items-center gap-2 w-44 flex-shrink-0">
                  <Avatar name={row.employee.name || "?"} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{row.employee.name || "Unassigned"}</p>
                    <p className="text-[10px] text-gray-400 truncate">{row.employee.email || ""}</p>
                  </div>
                  {isOverloaded && <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" title="Overloaded" />}
                </div>

                {/* Bar Chart */}
                <div className="flex-1 min-w-0">
                  {totalAll > 0 ? (
                    <div className="flex h-6 rounded-full overflow-hidden gap-px">
                      {Object.entries(STATUS_COLORS).map(([status, colorClass]) => {
                        const count = row.counts[status] || 0;
                        const pct = (count / totalAll) * 100;
                        if (pct === 0) return null;
                        return (
                          <div
                            key={status}
                            className={`${colorClass} flex items-center justify-center transition-all`}
                            style={{ width: `${pct}%` }}
                            title={`${STATUS_LABELS[status]}: ${count}`}
                          >
                            {pct > 8 && <span className="text-[9px] font-bold text-white">{count}</span>}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-6 bg-gray-100 rounded-full flex items-center px-3">
                      <span className="text-[10px] text-gray-400">No tasks</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-[10px] text-gray-500">{totalAll} total tasks</span>
                    {row.overdueCount > 0 && (
                      <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {row.overdueCount} overdue
                      </span>
                    )}
                    {row.counts.DONE > 0 && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {row.counts.DONE} done
                      </span>
                    )}
                  </div>
                </div>

                {/* Active count bubble */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${isOverloaded ? "bg-amber-100" : totalActive > 5 ? "bg-blue-50" : "bg-gray-50"}`}>
                  <div className="text-center">
                    <span className={`text-sm font-bold ${isOverloaded ? "text-amber-600" : "text-gray-700"}`}>{totalActive}</span>
                    <p className="text-[9px] text-gray-400 leading-tight">active</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
