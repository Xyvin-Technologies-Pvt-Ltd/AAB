import { useState, useEffect } from "react";
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

const columns = [
  { id: "TODO", title: "To Do" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "DONE", title: "Done" },
];

const SortableTaskCard = ({ task, onEdit, onDelete, onTaskClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <TaskCard
        task={task}
        onEdit={onEdit}
        onDelete={onDelete}
        onTaskClick={onTaskClick}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
};

const KanbanColumn = ({ column, tasks, onEdit, onDelete, onTaskClick }) => {
  const taskIds = tasks.map((task) => task._id);
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: "column",
      columnId: column.id,
    },
  });

  // Get column background color based on status
  const getColumnHeaderBg = (columnId) => {
    switch (columnId) {
      case "TODO":
        return "bg-gradient-to-br from-gray-600 to-gray-700";
      case "IN_PROGRESS":
        return "bg-gradient-to-br from-blue-500 to-blue-600";
      case "DONE":
        return "bg-gradient-to-br from-green-500 to-green-600";
      default:
        return "bg-gradient-to-br from-gray-600 to-gray-700";
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[300px] bg-gray-50 rounded-lg overflow-hidden transition-colors ${
        isOver ? "ring-2 ring-blue-300" : ""
      }`}
      data-column-id={column.id}
      data-type="column"
    >
      <div className={`${getColumnHeaderBg(column.id)} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{column.title}</h3>
          <span className="bg-white/20 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="p-4">
        <div className="min-h-[200px]">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8 pointer-events-none">
              No tasks in this column
            </div>
          ) : (
            <SortableContext
              items={taskIds}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {tasks.map((task) => (
                  <SortableTaskCard
                    key={task._id}
                    task={task}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onTaskClick={onTaskClick}
                  />
                ))}
              </div>
            </SortableContext>
          )}
        </div>
      </div>
    </div>
  );
};

export const KanbanBoard = ({
  tasks = [],
  onTaskMove,
  onEdit,
  onDelete,
  onTaskClick,
}) => {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    // This helps with drop detection, especially for empty columns
    const { over } = event;
    if (!over) return;
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeTask = localTasks.find((t) => t._id === active.id);
    if (!activeTask) return;

    // Find which column the drop happened in
    let targetColumn = null;

    // Check if dropped on a column droppable (empty column area)
    if (
      over.id &&
      typeof over.id === "string" &&
      over.id.startsWith("column-")
    ) {
      targetColumn = over.id.replace("column-", "");
    }
    // Check if dropped on a task
    else {
      const overTask = localTasks.find((t) => t._id === over.id);
      if (overTask) {
        targetColumn = overTask.status;
      }
    }

    // If moving to different column
    if (
      targetColumn &&
      targetColumn !== activeTask.status &&
      columns.find((c) => c.id === targetColumn)
    ) {
      const updatedTasks = localTasks.map((task) => {
        if (task._id === active.id) {
          return { ...task, status: targetColumn };
        }
        return task;
      });
      setLocalTasks(updatedTasks);
      if (onTaskMove) {
        onTaskMove(active.id, { status: targetColumn });
      }
      return;
    }

    // Reordering within same column - only if dropped on another task in the same column
    const overTask = localTasks.find((t) => t._id === over.id);
    if (
      overTask &&
      overTask.status === activeTask.status &&
      over.id !== active.id
    ) {
      const oldIndex = localTasks.findIndex((t) => t._id === active.id);
      const newIndex = localTasks.findIndex((t) => t._id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newTasks = arrayMove(localTasks, oldIndex, newIndex);
        setLocalTasks(newTasks);
        if (onTaskMove) {
          onTaskMove(active.id, { order: newIndex });
        }
      }
    }
  };

  const activeTask = activeId
    ? localTasks.find((t) => t._id === activeId)
    : null;

  const tasksByStatus = {
    TODO: localTasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: localTasks.filter((t) => t.status === "IN_PROGRESS"),
    DONE: localTasks.filter((t) => t.status === "DONE"),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            tasks={tasksByStatus[column.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="opacity-50">
            <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
