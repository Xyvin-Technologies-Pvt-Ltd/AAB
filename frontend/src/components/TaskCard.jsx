import { Pencil, Trash2, User, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/ui/button";
import { format } from "date-fns";

const priorityColors = {
  URGENT: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityIcons = {
  URGENT: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "⚪",
};

export const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onTaskClick,
  dragHandleProps,
}) => {
  const priority = task.priority || "MEDIUM";
  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "DONE";

  return (
    <div
      className={`bg-white rounded-lg border-2 p-2 shadow-sm hover:shadow-md transition-shadow ${
        isOverdue ? "border-red-300" : priorityColors[priority]
      } ${dragHandleProps ? "cursor-move" : ""}`}
      {...(dragHandleProps || {})}
      onDoubleClick={(e) => {
        if (onEdit && !e.target.closest("button")) {
          e.stopPropagation();
          onEdit(task);
        }
      }}
      onClick={(e) => {
        if (onTaskClick && !e.target.closest("button")) {
          onTaskClick(task);
        }
      }}
    >
      {/* Header with Priority */}
      <div className="flex items-start justify-between mb-1.5">
        <h3 className="font-semibold text-xs text-gray-900 flex-1 line-clamp-2 leading-tight">
          {task.name}
        </h3>
        <span className="text-xs ml-1 flex-shrink-0" title={priority}>
          {priorityIcons[priority]}
        </span>
      </div>

      {/* Client & Package - Single Line */}
      {(task.clientId?.name || task.packageId?.name) && (
        <div className="text-[10px] text-gray-500 mb-1.5 truncate">
          {task.clientId?.name && <span className="font-medium">{task.clientId.name}</span>}
          {task.clientId?.name && task.packageId?.name && <span className="mx-1">•</span>}
          {task.packageId?.name && <span>{task.packageId.name}</span>}
        </div>
      )}

      {/* Services & Activities - Compact Badges */}
      {(task.services?.length > 0 || task.activities?.length > 0) && (
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {task.services?.slice(0, 2).map((service, idx) => (
            <span
              key={service._id || service || idx}
              className="inline-block px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] leading-tight"
            >
              {service.name || service}
            </span>
          ))}
          {task.activities?.slice(0, 2).map((activity, idx) => (
            <span
              key={activity._id || activity || idx}
              className="inline-block px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] leading-tight"
            >
              {activity.name || activity}
            </span>
          ))}
          {((task.services?.length || 0) + (task.activities?.length || 0) > 4) && (
            <span className="text-[10px] text-gray-500 px-1">
              +{((task.services?.length || 0) + (task.activities?.length || 0) - 4)}
            </span>
          )}
        </div>
      )}

      {/* 3-Column Grid: Assignee | Due Date | Actions */}
      <div className="grid grid-cols-3 gap-1.5 items-center mt-1.5 pt-1.5 border-t border-gray-100">
        {/* Assignee */}
        <div className="flex items-center gap-1 min-w-0">
          <User className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
          <div className="text-[10px] text-gray-600 truncate min-w-0">
            {task.assignedTo && Array.isArray(task.assignedTo) ? (
              task.assignedTo.length > 0 ? (
                <span className="truncate">
                  {task.assignedTo[0]?.name || task.assignedTo[0]?.email || task.assignedTo[0]}
                  {task.assignedTo.length > 1 && ` +${task.assignedTo.length - 1}`}
                </span>
              ) : (
                <span className="text-gray-400">-</span>
              )
            ) : task.assignedTo ? (
              <span className="truncate">
                {task.assignedTo.name || task.assignedTo.email || task.assignedTo}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-1 min-w-0">
          <Calendar className={`h-2.5 w-2.5 flex-shrink-0 ${
            isOverdue ? "text-red-500" : "text-gray-400"
          }`} />
          <div className="text-[10px] min-w-0">
            {task.dueDate ? (
              <span className={`truncate ${
                isOverdue ? "text-red-600 font-semibold" : "text-gray-600"
              }`}>
                {format(new Date(task.dueDate), "MMM dd")}
              </span>
            ) : (
              <span className="text-gray-400">-</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div
          className="flex items-center justify-end gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="h-5 px-1.5 text-[10px] hover:bg-gray-100"
          >
            <Pencil className="h-2.5 w-2.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task._id);
            }}
            className="h-5 px-1.5 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
