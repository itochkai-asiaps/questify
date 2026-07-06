"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const ALL_PRIORITIES: TaskPriority[] = [
  TaskPriority.P1,
  TaskPriority.P2,
  TaskPriority.P3,
  TaskPriority.P4,
];

const STATUS_DOT: Record<string, string> = {
  todo: "bg-slate-400",
  in_progress: "bg-amber-500",
  done: "bg-emerald-500",
};

interface MatrixCardProps {
  task: Task;
  onReprioritize: (taskId: string, newPriority: TaskPriority) => void;
}

export function MatrixCard({ task, onReprioritize }: MatrixCardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG[TaskPriority.P3];
  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;
  const statusDot = STATUS_DOT[task.status] ?? STATUS_DOT.todo;

  const otherPriorities = ALL_PRIORITIES.filter((p) => p !== task.priority);

  return (
    <Card
      size="sm"
      onClick={() => router.push(`/tasks/${task.id}`)}
      className={cn(
        "cursor-pointer transition-shadow",
        "hover:shadow-md hover:ring-foreground/20",
      )}
    >
      <CardContent className="flex flex-col gap-2">
        {/* Title row */}
        <p className="truncate text-sm font-medium leading-snug">
          {task.title}
        </p>

        {/* Meta row: priority badge (dropdown trigger) + status + due date */}
        <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger>
              <Badge
                variant={priority.variant}
                className="text-[10px] cursor-pointer hover:opacity-80"
              >
                {priority.label}
              </Badge>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-28">
              {otherPriorities.map((p) => {
                const cfg = PRIORITY_CONFIG[p];
                return (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => {
                      onReprioritize(task.id, p);
                      setOpen(false);
                    }}
                  >
                    <Badge variant={cfg.variant} className="text-[10px]">
                      {cfg.label}
                    </Badge>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

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
  );
}
