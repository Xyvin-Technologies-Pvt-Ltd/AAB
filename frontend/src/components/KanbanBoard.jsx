import { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TaskCard } from "./TaskCard";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Inbox,
  AlertTriangle,
} from "lucide-react";

const DEFAULT_COLUMNS = [
  { id: "TODO", title: "To Do", color: "from-slate-600 to-slate-700" },
  { id: "IN_PROGRESS", title: "In Progress", color: "from-blue-500 to-blue-600" },
  { id: "DONE", title: "Done", color: "from-emerald-500 to-emerald-600" },
];

const WIP_LIMIT = 10;

const SortableTaskCard = (props) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const QuickAddInput = ({ onAdd, onCancel }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && value.trim()) {
      onAdd(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div className="mt-2 px-3 pb-2">
      <div className="bg-white rounded-lg border-2 border-indigo-400 shadow-md p-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task name… (Enter to add, Esc to cancel)"
          className="w-full text-xs text-gray-800 placeholder-gray-400 outline-none resize-none bg-transparent"
        />
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => value.trim() && onAdd(value.trim())}
            disabled={!value.trim()}
            className="px-2.5 py-1 bg-indigo-600 text-white text-[10px] font-semibold rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
          <button
            onClick={onCancel}
            className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

const KanbanColumn = ({
  column,
  tasks,
  onEdit,
  onDelete,
  onTaskClick,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onCompleteTimer,
  runningTimerId,
  isTimerRunning,
  isTimerPaused,
  onCopy,
  onQuickAdd,
  compact,
  onArchive,
}) => {
  const taskIds = tasks.map((task) => task._id);
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: "column", columnId: column.id },
  });

  const [collapsed, setCollapsed] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const isOverWip = tasks.length >= WIP_LIMIT;

  const handleQuickAdd = (name) => {
    onQuickAdd?.(name, column.id);
    setShowQuickAdd(false);
  };

  const headerBg = isOverWip
    ? "bg-gradient-to-br from-amber-500 to-orange-500"
    : `bg-gradient-to-br ${column.color}`;

  if (collapsed) {
    return (
      <div className="flex flex-col items-center bg-gray-100 rounded-lg w-10 flex-shrink-0 transition-all duration-300">
        <div
          className={`${headerBg} rounded-t-lg w-full flex items-center justify-center py-3 cursor-pointer`}
          onClick={() => setCollapsed(false)}
          title={`Expand ${column.title}`}
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1 flex flex-col items-center py-3 gap-2">
          <span
            className="text-[10px] font-bold text-gray-500 uppercase tracking-widest"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed", transform: "rotate(180deg)" }}
          >
            {column.title}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isOverWip ? "bg-amber-100 text-amber-700" : "bg-white text-gray-600"}`}>
            {tasks.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col bg-gray-50 rounded-lg overflow-hidden transition-all duration-300 flex-1 min-w-[260px] max-w-xs ${
        isOver ? "ring-2 ring-indigo-300 ring-offset-1" : ""
      }`}
      data-column-id={column.id}
    >
      {/* Column Header */}
      <div className={`${headerBg} px-3 py-2.5 flex-shrink-0`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white text-sm">{column.title}</h3>
            {isOverWip && (
              <AlertTriangle className="h-3.5 w-3.5 text-white/80" title={`WIP limit reached (${WIP_LIMIT})`} />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isOverWip ? "bg-white/30 text-white" : "bg-white/20 text-white"
            }`}>
              {isOverWip ? `${tasks.length}/${WIP_LIMIT}` : tasks.length}
            </span>
            <button
              onClick={() => setCollapsed(true)}
              className="text-white/70 hover:text-white hover:bg-white/10 rounded p-0.5 transition-colors"
              title="Collapse column"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Cards Area */}
      <div className="flex flex-col flex-1 min-h-0">
        <div className="p-2 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {tasks.length === 0 && !showQuickAdd ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-center cursor-pointer group"
              onClick={() => setShowQuickAdd(true)}
            >
              <div className="w-10 h-10 rounded-full bg-gray-100 group-hover:bg-indigo-50 flex items-center justify-center mb-2 transition-colors">
                <Inbox className="h-5 w-5 text-gray-300 group-hover:text-indigo-400 transition-colors" />
              </div>
              <p className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
                Drop tasks here or click to add
              </p>
            </div>
          ) : (
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <SortableTaskCard
                    key={task._id}
                    task={task}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTaskClick={onTaskClick}
                    onStartTimer={onStartTimer}
                    onPauseTimer={onPauseTimer}
                    onResumeTimer={onResumeTimer}
                    onCompleteTimer={onCompleteTimer}
                    runningTimerId={runningTimerId}
                    isTimerRunning={isTimerRunning}
                    isTimerPaused={isTimerPaused}
                    onCopy={onCopy}
                    onArchive={onArchive}
                    compact={compact}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>

        {/* Bottom fade gradient when scrollable */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent flex-shrink-0" />

        {/* Quick Add Area */}
        {showQuickAdd ? (
          <div className="flex-shrink-0">
            <QuickAddInput
              onAdd={handleQuickAdd}
              onCancel={() => setShowQuickAdd(false)}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-1.5 w-full px-3 py-2 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex-shrink-0 rounded-b-lg"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}
      </div>
    </div>
  );
};

export const KanbanBoard = ({
  tasks = [],
  columns: columnsProp,
  onTaskMove,
  onEdit,
  onDelete,
  onTaskClick,
  onStartTimer,
  onPauseTimer,
  onResumeTimer,
  onCompleteTimer,
  runningTimerId,
  isTimerRunning,
  isTimerPaused,
  onCopy,
  onQuickAdd,
  compact = false,
  onArchive,
}) => {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [activeId, setActiveId] = useState(null);

  const columns = columnsProp || DEFAULT_COLUMNS;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragStart = (event) => setActiveId(event.active.id);

  const handleDragOver = () => {};

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTask = localTasks.find((t) => t._id === active.id);
    if (!activeTask) return;

    let targetColumn = null;

    if (over.id && typeof over.id === "string" && over.id.startsWith("column-")) {
      targetColumn = over.id.replace("column-", "");
    } else {
      const overTask = localTasks.find((t) => t._id === over.id);
      if (overTask) targetColumn = overTask.status;
    }

    if (targetColumn && targetColumn !== activeTask.status && columns.find((c) => c.id === targetColumn)) {
      const updatedTasks = localTasks.map((task) =>
        task._id === active.id ? { ...task, status: targetColumn } : task
      );
      setLocalTasks(updatedTasks);
      if (onTaskMove) onTaskMove(active.id, { status: targetColumn });
      return;
    }

    const overTask = localTasks.find((t) => t._id === over.id);
    if (overTask && overTask.status === activeTask.status && over.id !== active.id) {
      const oldIndex = localTasks.findIndex((t) => t._id === active.id);
      const newIndex = localTasks.findIndex((t) => t._id === over.id);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newTasks = arrayMove(localTasks, oldIndex, newIndex);
        setLocalTasks(newTasks);
        if (onTaskMove) onTaskMove(active.id, { order: newIndex });
      }
    }
  };

  const activeTask = activeId ? localTasks.find((t) => t._id === activeId) : null;

  const tasksByStatus = columns.reduce((acc, col) => {
    acc[col.id] = localTasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 h-full overflow-x-auto pb-2">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskClick={onTaskClick}
            onStartTimer={onStartTimer}
            onPauseTimer={onPauseTimer}
            onResumeTimer={onResumeTimer}
            onCompleteTimer={onCompleteTimer}
            runningTimerId={runningTimerId}
            isTimerRunning={isTimerRunning}
            isTimerPaused={isTimerPaused}
            onCopy={onCopy}
            onQuickAdd={onQuickAdd}
            compact={compact}
            onArchive={onArchive}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-60 rotate-1 scale-105 shadow-2xl">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} onStartTimer={() => {}} compact={compact} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
