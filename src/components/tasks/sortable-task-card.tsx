"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import TaskCard from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface SortableTaskCardProps {
  task: Task;
  onDelete?: () => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export default function SortableTaskCard({
  task,
  onDelete,
  onSelect,
  isSelected,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("relative", isDragging && "opacity-50")}
    >
      {/* Drag handle — the ONLY drag activator */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        className={cn(
          "absolute left-0 top-0 z-10 flex h-full cursor-grab items-center justify-center px-1.5",
          "touch-none active:cursor-grabbing",
        )}
        style={{ paddingTop: 0, paddingBottom: 0 }}
      >
        <GripVertical className="size-4 text-muted-foreground opacity-50 transition-opacity hover:opacity-100" />
      </button>

      {/* Task card with left padding for the drag handle */}
      <div className="pl-8">
        <TaskCard
          task={task}
          onDelete={onDelete}
          onSelect={onSelect}
          isSelected={isSelected}
        />
      </div>
    </div>
  );
}
