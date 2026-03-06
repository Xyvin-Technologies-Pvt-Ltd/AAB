import { useState, useMemo } from "react";
import { format, addDays, differenceInDays, isToday, isBefore, isAfter } from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";
import { Button } from "@/ui/button";

const STATUS_BAR_COLORS = {
  TODO: "bg-gray-400 hover:bg-gray-500",
  IN_PROGRESS: "bg-blue-500 hover:bg-blue-600",
  REVIEW: "bg-purple-500 hover:bg-purple-600",
  DONE: "bg-emerald-500 hover:bg-emerald-600",
  ARCHIVED: "bg-gray-200",
};

const DAYS_VISIBLE = 21;

export const TimelineView = ({ tasks = [], onTaskClick, groupBy = "client" }) => {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 3);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [activeGroupBy, setActiveGroupBy] = useState(groupBy);

  const days = useMemo(() => {
    return Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const endDate = days[days.length - 1];

  const navigate = (delta) => {
    setStartDate((d) => addDays(d, delta));
  };

  // Group tasks
  const groups = useMemo(() => {
    const groupMap = {};
    const visibleTasks = tasks.filter((t) => t.status !== "ARCHIVED" && t.dueDate);

    for (const task of visibleTasks) {
      let key, label;
      if (activeGroupBy === "client") {
        key = task.clientId?._id || "no-client";
        label = task.clientId?.name || "No Client";
      } else {
        const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
        if (assignees.length === 0) {
          key = "unassigned";
          label = "Unassigned";
        } else {
          key = assignees[0]?._id || "unassigned";
          label = assignees[0]?.name || assignees[0]?.email || "Unassigned";
        }
      }

      if (!groupMap[key]) groupMap[key] = { key, label, tasks: [] };
      groupMap[key].tasks.push(task);
    }

    return Object.values(groupMap).sort((a, b) => a.label.localeCompare(b.label));
  }, [tasks, activeGroupBy]);

  const getBarStyle = (task) => {
    const due = new Date(task.dueDate);
    const created = task.createdAt ? new Date(task.createdAt) : addDays(due, -1);
    const effectiveStart = isAfter(created, startDate) ? created : startDate;
    const effectiveEnd = isBefore(due, endDate) ? due : endDate;

    if (isAfter(effectiveStart, endDate) || isBefore(effectiveEnd, startDate)) return null;

    const leftPct = (differenceInDays(effectiveStart, startDate) / DAYS_VISIBLE) * 100;
    const widthPct = Math.max(1, (differenceInDays(effectiveEnd, effectiveStart) + 1) / DAYS_VISIBLE * 100);

    return { left: `${leftPct}%`, width: `${Math.min(widthPct, 100 - leftPct)}%` };
  };

  const isOverdue = (task) => task.dueDate && isBefore(new Date(task.dueDate), new Date()) && task.status !== "DONE";

  const todayOffset = (differenceInDays(new Date(), startDate) / DAYS_VISIBLE) * 100;
  const showTodayLine = todayOffset >= 0 && todayOffset <= 100;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white">
          <Button variant="ghost" size="sm" onClick={() => setActiveGroupBy("client")}
            className={`text-xs h-7 px-3 ${activeGroupBy === "client" ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}>
            By Client
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setActiveGroupBy("assignee")}
            className={`text-xs h-7 px-3 ${activeGroupBy === "assignee" ? "bg-indigo-600 text-white hover:bg-indigo-700" : ""}`}>
            By Assignee
          </Button>
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="outline" size="sm" onClick={() => navigate(-7)} className="h-7 w-7 p-0">
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setStartDate(() => { const d = new Date(); d.setDate(d.getDate() - 3); d.setHours(0,0,0,0); return d; })}
            className="h-7 px-3 text-xs">
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(7)} className="h-7 w-7 p-0">
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <span className="text-sm text-gray-600 font-medium">
          {format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-auto bg-white rounded-lg shadow border border-gray-100">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-100">
            <div className="w-44 flex-shrink-0 px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">
              {activeGroupBy === "client" ? "Client" : "Assignee"}
            </div>
            <div className="flex-1 flex relative">
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={`flex-1 text-center py-1.5 border-r border-gray-50 last:border-r-0 ${isToday(day) ? "bg-indigo-50" : ""}`}
                >
                  <div className={`text-[9px] font-semibold uppercase ${isToday(day) ? "text-indigo-600" : "text-gray-400"}`}>
                    {format(day, "EEE")}
                  </div>
                  <div className={`text-[10px] font-bold ${isToday(day) ? "text-indigo-700" : "text-gray-600"}`}>
                    {format(day, "d")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group rows */}
          {groups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-10 w-10 text-gray-200 mb-3" />
              <p className="text-sm text-gray-400">No tasks with due dates in this period</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.key} className="border-b border-gray-50 last:border-b-0">
                {/* Group header */}
                <div className="flex items-center bg-gray-50 border-b border-gray-100">
                  <div className="w-44 flex-shrink-0 px-3 py-1.5">
                    <span className="text-xs font-semibold text-gray-700 truncate block">{group.label}</span>
                    <span className="text-[10px] text-gray-400">{group.tasks.length} task{group.tasks.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex-1 h-7 border-r border-gray-100 last:border-r-0" />
                </div>

                {/* Task rows */}
                {group.tasks.map((task) => {
                  const barStyle = getBarStyle(task);
                  const overdue = isOverdue(task);
                  const barColorClass = overdue && task.status !== "DONE"
                    ? "bg-red-400 hover:bg-red-500"
                    : STATUS_BAR_COLORS[task.status] || "bg-gray-300";

                  return (
                    <div key={task._id} className="flex items-center hover:bg-gray-50 border-b border-gray-50 last:border-b-0 group">
                      <div className="w-44 flex-shrink-0 px-3 py-1.5 border-r border-gray-100">
                        <p className="text-xs text-gray-700 truncate">{task.name}</p>
                        {overdue && (
                          <span className="text-[9px] text-red-500 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" /> Overdue
                          </span>
                        )}
                      </div>
                      <div className="flex-1 relative h-9 flex items-center">
                        {/* Day grid lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {days.map((day) => (
                            <div key={day.toISOString()} className={`flex-1 border-r border-gray-50 last:border-r-0 h-full ${isToday(day) ? "bg-indigo-50/30" : ""}`} />
                          ))}
                        </div>
                        {/* Today marker */}
                        {showTodayLine && (
                          <div
                            className="absolute top-0 bottom-0 w-px bg-indigo-400 z-10 pointer-events-none"
                            style={{ left: `${todayOffset}%` }}
                          />
                        )}
                        {/* Task bar */}
                        {barStyle && (
                          <button
                            onClick={() => onTaskClick?.(task)}
                            className={`absolute h-6 rounded-full ${barColorClass} transition-all cursor-pointer flex items-center px-2 overflow-hidden shadow-sm z-10`}
                            style={barStyle}
                            title={`${task.name} — Due: ${format(new Date(task.dueDate), "MMM d")}`}
                          >
                            <span className="text-[9px] font-semibold text-white truncate">{task.name}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
