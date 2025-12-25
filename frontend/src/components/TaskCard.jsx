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
      className={`bg-white rounded-lg border-2 p-4 shadow-sm hover:shadow-md transition-shadow ${
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
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm text-gray-900 flex-1 line-clamp-2">
          {task.name}
        </h3>
        <div className="flex items-center gap-1 ml-2">
          <span className="text-xs" title={priority}>
            {priorityIcons[priority]}
          </span>
        </div>
      </div>

      {/* Client & Package */}
      <div className="text-xs text-gray-600 mb-2 space-y-1">
        {task.clientId?.name && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Client:</span>
            <span>{task.clientId.name}</span>
          </div>
        )}
        {task.packageId?.name && (
          <div className="flex items-center gap-1">
            <span className="font-medium">Package:</span>
            <span>{task.packageId.name}</span>
          </div>
        )}
      </div>

      {/* Assignees */}
      {task.assignedTo && (
        <div className="flex items-center gap-2 mb-2 text-xs text-gray-600 flex-wrap">
          <User className="h-3 w-3 flex-shrink-0" />
          <div className="flex flex-wrap gap-1">
            {Array.isArray(task.assignedTo) ? (
              task.assignedTo.length > 0 ? (
                <>
                  {task.assignedTo.slice(0, 2).map((emp, idx) => (
                    <span key={emp._id || emp || idx}>
                      {emp.name || emp.email || emp}
                      {idx < Math.min(task.assignedTo.length, 2) - 1 && ','}
                    </span>
                  ))}
                  {task.assignedTo.length > 2 && (
                    <span className="text-gray-500">+{task.assignedTo.length - 2} more</span>
                  )}
                </>
              ) : null
            ) : (
              <span>{task.assignedTo.name || task.assignedTo.email || task.assignedTo}</span>
            )}
          </div>
        </div>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <div
          className={`flex items-center gap-2 mb-3 text-xs ${
            isOverdue ? "text-red-600 font-semibold" : "text-gray-600"
          }`}
        >
          <Calendar className="h-3 w-3" />
          <span>{format(new Date(task.dueDate), "MMM dd, yyyy")}</span>
          {isOverdue && <AlertCircle className="h-3 w-3 text-red-600" />}
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-2 pt-2 border-t border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          className="h-7 px-2 text-xs"
        >
          <Pencil className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
          className="h-7 px-2 text-xs text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};
