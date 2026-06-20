"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { Calendar, GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";

const PRIORITY_CONFIG: Record<
  TaskPriority,
  { label: string; variant: "destructive" | "default" | "secondary" | "outline" }
> = {
  [TaskPriority.P1]: { label: "P1", variant: "destructive" },
  [TaskPriority.P2]: { label: "P2", variant: "default" },
  [TaskPriority.P3]: { label: "P3", variant: "secondary" },
  [TaskPriority.P4]: { label: "P4", variant: "outline" },
};

const STATUS_DOT: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
};

interface MatrixCardProps {
  task: Task;
}

export function MatrixCard({ task }: MatrixCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
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

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[TaskPriority.P3];
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const statusDot = STATUS_DOT[task.status] ?? STATUS_DOT.todo;

  return (
    <Link
      href={`/tasks/${task.id}`}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group/card block touch-none",
        isDragging && "opacity-50",
      )}
    >
      <Card
        size="sm"
        className={cn(
          "cursor-grab transition-shadow active:cursor-grabbing",
          "hover:shadow-md hover:ring-foreground/20",
          isDragging && "shadow-lg ring-2 ring-primary/30",
        )}
      >
        <CardContent className="flex flex-col gap-2">
          {/* Title row */}
          <div className="flex items-start gap-2">
            <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100" />
            <p className="truncate text-sm font-medium leading-snug">
              {task.title}
            </p>
          </div>

          {/* Meta row: priority + status + due date */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={priority.variant} className="text-[10px]">
              {priority.label}
            </Badge>

            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <span className={cn("size-1.5 rounded-full", statusDot)} />
              {task.status === "todo"
                ? "To Do"
                : task.status === "in_progress"
                  ? "In Progress"
                  : "Done"}
            </span>

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
  );
}
