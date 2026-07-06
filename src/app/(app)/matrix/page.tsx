"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { LayoutGrid, Sparkles, Eye, EyeOff, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTasks, updateTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { Task, TaskPriority } from "@/types/task";

import { MatrixCard } from "@/components/matrix/matrix-card";
import { MatrixQuadrant } from "@/components/matrix/matrix-quadrant";

type TasksByPriority = Record<TaskPriority, Task[]>;

const ALL_PRIORITIES: TaskPriority[] = [
  TaskPriority.P1,
  TaskPriority.P2,
  TaskPriority.P3,
  TaskPriority.P4,
];

const EMPTY_MATRIX: TasksByPriority = {
  [TaskPriority.P1]: [],
  [TaskPriority.P2]: [],
  [TaskPriority.P3]: [],
  [TaskPriority.P4]: [],
};

function groupTasksByPriority(tasks: Task[]): TasksByPriority {
  const grouped = { ...EMPTY_MATRIX };
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    const priority = task.priority as TaskPriority;
    if (priority in grouped) {
      grouped[priority].push(task);
    }
  }
  return grouped;
}


export default function MatrixPage() {
  const [tasksByPriority, setTasksByPriority] = useState<TasksByPriority>(EMPTY_MATRIX);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showDistributeInfo, setShowDistributeInfo] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getTasks();
    if (result.error) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    const tasks = (result.data ?? []) as Task[];
    const seen = new Set<string>();
    const unique = tasks.filter((t) => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    setAllTasks(unique);
    setTasksByPriority(groupTasksByPriority(unique));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleAutoDistribute = useCallback(() => {
    setShowDistributeInfo((v) => !v);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = allTasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [allTasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      // Determine target priority
      let newPriority: TaskPriority | null = null;

      if (ALL_PRIORITIES.includes(over.id as TaskPriority)) {
        // Dropped directly on a quadrant
        newPriority = over.id as TaskPriority;
      } else {
        // Dropped on a card — find which quadrant that card belongs to
        const overTask = allTasks.find((t) => t.id === over.id);
        if (overTask) {
          newPriority = overTask.priority as TaskPriority;
        }
      }

      if (!newPriority) return;

      // Preserve original priority for rollback
      const originalPriority = task.priority;

      // Optimistic update — scan ALL quadrants to find and remove the task
      // (task.priority from closure can be stale after rapid drags)
      setTasksByPriority((prev) => {
        // Already at target — nothing to do
        if (prev[newPriority!].some((t) => t.id === taskId)) return prev;

        const next = { ...prev };
        // Remove from whatever quadrant it's currently in
        for (const priority of Object.keys(prev) as TaskPriority[]) {
          next[priority] = prev[priority].filter((t) => t.id !== taskId);
        }
        next[newPriority!] = [
          ...prev[newPriority!],
          { ...task, priority: newPriority! },
        ];
        return next;
      });

      // Persist
      const formData = new FormData();
      formData.set("priority", newPriority);
      const result = await updateTask(taskId, formData);

      if (result.error) {
        // Revert: move task back to original quadrant
        setTasksByPriority((prev) => {
          const next = { ...prev };
          for (const priority of Object.keys(prev) as TaskPriority[]) {
            next[priority] = prev[priority].filter((t) => t.id !== taskId);
          }
          next[originalPriority] = [...prev[originalPriority], { ...task, priority: originalPriority }];
          return next;
        });
        setError(result.error);
        return;
      }

      setAllTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, priority: newPriority! } : t,
        ),
      );
    },
    [allTasks, tasksByPriority],
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-8 w-56" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
            >
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const totalTasks = allTasks.length;
  const unprioritized = allTasks.filter(
    (t) => !ALL_PRIORITIES.includes(t.priority as TaskPriority) && (showCompleted || t.status !== "done"),
  );

  const displayByPriority: TasksByPriority = useMemo(() => {
    if (showCompleted) return tasksByPriority;
    const filtered = { ...EMPTY_MATRIX };
    for (const priority of ALL_PRIORITIES) {
      filtered[priority] = displayByPriority[priority].filter((t) => t.status !== "done");
    }
    return filtered;
  }, [tasksByPriority, showCompleted]);

  return (
    <div className="container mx-auto p-6">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <LayoutGrid className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Eisenhower Matrix
            </h1>
            <p className="text-sm text-muted-foreground">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"} across 4 quadrants
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAutoDistribute}
            className="gap-1.5"
          >
            <Sparkles className="size-3.5" />
            Auto-distribute
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCompleted((v) => !v)}
            className="gap-1.5"
          >
            {showCompleted ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showCompleted ? "Hide completed" : "Show completed"}
          </Button>
        </div>
        {showDistributeInfo && (
          <p className="text-sm text-muted-foreground rounded-lg border border-border bg-muted/30 p-3">
            Auto-distribute will automatically prioritize your tasks across the Eisenhower Matrix
            based on urgency and importance. Coming in a future update.
          </p>
        )}
      </div>

      {/* Matrix grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Axis labels + Matrix grid (desktop) — single grid, columns aligned */}
        <div className="hidden md:grid gap-2" style={{ gridTemplateColumns: "auto 1fr 1fr", gridTemplateRows: "auto auto auto" }}>
          {/* Row 1: X-axis labels */}
          <div />
          <div className="text-center py-1">
            <span className="text-xs font-medium text-muted-foreground">Not Urgent</span>
          </div>
          <div className="text-center py-1">
            <span className="text-xs font-medium text-muted-foreground">Urgent</span>
          </div>

          {/* Row 2: Important — P2 (Not Urgent & Important) | P1 (Urgent & Important) */}
          <div className="flex items-center pr-2">
            <span className="text-xs font-medium text-muted-foreground">Important</span>
          </div>
          {([TaskPriority.P2, TaskPriority.P1] as TaskPriority[]).map((priority) => (
            <div key={priority}>
              <MatrixQuadrant priority={priority} tasks={displayByPriority[priority]} />
            </div>
          ))}

          {/* Row 3: Not Important — P4 (Not Urgent & Not Important) | P3 (Urgent & Not Important) */}
          <div className="flex items-center pr-2">
            <span className="text-xs font-medium text-muted-foreground">Not Important</span>
          </div>
          {([TaskPriority.P4, TaskPriority.P3] as TaskPriority[]).map((priority) => (
            <div key={priority}>
              <MatrixQuadrant priority={priority} tasks={displayByPriority[priority]} />
            </div>
          ))}
        </div>

        {/* Mobile — simple 2×2 grid without axis labels, mirrored X-axis */}
        <div className="grid gap-4 md:hidden grid-cols-2 grid-rows-2">
          {([TaskPriority.P2, TaskPriority.P1, TaskPriority.P4, TaskPriority.P3] as TaskPriority[]).map((priority) => (
            <div key={priority}>
              <MatrixQuadrant priority={priority} tasks={displayByPriority[priority]} />
            </div>
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="w-[284px] rotate-2 opacity-90">
              <MatrixCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Unprioritized — tasks without P1-P4 priority */}
      {unprioritized.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground">Unprioritized</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{unprioritized.length}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {unprioritized.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="block rounded-lg border border-border bg-card p-3 text-sm hover:shadow-sm transition-shadow"
              >
                <p className="font-medium truncate">{task.title}</p>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalTasks === 0 && !isLoading && (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <LayoutGrid className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No tasks yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create tasks with priorities (P1–P4) to see them in the Eisenhower Matrix. Drag tasks between quadrants to reprioritize.
          </p>
        </div>
      )}
    </div>
  );
}
