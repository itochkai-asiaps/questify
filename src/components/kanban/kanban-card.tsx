"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";
import { PRIORITY_CONFIG } from "@/config/task-display";

interface KanbanCardProps {
  task: Task;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export function KanbanCard({
  task,
  onMoveLeft,
  onMoveRight,
  canMoveLeft,
  canMoveRight,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", task },
    disabled: typeof window !== "undefined" && window.innerWidth < 640, // disable D&D on mobile
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[TaskPriority.P3];
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  const showArrows = onMoveLeft && onMoveRight;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group/card relative", isDragging && "opacity-50")}
    >
      {/* Desktop drag handle overlay — hidden on mobile */}
      <div
        {...attributes}
        {...listeners}
        className="hidden sm:block absolute inset-0 z-10 cursor-grab active:cursor-grabbing touch-none"
      />

      {/* Mobile column arrows — visible on mobile only */}
      {showArrows && (
        <div className="absolute right-1 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 sm:hidden">
          {canMoveLeft && (
            <button
              type="button"
              aria-label="Move to previous column"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveLeft?.();
              }}
              className="flex size-6 items-center justify-center rounded-sm bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-transform"
            >
              <ArrowLeft className="size-3.5" />
            </button>
          )}
          {canMoveRight && (
            <button
              type="button"
              aria-label="Move to next column"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMoveRight?.();
              }}
              className="flex size-6 items-center justify-center rounded-sm bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-transform"
            >
              <ArrowRight className="size-3.5" />
            </button>
          )}
        </div>
      )}

      <Link href={`/tasks/${task.id}`} className={cn("block", isDragging && "opacity-50")}>
        <Card
          size="sm"
          className={cn(
            "cursor-grab transition-shadow active:cursor-grabbing",
            "hover:shadow-md hover:ring-foreground/20",
            isDragging && "shadow-lg ring-2 ring-primary/30",
          )}
        >
          <CardContent className="flex flex-col gap-2">
            {/* Drag handle + title */}
            <div className="flex items-start gap-2">
              <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-snug">{task.title}</p>
              </div>
            </div>

            {/* Meta row: priority + tags + due date */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={priority.variant} className="text-[10px]">
                {priority.label}
              </Badge>

              {task.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}

              {task.tags.length > 3 && (
                <span className="text-[10px] text-muted-foreground">+{task.tags.length - 3}</span>
              )}

              {dueDate && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="size-3" />
                  {dueDate}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
