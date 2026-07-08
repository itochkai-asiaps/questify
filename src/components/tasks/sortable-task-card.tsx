"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

import TaskCard from "@/components/tasks/task-card";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

interface SortableTaskCardProps {
  task: Task;
  onDelete?: () => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function SortableTaskCard({
  task,
  onDelete,
  onSelect,
  isSelected,
  onMoveUp,
  onMoveDown,
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
      {/* Drag handle — the ONLY drag activator (desktop) */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
        className={cn(
          "absolute left-0 top-0 z-10 flex h-full cursor-grab items-center justify-center",
          "touch-none active:cursor-grabbing",
          // Narrower on mobile (30px), keep desktop as-is
          "w-7 px-0.5 sm:w-auto sm:px-1.5",
        )}
        style={{ paddingTop: 0, paddingBottom: 0 }}
      >
        <GripVertical className="size-4 text-muted-foreground opacity-50 transition-opacity hover:opacity-100" />
      </button>

      {/* Mobile reorder arrows — hidden on desktop */}
      {onMoveUp && onMoveDown && (
        <div className="absolute left-0 top-0 z-20 flex h-full flex-col items-center justify-center gap-0.5 sm:hidden">
          <button
            type="button"
            aria-label="Move task up"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Move task down"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground/60 hover:bg-muted hover:text-foreground"
          >
            <ChevronDown className="size-3.5" />
          </button>
        </div>
      )}

      {/* Task card with left padding for the drag handle / arrows */}
      <div className="pl-8 sm:pl-8">
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
