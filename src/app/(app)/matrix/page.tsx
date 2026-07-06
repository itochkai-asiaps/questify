"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { motion } from "framer-motion";
import { LayoutGrid, Sparkles, Eye, EyeOff } from "lucide-react";

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

const AXIS_LABELS = {
  yTop: "Important",
  yBottom: "Not Important",
  xLeft: "Urgent",
  xRight: "Not Urgent",
};

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
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* Axis labels + Matrix grid */}
        <div className="hidden md:grid md:grid-cols-[auto_1fr_1fr] md:grid-rows-[auto_1fr_1fr] gap-x-1">
          {/* Corner */}
          <div />
          {/* X axis: Urgent / Not Urgent */}
          <div className="flex justify-center"><span className="text-xs font-medium text-muted-foreground">{AXIS_LABELS.xLeft}</span></div>
          <div className="flex justify-center"><span className="text-xs font-medium text-muted-foreground">{AXIS_LABELS.xRight}</span></div>
          {/* Y axis: Important / Not Important */}
          <div className="grid grid-rows-2 py-1 pr-1">
            <span className="text-xs font-medium text-muted-foreground flex items-start pt-1">{AXIS_LABELS.yTop}</span>
            <span className="text-xs font-medium text-muted-foreground flex items-start pt-1">{AXIS_LABELS.yBottom}</span>
          </div>
          {/* Quadrants — fill remaining space */}
          <div className="grid gap-4 md:grid-cols-2 md:grid-rows-2 md:col-span-2">
            {ALL_PRIORITIES.map((priority) => (
              <motion.div
                key={priority}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="min-h-0"
              >
                <MatrixQuadrant
                  priority={priority}
                  tasks={tasksByPriority[priority]}
                />
              </motion.div>
            ))}
          </div>
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
