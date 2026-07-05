"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ClipboardList, Loader2, Plus, Pencil, Trash2, Check, X, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTasks, updateTask } from "@/lib/actions/tasks";
import {
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
  type KanbanColumn as KanbanCol,
} from "@/lib/actions/kanban-columns";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";

type TasksByColumn = Record<string, Task[]>;

function groupTasksByColumn(tasks: Task[]): TasksByColumn {
  const grouped: TasksByColumn = {};
  const seen = new Set<string>();
  for (const task of tasks) {
    if (seen.has(task.id)) continue;
    seen.add(task.id);
    const colId = (task as Record<string, unknown>).kanban_column_id as string ?? "__none__";
    if (!grouped[colId]) grouped[colId] = [];
    grouped[colId].push(task);
  }
  return grouped;
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanCol[]>([]);
  const [tasksByColumn, setTasksByColumn] = useState<TasksByColumn>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Column editing
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editColTitle, setEditColTitle] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [colsResult, tasksResult] = await Promise.all([getKanbanColumns(), getTasks()]);
    if (tasksResult.error) {
      setError(tasksResult.error);
      setIsLoading(false);
      return;
    }
    setColumns(colsResult);
    setAllTasks((tasksResult.data ?? []) as Task[]);
    setTasksByColumn(groupTasksByColumn((tasksResult.data ?? []) as Task[]));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─── Column actions ───
  const handleAddColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    const col = await createKanbanColumn(title);
    if (col) {
      setColumns((prev) => [...prev, col]);
      setNewColumnTitle("");
      setAddingColumn(false);
    }
  };

  const handleRenameColumn = async (colId: string) => {
    const title = editColTitle.trim();
    if (!title) return;
    await updateKanbanColumn(colId, title);
    setColumns((prev) => prev.map((c) => (c.id === colId ? { ...c, title } : c)));
    setEditingColId(null);
  };

  const handleDeleteColumn = async (colId: string) => {
    if (columns.length <= 1) return;
    await deleteKanbanColumn(colId);
    setColumns((prev) => prev.filter((c) => c.id !== colId));
    fetchData();
  };

  // ─── Drag handlers ───
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

      // Determine target column
      let newColId: string | null = null;
      const overCol = columns.find((c) => c.id === over.id);
      if (overCol) {
        newColId = overCol.id;
      } else {
        const overTask = allTasks.find((t) => t.id === over.id);
        if (overTask) {
          newColId = (overTask as Record<string, unknown>).kanban_column_id as string ?? null;
        }
      }

      const currentColId = (task as Record<string, unknown>).kanban_column_id as string ?? "__none__";
      if (!newColId || newColId === currentColId) return;

      // Optimistic update
      setTasksByColumn((prev) => {
        const next = { ...prev };
        next[currentColId] = (prev[currentColId] ?? []).filter((t) => t.id !== taskId);
        next[newColId!] = [...(prev[newColId!] ?? []), { ...task, kanban_column_id: newColId } as Task & { kanban_column_id: string }];
        return next;
      });

      // Persist
      const formData = new FormData();
      formData.set("kanban_column_id", newColId);
      const result = await updateTask(taskId, formData);

      if (result.error) {
        setError(result.error);
        fetchData();
        return;
      }

      setAllTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, kanban_column_id: newColId } : t)),
      );
    },
    [allTasks, columns],
  );

  // ─── Render ───
  const displayTasks = useMemo(() => {
    if (showCompleted) return tasksByColumn;
    const filtered: TasksByColumn = {};
    for (const [colId, tasks] of Object.entries(tasksByColumn)) {
      const visible = tasks.filter((t) => t.status !== "done");
      if (visible.length > 0) filtered[colId] = visible;
    }
    return filtered;
  }, [tasksByColumn, showCompleted]);
  const totalTasks = allTasks.length;

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3 min-w-[280px]">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
            <ClipboardList className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1>
            <p className="text-sm text-muted-foreground">
              {totalTasks} {totalTasks === 1 ? "task" : "tasks"} across {columns.length} columns
            </p>
          </div>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div key={col.id} className="min-w-[280px] flex-1">
              {/* Column header */}
              <div className="mb-3 flex items-center gap-1">
                {editingColId === col.id ? (
                  <div className="flex items-center gap-1 flex-1">
                    <Input
                      ref={editInputRef}
                      value={editColTitle}
                      onChange={(e) => setEditColTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameColumn(col.id);
                        if (e.key === "Escape") setEditingColId(null);
                      }}
                      className="h-7 text-sm"
                      autoFocus
                    />
                    <Button size="icon-xs" variant="ghost" onClick={() => handleRenameColumn(col.id)}><Check className="size-3" /></Button>
                    <Button size="icon-xs" variant="ghost" onClick={() => setEditingColId(null)}><X className="size-3" /></Button>
                  </div>
                ) : (
                  <>
                    <h2
                      className="flex-1 text-sm font-semibold cursor-pointer hover:text-primary px-1 py-0.5 rounded"
                      onClick={() => { setEditingColId(col.id); setEditColTitle(col.title); }}
                    >
                      {col.title}
                    </h2>
                    <span className="text-xs text-muted-foreground tabular-nums mr-2">
                      {(displayTasks[col.id] ?? []).length}
                    </span>
                    {columns.length > 1 && (
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        className="opacity-0 hover:opacity-100 group-hover:opacity-100"
                        onClick={() => handleDeleteColumn(col.id)}
                      >
                        <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </>
                )}
              </div>

              {/* Column content */}
              <KanbanColumn
                id={col.id}
                title={col.title}
                tasks={displayTasks[col.id] ?? []}
              />
            </div>
          ))}

          {/* Add column */}
          <div className="min-w-[200px]">
            {addingColumn ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Input
                    value={newColumnTitle}
                    onChange={(e) => setNewColumnTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddColumn();
                      if (e.key === "Escape") setAddingColumn(false);
                    }}
                    placeholder="Column name..."
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <Button size="icon-xs" variant="ghost" onClick={handleAddColumn}><Check className="size-3" /></Button>
                  <Button size="icon-xs" variant="ghost" onClick={() => setAddingColumn(false)}><X className="size-3" /></Button>
          </div>
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
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-10 border-2 border-dashed border-border text-muted-foreground hover:text-foreground"
                onClick={() => setAddingColumn(true)}
              >
                <Plus className="size-4 mr-1" /> Add Column
              </Button>
            )}
          </div>
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
      {totalTasks === 0 && (
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
