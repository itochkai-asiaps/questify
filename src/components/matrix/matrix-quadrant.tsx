"use client";

import { memo } from "react";
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
  onReprioritize: (taskId: string, newPriority: TaskPriority) => void;
}

export const MatrixQuadrant = memo(function MatrixQuadrant({
  priority,
  tasks,
  onReprioritize,
}: MatrixQuadrantProps) {
  const config = QUADRANT_CONFIG[priority];

  return (
    <div className={cn("flex h-full flex-col rounded-xl border", config.bg, config.border)}>
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
      <div className="flex flex-col gap-2 p-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <MatrixCard key={task.id} task={task} onReprioritize={onReprioritize} />
          ))
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/40 px-3 py-6 text-center">
            <p className="text-xs text-muted-foreground">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
});
