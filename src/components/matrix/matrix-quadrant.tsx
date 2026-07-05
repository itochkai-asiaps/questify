"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";

import { MatrixCard } from "./matrix-card";

interface QuadrantConfig {
  title: string;
  description: string;
  bg: string;
  border: string;
  dotColor: string;
}

const QUADRANT_CONFIG: Record<TaskPriority, QuadrantConfig> = {
  [TaskPriority.P1]: {
    title: "Do First",
    description: "Urgent & Important",
    bg: "bg-red-500/5",
    border: "border-red-500/30",
    dotColor: "bg-red-500",
  },
  [TaskPriority.P2]: {
    title: "Schedule",
    description: "Important, Not Urgent",
    bg: "bg-orange-500/5",
    border: "border-orange-500/30",
    dotColor: "bg-orange-500",
  },
  [TaskPriority.P3]: {
    title: "Delegate",
    description: "Urgent, Not Important",
    bg: "bg-yellow-500/5",
    border: "border-yellow-500/30",
    dotColor: "bg-yellow-500",
  },
  [TaskPriority.P4]: {
    title: "Eliminate",
    description: "Not Urgent, Not Important",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/30",
    dotColor: "bg-emerald-500",
  },
};

interface MatrixQuadrantProps {
  priority: TaskPriority;
  tasks: Task[];
}

export function MatrixQuadrant({ priority, tasks }: MatrixQuadrantProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: priority,
    data: { type: "quadrant", priority },
  });

  const config = QUADRANT_CONFIG[priority];
  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border transition-colors h-full",
        config.bg,
        config.border,
        isOver && "ring-2 ring-primary/30 ring-offset-1",
      )}
    >
      {/* Quadrant header */}
      <div className="flex items-start gap-3 border-b border-border/40 px-4 py-3">
        <div className={cn("mt-1 size-2.5 shrink-0 rounded-full", config.dotColor)} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{config.title}</h3>
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted/80 text-[11px] font-medium text-muted-foreground">
              {tasks.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-col gap-2 overflow-y-auto p-3",
          isOver && "bg-primary/5",
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <MatrixCard key={task.id} task={task} />)
          ) : (
            <div
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 px-3 py-6 text-center transition-colors",
                isOver && "border-primary/40 bg-primary/5",
              )}
            >
              <p className="text-xs text-muted-foreground">
                {isOver ? "Release to drop" : "Drop tasks here"}
              </p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
