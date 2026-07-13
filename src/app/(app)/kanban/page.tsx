"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type CollisionDetection,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ClipboardList, Plus, Check, X, Eye, EyeOff, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTasks, createTask, updateTask } from "@/lib/actions/tasks";
import {
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  deleteKanbanColumn,
  reorderKanbanColumns,
  type KanbanColumn as KanbanCol,
} from "@/lib/actions/kanban-columns";
import { Task, TaskStatus } from "@/types/task";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";

type TasksByColumn = Record<string, Task[]>;

/**
 * Custom collision detection:
 * - Uses closestCorners as base
 * - If the `over` droppable has data.type === "task", it's an intra-column card drop
 * - If the `over` droppable has data.type === "column", it's a cross-column drop
 */
const collisionDetection: CollisionDetection = (args) => {
  const corners = closestCorners(args);
  if (!corners.length) return corners;
  const first = corners[0];
  // If the closest droppable is a task card, prefer it over the column container
  // Access: collision.data.droppableContainer.data.current (dnd-kit v6 collision shape)
  if (first.data?.droppableContainer?.data?.current?.type === "task") return [first];
  return corners;
};

function groupByColumn(tasks: Task[]): TasksByColumn {
  const g: TasksByColumn = {};
  const seen = new Set<string>();
  for (const t of tasks) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    const c = t.kanban_column_id ?? "__none__";
    if (!g[c]) g[c] = [];
    g[c].push(t);
  }
  return g;
}

export default function KanbanPage() {
  const [columns, setColumns] = useState<KanbanCol[]>([]);
  const [tasksByColumn, setTasksByColumn] = useState<TasksByColumn>({});
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showBacklog, setShowBacklog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // TouchSensor disabled — mobile D&D needs rework, see Z6
  );

  // Refs to avoid stale closure in handleDragEnd during rapid consecutive drags
  const allTasksRef = useRef(allTasks);
  allTasksRef.current = allTasks;
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const tasksByColumnRef = useRef(tasksByColumn);
  tasksByColumnRef.current = tasksByColumn;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const [c, t] = await Promise.all([getKanbanColumns(), getTasks()]);
    if (t.error) {
      setError(t.error);
      setIsLoading(false);
      return;
    }
    setColumns(c);
    setAllTasks((t.data ?? []) as Task[]);
    setTasksByColumn(groupByColumn((t.data ?? []) as Task[]));
    setIsLoading(false);
  }, []);

  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const result = await createKanbanColumn(title);
    if (result.data) {
      setColumns((p) => [...p, result.data!]);
      setNewTitle("");
      setAdding(false);
    }
  };

  const handleRename = async (colId: string, title: string) => {
    await updateKanbanColumn(colId, title);
    setColumns((p) => p.map((c) => (c.id === colId ? { ...c, title } : c)));
  };

  const handleDelete = async (colId: string) => {
    if (columns.length <= 1) return;
    await deleteKanbanColumn(colId);
    fetchData();
  };

  const handleMove = async (colId: string, direction: "left" | "right") => {
    const idx = columns.findIndex((c) => c.id === colId);
    if (idx < 0) return;
    const target = direction === "left" ? idx - 1 : idx + 1;
    if (target < 0 || target >= columns.length) return;
    const reordered = [...columns];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    const ids = reordered.map((c) => c.id);
    setColumns(reordered);
    await reorderKanbanColumns(ids);
  };

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveTask(allTasksRef.current.find((t) => t.id === e.active.id) ?? null);
  }, []);

  const handleCreateTask = useCallback(async (columnId: string, title: string) => {
    const t = title.trim();
    if (!t) return;
    const fd = new FormData();
    fd.set("title", t);
    if (columnId === "__backlog__") {
      fd.set("status", "backlog");
    } else {
      fd.set("kanban_column_id", columnId);
    }
    const r = await createTask(fd);
    if (r.data) {
      const newTask = r.data as Task;
      setAllTasks((prev) => [newTask, ...prev]);
      setTasksByColumn((prev) => {
        const n = { ...prev };
        const key = columnId;
        n[key] = [newTask, ...(prev[key] ?? [])];
        return n;
      });
    }
  }, []);
  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveTask(null);
    if (!over) return;
    const taskId = active.id as string;
    const task = allTasksRef.current.find((t) => t.id === taskId);
    if (!task) return;
    const overId = over.id as string;
    const overData = over.data.current as { type?: string; task?: Task } | undefined;

    // Determine which column the active task is currently in
    const curColId = task.kanban_column_id ?? null;
    const curKey = task.status === "backlog" ? "__backlog__" : (curColId ?? "__none__");

    // --- INTRA-COLUMN REORDER ---
    // If the drop target is a task card, we're reordering within a column
    if (overData?.type === "task") {
      const overTask = overData.task;
      if (!overTask) return;

      // Determine the shared column key
      const overColId = overTask.kanban_column_id ?? null;
      const overKey = overTask.status === "backlog" ? "__backlog__" : (overColId ?? "__none__");

      // Only reorder if both tasks are in the same column
      if (curKey !== overKey) {
        // Cross-column drop onto a task — treat as cross-column move
        // (fall through to cross-column logic below)
      } else {
        // Same column — reorder within column
        const colTasks = [...(tasksByColumnRef.current[curKey] ?? [])];
        const oldIdx = colTasks.findIndex((t) => t.id === taskId);
        const newIdx = colTasks.findIndex((t) => t.id === overTask.id);
        if (oldIdx === -1 || newIdx === -1) return;
        if (oldIdx === newIdx) return;

        const reordered = arrayMove(colTasks, oldIdx, newIdx);
        const updatedTasks = reordered.map((t, i) => ({ ...t, position: i * 1000 }));

        // Optimistic update
        setTasksByColumn((p) => ({ ...p, [curKey]: updatedTasks }));
        setAllTasks((p) =>
          p.map((t) => {
            const found = updatedTasks.find((u) => u.id === t.id);
            return found ? { ...t, position: found.position } : t;
          }),
        );

        // NOTE: Only persists the moved task's position. Non-moved tasks in
        // the column get optimistic positions but aren't sent to server.
        // On refresh, their order reverts. TODO: batch-persist all column
        // positions or call reorderTasks with full column task ID array.
        // Persist — send position update for the moved task only
        const movedTask = updatedTasks.find((t) => t.id === taskId);
        if (movedTask) {
          const fd = new FormData();
          fd.set("position", String(movedTask.position));
          const r = await updateTask(taskId, fd);
          if (r.error) {
            console.error("Drag operation failed:", r.error);
            setError(r.error);
            fetchDataRef.current();
          }
        }
        return;
      }
    }

    // --- CROSS-COLUMN MOVE ---
    let newCol: string | null = null;
    let newStatus: string | null = null;
    let insertAtIndex = -1; // -1 means append at end

    // Dropped into backlog column
    if (overId === "__backlog__") {
      newCol = null;
      newStatus = "backlog";
    }
    // Dropped into a regular column container
    else {
      const col = columnsRef.current.find((c) => c.id === overId);
      if (col) {
        newCol = col.id;
        const idx = columnsRef.current.findIndex((c) => c.id === col.id);
        if (idx === 0) newStatus = "todo";
        else if (idx === columnsRef.current.length - 1) newStatus = "done";
        else newStatus = "in_progress";
      } else {
        // Dropped onto a task card in a different column
        const ot = allTasksRef.current.find((t) => t.id === overId);
        if (ot) {
          newCol = ot.kanban_column_id ?? null;
          // Determine status from column position
          if (newCol) {
            const colIdx = columnsRef.current.findIndex((c) => c.id === newCol);
            if (colIdx === 0) newStatus = "todo";
            else if (colIdx === columnsRef.current.length - 1) newStatus = "done";
            else newStatus = "in_progress";
          }
          // Find insert position within target column
          const targetTasks = tasksByColumnRef.current[newCol ?? "__backlog__"] ?? [];
          insertAtIndex = targetTasks.findIndex((t) => t.id === overId);
        }
      }
    }

    if (!newStatus && !newCol) return;
    if (newCol === curColId && newStatus === task.status) return;

    const targetKey = newCol ?? "__backlog__";

    // Optimistic update: remove from source, insert at position in target
    setTasksByColumn((p) => {
      const n = { ...p };
      // Remove from source
      n[curKey] = (p[curKey] ?? []).filter((t) => t.id !== taskId);
      // Build target list with the moved task inserted at the right position
      const targetTasks = [...(p[targetKey] ?? [])];
      const updatedTask = {
        ...task,
        kanban_column_id: newCol,
        status: (newStatus as Task["status"]) ?? task.status,
      } as Task & { kanban_column_id: string | null };
      if (insertAtIndex >= 0) {
        targetTasks.splice(insertAtIndex, 0, updatedTask);
      } else {
        targetTasks.push(updatedTask);
      }
      // Reassign positions
      const positioned = targetTasks.map((t, i) => ({ ...t, position: i * 1000 }));
      n[targetKey] = positioned;
      return n;
    });

    // Persist
    const fd = new FormData();
    fd.set("kanban_column_id", newCol ?? "");
    if (newStatus) fd.set("status", newStatus);
    // Compute position: midpoint between neighbors or sequential gap
    const targetTasks = tasksByColumnRef.current[targetKey] ?? [];
    let newPosition: number;
    if (insertAtIndex >= 0 && insertAtIndex < targetTasks.length) {
      const before = targetTasks[insertAtIndex - 1]?.position ?? 0;
      const after = targetTasks[insertAtIndex]?.position ?? before + 2000;
      newPosition = Math.floor((before + after) / 2);
    } else {
      newPosition = targetTasks.length * 1000;
    }
    fd.set("position", String(newPosition));

    const r = await updateTask(taskId, fd);
    if (r.error) {
      console.error("Drag operation failed:", r.error);
      setError(r.error);
      fetchDataRef.current();
      return;
    }
    setAllTasks((p) =>
      p.map((t) =>
        t.id === taskId
          ? {
              ...t,
              kanban_column_id: newCol,
              status: (newStatus as Task["status"]) ?? t.status,
              position: newPosition,
            }
          : t,
      ),
    );
  }, []);

  // Move a task between columns via mobile arrow buttons
  const handleMoveTaskColumn = useCallback(
    async (taskId: string, direction: "left" | "right") => {
      const task = allTasks.find((t) => t.id === taskId);
      if (!task) return;

      const regularCols = columns.map((c) => c.id);
      const isBacklog = task.status === TaskStatus.Backlog;
      let targetCol: string | null = null;
      let targetStatus: string | undefined;

      if (direction === "left") {
        if (isBacklog) return;
        const curIdx = regularCols.indexOf(task.kanban_column_id ?? "");
        if (curIdx > 0) {
          targetCol = regularCols[curIdx - 1];
        } else if (curIdx === 0 && showBacklog) {
          targetCol = null;
          targetStatus = TaskStatus.Backlog;
        } else return;
      } else {
        if (isBacklog) {
          targetCol = regularCols[0] ?? null;
          targetStatus = task.previous_status ?? TaskStatus.Todo;
        } else {
          const curIdx = regularCols.indexOf(task.kanban_column_id ?? "");
          if (curIdx >= 0 && curIdx < regularCols.length - 1) {
            targetCol = regularCols[curIdx + 1];
          } else if (curIdx === regularCols.length - 1 && showBacklog) {
            targetCol = null;
            targetStatus = TaskStatus.Backlog;
          } else return;
        }
      }

      // Optimistic local update
      setAllTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? ({
                ...t,
                kanban_column_id: (targetCol ?? undefined) as string | undefined,
                status: (targetStatus as Task["status"]) ?? t.status,
                previous_status:
                  targetStatus === TaskStatus.Backlog
                    ? t.status
                    : targetStatus
                      ? null
                      : t.previous_status,
              } as Task)
            : t,
        ),
      );

      const fd = new FormData();
      if (targetCol) fd.set("kanban_column_id", targetCol);
      if (targetStatus) {
        fd.set("status", targetStatus);
        if (targetStatus === TaskStatus.Backlog) {
          fd.set("previous_status", task.status);
        }
      }
      const r = await updateTask(taskId, fd);
      if (r.error) {
        fetchData(); // rollback
      }
    },
    [allTasks, columns, showBacklog, fetchData],
  );

  const displayTasks = useMemo(() => {
    if (showCompleted) return tasksByColumn;
    const f: TasksByColumn = {};
    for (const [cId, ts] of Object.entries(tasksByColumn)) {
      const v = ts.filter((t) => t.status !== "done" && t.status !== "missed");
      if (v.length > 0) f[cId] = v;
    }
    return f;
  }, [tasksByColumn, showCompleted]);

  const backlogTasks = useMemo(() => {
    const tasks = allTasks.filter((t) => t.status === TaskStatus.Backlog);
    if (!showCompleted) return tasks;
    return tasks;
  }, [allTasks, showCompleted]);

  const totalTasks = allTasks.length;

  if (isLoading)
    return (
      <div className="space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-4">
          <Skeleton className="h-32 w-[300px] rounded-xl" />
          <Skeleton className="h-32 w-[300px] rounded-xl" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-20">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={fetchData}>
          Retry
        </Button>
      </div>
    );

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
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
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBacklog((v) => !v)}
            className="gap-1.5"
          >
            <Inbox className="size-3.5" />
            {showBacklog ? "Hide backlog" : "Backlog"}
            {backlogTasks.length > 0 && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                {backlogTasks.length}
              </span>
            )}
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
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Backlog column — virtual inbox, shown when toggle is on */}
          {showBacklog && (
            <KanbanColumn
              id="__backlog__"
              title="Backlog"
              tasks={backlogTasks}
              isFirst={true}
              isLast={false}
              onRename={() => {}}
              onDelete={() => {}}
              onMoveLeft={() => {}}
              onMoveRight={() => {}}
              isBacklog
              inlineCreate
              onCreateTask={(title) => handleCreateTask("__backlog__", title)}
              columnIds={columns.map((c) => c.id)}
              showBacklog={showBacklog}
              onMoveTaskLeft={(taskId) => handleMoveTaskColumn(taskId, "left")}
              onMoveTaskRight={(taskId) => handleMoveTaskColumn(taskId, "right")}
            />
          )}
          {columns.map((col, i) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              tasks={displayTasks[col.id] ?? []}
              isFirst={i === 0}
              isLast={i === columns.length - 1}
              onRename={handleRename}
              onDelete={handleDelete}
              onMoveLeft={(id) => handleMove(id, "left")}
              onMoveRight={(id) => handleMove(id, "right")}
              inlineCreate={i === 0 && !showBacklog}
              onCreateTask={
                i === 0 && !showBacklog ? (title) => handleCreateTask(col.id, title) : undefined
              }
              columnIds={columns.map((c) => c.id)}
              showBacklog={showBacklog}
              onMoveTaskLeft={(taskId) => handleMoveTaskColumn(taskId, "left")}
              onMoveTaskRight={(taskId) => handleMoveTaskColumn(taskId, "right")}
            />
          ))}
          <div className="min-w-[180px] flex items-start pt-1">
            {adding ? (
              <div className="flex items-center gap-1 w-full">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                    if (e.key === "Escape") setAdding(false);
                  }}
                  placeholder="Column name..."
                  className="h-8 text-sm"
                  autoFocus
                />
                <Button size="icon-xs" variant="ghost" onClick={handleAdd}>
                  <Check className="size-3" />
                </Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setAdding(false)}>
                  <X className="size-3" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-10 border-2 border-dashed border-border text-muted-foreground hover:text-foreground whitespace-nowrap"
                onClick={() => setAdding(true)}
              >
                <Plus className="size-4 mr-1" /> Add Column
              </Button>
            )}
          </div>
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-[284px] rotate-2 opacity-90">
              <KanbanCard task={activeTask} canMoveLeft={false} canMoveRight={false} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {totalTasks === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted">
            <ClipboardList className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">No tasks yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first task and start organizing.
          </p>
        </div>
      )}
    </div>
  );
}
