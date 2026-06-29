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
import { ClipboardList, Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { getTasks, updateTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import { Task, TaskStatus } from "@/types/task";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";

type TasksByStatus = Record<TaskStatus, Task[]>;

const ALL_STATUSES: TaskStatus[] = [
  TaskStatus.Todo,
  TaskStatus.InProgress,
  TaskStatus.Done,
];

const EMPTY_BOARD: TasksByStatus = {
  [TaskStatus.Todo]: [],
  [TaskStatus.InProgress]: [],
  [TaskStatus.Done]: [],
};

function groupTasksByStatus(tasks: Task[]): TasksByStatus {
  const grouped = { ...EMPTY_BOARD };
  for (const task of tasks) {
    const status = task.status as TaskStatus;
    if (status in grouped) {
      grouped[status].push(task);
    }
  }
  return grouped;
}

export default function KanbanPage() {
  const [tasksByStatus, setTasksByStatus] = useState<TasksByStatus>(EMPTY_BOARD);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    setAllTasks(tasks);
    setTasksByStatus(groupTasksByStatus(tasks));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

      // Determine target status: if dropped on a column, use its ID; if dropped on a card, find its column
      let newStatus: TaskStatus | null = null;

      if (ALL_STATUSES.includes(over.id as TaskStatus)) {
        // Dropped directly on a column
        newStatus = over.id as TaskStatus;
      } else {
        // Dropped on a card — find which column that card belongs to
        const overTask = allTasks.find((t) => t.id === over.id);
        if (overTask) {
          newStatus = overTask.status as TaskStatus;
        }
      }

      if (!newStatus) return;

      // Preserve original status for rollback
      const originalStatus = task.status;

      // Optimistic update — scan ALL columns to find and remove the task
      // (task.status from closure can be stale after rapid drags)
      setTasksByStatus((prev) => {
        // Already at target — nothing to do
        if (prev[newStatus!].some((t) => t.id === taskId)) return prev;

        const next = { ...prev };
        // Remove from whatever column it's currently in
        for (const status of Object.keys(prev) as TaskStatus[]) {
          next[status] = prev[status].filter((t) => t.id !== taskId);
        }
        next[newStatus!] = [
          ...prev[newStatus!],
          { ...task, status: newStatus! },
        ];
        return next;
      });

      // Persist to server
      const formData = new FormData();
      formData.set("status", newStatus);
      const result = await updateTask(taskId, formData);

      if (result.error) {
        // Revert: move task back to original status
        setTasksByStatus((prev) => {
          const next = { ...prev };
          for (const status of Object.keys(prev) as TaskStatus[]) {
            next[status] = prev[status].filter((t) => t.id !== taskId);
          }
          next[originalStatus] = [...prev[originalStatus], { ...task, status: originalStatus }];
          return next;
        });
        setError(result.error);
        return;
      }

      // Update allTasks
      setAllTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus! } : t)),
      );
    },
    [allTasks, tasksByStatus],
  );

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of allTasks) {
      map.set(task.id, task);
    }
    return map;
  }, [allTasks]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex w-[300px] shrink-0 flex-col gap-3 rounded-xl border border-border p-4"
            >
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
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
            <ClipboardList className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
            <p className="text-sm text-muted-foreground">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"} across {ALL_STATUSES.length} columns
            </p>
          </div>
        </div>

        {error && (
          <p className="mt-2 text-sm text-destructive sm:mt-0">{error}</p>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3 md:overflow-visible">
          {ALL_STATUSES.map((status) => (
            <motion.div
              key={status}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <KanbanColumn
                status={status}
                tasks={tasksByStatus[status]}
              />
            </motion.div>
          ))}
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeTask ? (
            <div className="w-[284px] rotate-2 opacity-90">
              <KanbanCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Empty state */}
      {totalTasks === 0 && !isLoading && (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No tasks yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first task and start organizing your workflow. Drag tasks between columns to update their status.
          </p>
        </div>
      )}
    </div>
  );
}
