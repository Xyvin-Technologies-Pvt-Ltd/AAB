import {
  Pencil,
  Trash2,
  User,
  Calendar,
  AlertCircle,
  Play,
  Pause,
  Check,
  MoreVertical,
  Copy,
  Archive,
  Clock,
} from "lucide-react";
import { Button } from "@/ui/button";
import { Avatar } from "@/components/Avatar";
import { format, differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

const AUTO_ARCHIVE_DAYS = 7;

const getArchiveCountdown = (task) => {
  if (task.status !== "DONE" || !task.doneAt) return null;
  const doneDate = new Date(task.doneAt);
  const archiveDate = new Date(doneDate.getTime() + AUTO_ARCHIVE_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = differenceInDays(archiveDate, new Date());
  if (daysLeft < 0) return null;
  return daysLeft;
};

const priorityColors = {
  URGENT: "bg-red-100 text-red-800 border-red-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  LOW: "bg-gray-100 text-gray-800 border-gray-200",
};

const priorityDotColors = {
  URGENT: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-400",
  LOW: "bg-gray-400",
};

const priorityIcons = {
  URGENT: "🔴",
  HIGH: "🟠",
  MEDIUM: "🟡",
  LOW: "⚪",
};

const getAssigneeName = (assignedTo) => {
  if (!assignedTo) return null;
  if (Array.isArray(assignedTo)) {
    return assignedTo.length > 0
      ? { name: assignedTo[0]?.name || assignedTo[0]?.email || "", src: assignedTo[0]?.profilePicture?.url, extra: assignedTo.length - 1 }
      : null;
  }
  return { name: assignedTo.name || assignedTo.email || "", src: assignedTo.profilePicture?.url, extra: 0 };
};

const TimerActions = ({ isThisTaskRunning, isTimerRunning, onPause, onResume, onComplete, onStart, pauseMutPending, resumeMutPending, stopMutPending, startMutPending }) => {
  if (isThisTaskRunning) {
    return (
      <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
        {isTimerRunning ? (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onPause?.(); }}
            disabled={pauseMutPending} className="h-5 px-1 text-amber-600 hover:bg-amber-50" title="Pause">
            <Pause className="h-2.5 w-2.5" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onResume?.(); }}
            disabled={resumeMutPending} className="h-5 px-1 text-emerald-600 hover:bg-emerald-50" title="Resume">
            <Play className="h-2.5 w-2.5" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onComplete?.(); }}
          disabled={stopMutPending} className="h-5 px-1 text-blue-600 hover:bg-blue-50" title="Complete">
          <Check className="h-2.5 w-2.5" />
        </Button>
      </div>
    );
  }
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onStart?.(); }}
        disabled={startMutPending} className="h-5 px-1 text-emerald-600 hover:bg-emerald-50" title="Start Timer">
        <Play className="h-2.5 w-2.5" />
      </Button>
    </div>
  );
};

export const TaskCard = ({
  task,
  onEdit,
  onDelete,
  onTaskClick,
  dragHandleProps,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onCompleteTimer,
  runningTimerId,
  isTimerRunning,
  isTimerPaused,
  onCopy,
  onArchive,
  compact = false,
}) => {
  const priority = task.priority || "MEDIUM";
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";
  const taskIdStr = task._id?.toString() || task._id;
  const runningTimerIdStr = runningTimerId?.toString() || runningTimerId;
  const isThisTaskRunning = runningTimerIdStr && taskIdStr && runningTimerIdStr === taskIdStr;
  const archiveCountdown = getArchiveCountdown(task);

  const assignee = getAssigneeName(task.assignedTo);

  const borderClass = isThisTaskRunning && isTimerRunning
    ? "border-emerald-400 animate-heartbeat"
    : isThisTaskRunning
    ? "border-emerald-300"
    : isOverdue
    ? "border-red-300"
    : `${priorityColors[priority].split(" ").find(c => c.startsWith("border-")) || "border-transparent"}`;

  const cardActions = (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-5 px-1 hover:bg-gray-100" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-2.5 w-2.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(task); }} className="cursor-pointer text-xs">
            <Pencil className="h-3 w-3 mr-2" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopy?.(task); }} className="cursor-pointer text-xs">
            <Copy className="h-3 w-3 mr-2" /> Copy
          </DropdownMenuItem>
          {task.status === "DONE" && onArchive && (
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(task._id); }} className="cursor-pointer text-xs">
              <Archive className="h-3 w-3 mr-2" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
            className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 text-xs">
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (compact) {
    return (
      <div
        className={`${isOverdue ? "bg-red-50" : "bg-white"} rounded border-l-2 px-2 py-1.5 shadow-sm hover:shadow-md transition-colors flex items-center gap-2 ${borderClass} ${dragHandleProps ? "cursor-move" : "cursor-pointer"}`}
        {...(dragHandleProps || {})}
        onClick={(e) => { if (onTaskClick && !e.target.closest("button")) onTaskClick(task); }}
        onDoubleClick={(e) => { if (onEdit && !e.target.closest("button")) { e.stopPropagation(); onEdit(task); } }}
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDotColors[priority]}`} title={priority} />
        <span className={`text-xs font-medium truncate flex-1 min-w-0 ${isOverdue ? "text-red-700" : "text-gray-800"}`}>{task.name}</span>
        {isOverdue && <AlertCircle className="h-3 w-3 text-red-500 flex-shrink-0" />}
        {assignee && (
          <Avatar src={assignee.src} name={assignee.name} size="xs" className="flex-shrink-0" />
        )}
        {task.dueDate && (
          <span className={`text-[10px] flex-shrink-0 ${isOverdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
        <TimerActions
          isThisTaskRunning={isThisTaskRunning}
          isTimerRunning={isTimerRunning}
          onPause={onPauseTimer}
          onResume={onResumeTimer}
          onComplete={onCompleteTimer}
          onStart={() => onStartTimer?.(task._id)}
        />
        {cardActions}
      </div>
    );
  }

  return (
    <div
      className={`${isOverdue ? "bg-red-50" : "bg-white"} rounded-lg border-2 p-2.5 shadow-sm hover:shadow-md transition-colors relative ${borderClass} ${dragHandleProps ? "cursor-move" : "cursor-pointer"}`}
      {...(dragHandleProps || {})}
      onDoubleClick={(e) => { if (onEdit && !e.target.closest("button")) { e.stopPropagation(); onEdit(task); } }}
      onClick={(e) => { if (onTaskClick && !e.target.closest("button")) onTaskClick(task); }}
    >
      {/* Header with Priority */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isThisTaskRunning && (
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isTimerRunning ? "bg-emerald-500 animate-heartbeatDot" : "bg-amber-500"}`} />
          )}
          <h3 className={`font-semibold text-xs line-clamp-2 leading-tight ${isOverdue ? "text-red-800" : "text-gray-900"}`}>{task.name}</h3>
        </div>
        <span className="text-xs ml-1 flex-shrink-0" title={priority}>{priorityIcons[priority]}</span>
      </div>

      {/* Client & Package */}
      {(task.clientId?.name || task.packageId?.name) && (
        <div className={`text-[10px] mb-1.5 truncate ${isOverdue ? "text-red-400" : "text-gray-500"}`}>
          {task.clientId?.name && <span className="font-medium">{task.clientId.name}</span>}
          {task.clientId?.name && task.packageId?.name && <span className="mx-1">•</span>}
          {task.packageId?.name && <span>{task.packageId.name}</span>}
        </div>
      )}

      {/* Services & Activities Badges */}
      {(task.services?.length > 0 || task.activities?.length > 0) && (
        <div className="flex flex-wrap gap-0.5 mb-1.5">
          {task.services?.slice(0, 2).map((service, idx) => (
            <span key={service._id || service || idx} className="inline-block px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] leading-tight">
              {service.name || service}
            </span>
          ))}
          {task.activities?.slice(0, 2).map((activity, idx) => (
            <span key={activity._id || activity || idx} className="inline-block px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] leading-tight">
              {activity.name || activity}
            </span>
          ))}
          {(task.services?.length || 0) + (task.activities?.length || 0) > 4 && (
            <span className={`text-[10px] px-1 ${isOverdue ? "text-red-400" : "text-gray-500"}`}>
              +{(task.services?.length || 0) + (task.activities?.length || 0) - 4}
            </span>
          )}
        </div>
      )}

      {/* Footer: Assignee | Due Date | Actions */}
      <div className={`grid grid-cols-3 gap-1 items-center mt-1.5 pt-1.5 border-t ${isOverdue ? "border-red-200" : "border-gray-100"}`}>
        <div className="flex items-center gap-1 min-w-0">
          {assignee ? (
            <>
              <Avatar src={assignee.src} name={assignee.name} size="xs" />
              <span className={`text-[10px] truncate min-w-0 ${isOverdue ? "text-red-600" : "text-gray-600"}`}>
                {assignee.name}{assignee.extra > 0 && ` +${assignee.extra}`}
              </span>
            </>
          ) : (
            <>
              <User className={`h-2.5 w-2.5 flex-shrink-0 ${isOverdue ? "text-red-300" : "text-gray-400"}`} />
              <span className={`text-[10px] ${isOverdue ? "text-red-300" : "text-gray-400"}`}>-</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 min-w-0">
          <Calendar className={`h-2.5 w-2.5 flex-shrink-0 ${isOverdue ? "text-red-500" : "text-gray-400"}`} />
          {task.dueDate ? (
            <span className={`text-[10px] truncate ${isOverdue ? "text-red-600 font-semibold" : "text-gray-600"}`}>
              {format(new Date(task.dueDate), "MMM dd")}
            </span>
          ) : (
            <span className="text-[10px] text-gray-400">-</span>
          )}
          {isOverdue && <AlertCircle className="h-2.5 w-2.5 text-red-500 flex-shrink-0" />}
          {archiveCountdown !== null && (
            <span
              className="flex items-center gap-0.5 text-[9px] text-amber-500 font-medium ml-1"
              title={`Auto-archives in ${archiveCountdown} day${archiveCountdown !== 1 ? "s" : ""}`}
            >
              <Clock className="h-2.5 w-2.5" />
              {archiveCountdown}d
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-0.5">
          <TimerActions
            isThisTaskRunning={isThisTaskRunning}
            isTimerRunning={isTimerRunning}
            onPause={onPauseTimer}
            onResume={onResumeTimer}
            onComplete={onCompleteTimer}
            onStart={() => onStartTimer?.(task._id)}
          />
          {cardActions}
        </div>
      </div>
    </div>
  );
};
