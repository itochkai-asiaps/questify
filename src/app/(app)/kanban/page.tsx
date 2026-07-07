"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, TouchSensor, pointerWithin, useSensor, useSensors,
} from "@dnd-kit/core";
import { ClipboardList, Plus, Check, X, Eye, EyeOff, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getTasks, createTask, updateTask } from "@/lib/actions/tasks";
import { getKanbanColumns, createKanbanColumn, updateKanbanColumn, deleteKanbanColumn, reorderKanbanColumns, type KanbanColumn as KanbanCol } from "@/lib/actions/kanban-columns";
import { Task, TaskStatus } from "@/types/task";

import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";

type TasksByColumn = Record<string, Task[]>;

function groupByColumn(tasks: Task[]): TasksByColumn {
  const g: TasksByColumn = {}; const seen = new Set<string>();
  for (const t of tasks) { if (seen.has(t.id)) continue; seen.add(t.id); const c = (t as Record<string,unknown>).kanban_column_id as string ?? "__none__"; if (!g[c]) g[c] = []; g[c].push(t); }
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
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true); setError(null);
    const [c, t] = await Promise.all([getKanbanColumns(), getTasks()]);
    if (t.error) { setError(t.error); setIsLoading(false); return; }
    setColumns(c); setAllTasks((t.data ?? []) as Task[]); setTasksByColumn(groupByColumn((t.data ?? []) as Task[]));
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    const title = newTitle.trim(); if (!title) return;
    const col = await createKanbanColumn(title);
    if (col) { setColumns((p) => [...p, col]); setNewTitle(""); setAdding(false); }
  };

  const handleRename = async (colId: string, title: string) => {
    await updateKanbanColumn(colId, title);
    setColumns((p) => p.map((c) => c.id === colId ? { ...c, title } : c));
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

  const handleDragStart = useCallback((e: DragStartEvent) => { setActiveTask(allTasks.find((t) => t.id === e.active.id) ?? null); }, [allTasks]);

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
    const { active, over } = e; setActiveTask(null); if (!over) return;
    const taskId = active.id as string;
    const task = allTasks.find((t) => t.id === taskId); if (!task) return;
    let newCol: string | null = null;
    let newStatus: string | null = null;
    const overId = over.id as string;

    // Dropped into backlog column
    if (overId === "__backlog__") {
      newCol = null; // remove from kanban columns
      newStatus = "backlog";
    }
    // Dropped into a regular column
    else {
      const col = columns.find((c) => c.id === overId);
      if (col) {
        newCol = col.id;
        const idx = columns.findIndex((c) => c.id === col.id);
        if (idx === 0) newStatus = "todo";
        else if (idx === columns.length - 1) newStatus = "done";
        else newStatus = "in_progress";
      }
      else {
        const ot = allTasks.find((t) => t.id === overId);
        if (ot) newCol = (ot as Record<string,unknown>).kanban_column_id as string ?? null;
      }
    }

    const cur = (task as Record<string,unknown>).kanban_column_id as string ?? (task.status === "backlog" ? "__backlog__" : "__none__");
    if (!newStatus && !newCol) return;
    if (newCol === cur && newStatus === task.status) return;

    const curKey = task.status === "backlog" ? "__backlog__" : cur;

    setTasksByColumn((p) => {
      const n = { ...p };
      n[curKey] = (p[curKey] ?? []).filter((t) => t.id !== taskId);
      const targetKey = newCol ?? "__backlog__";
      n[targetKey] = [...(p[targetKey] ?? []), { ...task, kanban_column_id: newCol, status: newStatus as Task["status"] } as Task & { kanban_column_id: string | null }];
      return n;
    });

    const fd = new FormData();
    fd.set("kanban_column_id", newCol ?? "");
    if (newStatus) fd.set("status", newStatus);
    const r = await updateTask(taskId, fd);
    if (r.error) { setError(r.error); fetchData(); return; }
    setAllTasks((p) => p.map((t) => t.id === taskId ? { ...t, kanban_column_id: newCol, status: (newStatus as Task["status"]) ?? t.status } : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks, columns]);

  const displayTasks = useMemo(() => {
    if (showCompleted) return tasksByColumn;
    const f: TasksByColumn = {};
    for (const [cId, ts] of Object.entries(tasksByColumn)) {
      const v = ts.filter((t) => t.status !== "done");
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

  if (isLoading) return <div className="space-y-6 px-4 py-8 sm:px-6"><Skeleton className="h-8 w-40" /><div className="flex gap-4"><Skeleton className="h-32 w-[300px] rounded-xl" /><Skeleton className="h-32 w-[300px] rounded-xl" /></div></div>;
  if (error) return <div className="flex flex-col items-center gap-4 px-4 py-20"><p className="text-destructive">{error}</p><Button variant="outline" onClick={fetchData}>Retry</Button></div>;

  return (
    <div className="space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10"><ClipboardList className="size-5 text-primary" /></div>
          <div><h1 className="text-2xl font-bold tracking-tight">Kanban Board</h1><p className="text-sm text-muted-foreground">{totalTasks} {totalTasks === 1 ? "task" : "tasks"} across {columns.length} columns</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowBacklog((v) => !v)} className="gap-1.5">
            <Inbox className="size-3.5" />
            {showBacklog ? "Hide backlog" : "Backlog"}
            {backlogTasks.length > 0 && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">{backlogTasks.length}</span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCompleted((v) => !v)} className="gap-1.5">
            {showCompleted ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}{showCompleted ? "Hide completed" : "Show completed"}
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
              onCreateTask={i === 0 && !showBacklog ? (title) => handleCreateTask(col.id, title) : undefined}
            />
          ))}
          <div className="min-w-[180px] flex items-start pt-1">
            {adding ? (
              <div className="flex items-center gap-1 w-full">
                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => { if (e.key==="Enter") handleAdd(); if (e.key==="Escape") setAdding(false); }} placeholder="Column name..." className="h-8 text-sm" autoFocus />
                <Button size="icon-xs" variant="ghost" onClick={handleAdd}><Check className="size-3" /></Button>
                <Button size="icon-xs" variant="ghost" onClick={() => setAdding(false)}><X className="size-3" /></Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full h-10 border-2 border-dashed border-border text-muted-foreground hover:text-foreground whitespace-nowrap" onClick={() => setAdding(true)}>
                <Plus className="size-4 mr-1" /> Add Column
              </Button>
            )}
          </div>
        </div>
        <DragOverlay>{activeTask ? <div className="w-[284px] rotate-2 opacity-90"><KanbanCard task={activeTask} /></div> : null}</DragOverlay>
      </DndContext>

      {totalTasks === 0 && (
        <div className="mt-12 flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-muted"><ClipboardList className="size-8 text-muted-foreground" /></div>
          <h2 className="text-lg font-semibold">No tasks yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">Create your first task and start organizing.</p>
        </div>
      )}
    </div>
  );
}
