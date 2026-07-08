"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Edit,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SortableTaskCard from "@/components/tasks/sortable-task-card";
import { getTasks, getTaskById, createTask, deleteTask, reorderTasks, updateTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";
import { TaskPriority, TaskStatus } from "@/types/task";

const PRIORITY_FILTER_OPTIONS = [
  { value: "", label: "All Priorities" },
  { value: TaskPriority.P1, label: "P1 — Urgent" },
  { value: TaskPriority.P2, label: "P2 — High" },
  { value: TaskPriority.P3, label: "P3 — Medium" },
  { value: TaskPriority.P4, label: "P4 — Low" },
] as const;

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: TaskStatus.Backlog, label: "Backlog" },
  { value: TaskStatus.Todo, label: "Todo" },
  { value: TaskStatus.InProgress, label: "In Progress" },
  { value: TaskStatus.Done, label: "Done" },
] as const;

const PRIORITY_CONFIG: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" | "ghost" }> = {
  p1: { label: "P1", variant: "destructive" },
  p2: { label: "P2", variant: "secondary" },
  p3: { label: "P3", variant: "outline" },
  p4: { label: "P4", variant: "ghost" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  backlog: { label: "Backlog", variant: "outline" },
  todo: { label: "Todo", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  done: { label: "Done", variant: "outline" },
};

type LoadingState = "idle" | "loading" | "loaded" | "error";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadState, setLoadState] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Quick create
  const [quickTitle, setQuickTitle] = useState("");
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const quickTitleRef = useRef(quickTitle);
  quickTitleRef.current = quickTitle;

  // Backlog quick create
  const [backlogQuickTitle, setBacklogQuickTitle] = useState("");
  const [backlogQuickAdding, setBacklogQuickAdding] = useState(false);
  const backlogQuickTitleRef = useRef(backlogQuickTitle);
  backlogQuickTitleRef.current = backlogQuickTitle;

  // Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Split view
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Drag-to-reorder
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  // Cross-section drag confirmation
  const [crossSectionDialog, setCrossSectionDialog] = useState<{
    open: boolean;
    taskId: string;
    fromStatus: string;
    toStatus: string;
    newActiveOrder: Task[];
    newBacklogOrder: Task[];
  } | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoadState("loading");
    setError(null);
    const result = await getTasks();
    if (result.error) {
      setError(result.error);
      setLoadState("error");
      return;
    }
    setTasks((result.data ?? []) as Task[]);
    setLoadState("loaded");
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  // Fetch selected task details
  const loadSelectedTask = useCallback(async (id: string) => {
    setSelectedTaskId(id);
    setDetailLoading(true);
    const result = await getTaskById(id);
    if (result.data) {
      setSelectedTask(result.data as Task);
    }
    setDetailLoading(false);
  }, []);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search) {
        const q = search.toLowerCase();
        if (!task.title.toLowerCase().includes(q)) return false;
      }
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (!showCompleted && task.status === "done") return false;
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter, showCompleted]);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedTaskId) return;
    setDeleting(true);
    const result = await deleteTask(selectedTaskId);
    if (result.success) {
      setSelectedTaskId(null);
      setSelectedTask(null);
      setDeleteOpen(false);
      fetchTasks();
    }
    setDeleting(false);
  }, [selectedTaskId, fetchTasks]);

  const handleQuickCreate = useCallback(async () => {
    const title = quickTitleRef.current.trim();
    if (!title || quickAdding) return;
    setQuickAdding(true);
    setQuickError(null);
    const formData = new FormData();
    formData.set("title", title);
    const result = await createTask(formData);
    if (result.error) {
      setQuickError(result.error);
    } else {
      setQuickTitle("");
      if (result.data) {
        setTasks((prev) => [result.data as Task, ...prev]);
      }
    }
    setQuickAdding(false);
  }, [quickAdding]);

  const handleBacklogQuickCreate = useCallback(async () => {
    const title = backlogQuickTitleRef.current.trim();
    if (!title || backlogQuickAdding) return;
    setBacklogQuickAdding(true);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("status", "backlog");
    const result = await createTask(formData);
    if (!result.error) {
      setBacklogQuickTitle("");
      if (result.data) {
        setTasks((prev) => [result.data as Task, ...prev]);
      }
    } else {
      console.error("Backlog quick create failed:", result.error);
    }
    setBacklogQuickAdding(false);
  }, [backlogQuickAdding]);

  // D5: Split tasks into backlog and non-backlog for visual separation, sorted by sort_order ASC
  const { backlogTasks, activeTasks } = useMemo(() => {
    const bl: Task[] = [];
    const active: Task[] = [];
    for (const task of filteredTasks) {
      if (task.status === TaskStatus.Backlog) bl.push(task);
      else active.push(task);
    }
    bl.sort((a, b) => a.sort_order - b.sort_order);
    active.sort((a, b) => a.sort_order - b.sort_order);
    return { backlogTasks: bl, activeTasks: active };
  }, [filteredTasks]);

  // Refs to eliminate stale closure in drag handlers
  const activeTasksRef = useRef(activeTasks);
  activeTasksRef.current = activeTasks;
  const backlogTasksRef = useRef(backlogTasks);
  backlogTasksRef.current = backlogTasks;

  // Optimistic reorder within a section
  function reorderWithinSection(
    items: Task[],
    oldIndex: number,
    newIndex: number,
  ): Task[] {
    const reordered = arrayMove(items, oldIndex, newIndex);
    return reordered.map((task, i) => ({
      ...task,
      sort_order: i * 1000,
    }));
  }

  // Persist reorder to server
  const persistReorder = useCallback(async (tasksToPersist: Task[]) => {
    const taskIds = tasksToPersist.map((t) => t.id);
    const result = await reorderTasks(taskIds);
    if (!result.success) {
      // Rollback: re-fetch from server
      fetchTasks();
    }
  }, [fetchTasks]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeTaskId = String(active.id);
      const overTaskId = String(over.id);

      // Determine which section the dragged task belongs to
      const isActiveDrag = activeTasksRef.current.some((t) => t.id === activeTaskId);
      const isBacklogDrag = backlogTasksRef.current.some((t) => t.id === activeTaskId);
      const isActiveOver = activeTasksRef.current.some((t) => t.id === overTaskId);
      const isBacklogOver = backlogTasksRef.current.some((t) => t.id === overTaskId);

      // Same section reorder
      if (isActiveDrag && isActiveOver) {
        const oldIndex = activeTasksRef.current.findIndex((t) => t.id === activeTaskId);
        const newIndex = activeTasksRef.current.findIndex((t) => t.id === overTaskId);
        const reordered = reorderWithinSection(activeTasksRef.current, oldIndex, newIndex);
        setTasks((prev) => {
          const updatedIds = new Set(reordered.map((t) => t.id));
          return prev.map((t) => (updatedIds.has(t.id) ? reordered.find((r) => r.id === t.id)! : t));
        });
        persistReorder(reordered);
        return;
      }

      if (isBacklogDrag && isBacklogOver) {
        const oldIndex = backlogTasksRef.current.findIndex((t) => t.id === activeTaskId);
        const newIndex = backlogTasksRef.current.findIndex((t) => t.id === overTaskId);
        const reordered = reorderWithinSection(backlogTasksRef.current, oldIndex, newIndex);
        setTasks((prev) => {
          const updatedIds = new Set(reordered.map((t) => t.id));
          return prev.map((t) => (updatedIds.has(t.id) ? reordered.find((r) => r.id === t.id)! : t));
        });
        persistReorder(reordered);
        return;
      }

      // Cross-section drag: show confirmation dialog
      if (isActiveDrag && isBacklogOver) {
        // Dragging from active to backlog
        const oldIndex = activeTasksRef.current.findIndex((t) => t.id === activeTaskId);
        const newIndex = backlogTasksRef.current.findIndex((t) => t.id === overTaskId);
        const newActive = activeTasksRef.current.filter((t) => t.id !== activeTaskId).map((t, i) => ({
          ...t,
          sort_order: i * 1000,
        }));
        const movedTask = { ...activeTasksRef.current[oldIndex], status: TaskStatus.Backlog };
        const newBacklog = [...backlogTasksRef.current];
        newBacklog.splice(newIndex, 0, movedTask);
        const newBacklogOrdered = newBacklog.map((t, i) => ({ ...t, sort_order: i * 1000 }));
        setCrossSectionDialog({
          open: true,
          taskId: activeTaskId,
          fromStatus: activeTasksRef.current[oldIndex].status,
          toStatus: TaskStatus.Backlog,
          newActiveOrder: newActive,
          newBacklogOrder: newBacklogOrdered,
        });
        return;
      }

      if (isBacklogDrag && isActiveOver) {
        // Dragging from backlog to active
        const oldIndex = backlogTasksRef.current.findIndex((t) => t.id === activeTaskId);
        const newIndex = activeTasksRef.current.findIndex((t) => t.id === overTaskId);
        const newBacklog = backlogTasksRef.current.filter((t) => t.id !== activeTaskId).map((t, i) => ({
          ...t,
          sort_order: i * 1000,
        }));
        const movedTask = { ...backlogTasksRef.current[oldIndex], status: TaskStatus.Todo };
        const newActive = [...activeTasksRef.current];
        newActive.splice(newIndex, 0, movedTask);
        const newActiveOrdered = newActive.map((t, i) => ({ ...t, sort_order: i * 1000 }));
        setCrossSectionDialog({
          open: true,
          taskId: activeTaskId,
          fromStatus: TaskStatus.Backlog,
          toStatus: TaskStatus.Todo,
          newActiveOrder: newActiveOrdered,
          newBacklogOrder: newBacklog,
        });
        return;
      }
    },
    [persistReorder],
  );

  const confirmCrossSectionDrag = useCallback(async () => {
    if (!crossSectionDialog) return;
    const { taskId, toStatus, newActiveOrder, newBacklogOrder } = crossSectionDialog;

    // Optimistic update
    setTasks((prev) => {
      const updatedIds = new Set([
        ...newActiveOrder.map((t) => t.id),
        ...newBacklogOrder.map((t) => t.id),
      ]);
      return prev.map((t) => {
        if (updatedIds.has(t.id)) {
          return (
            newActiveOrder.find((a) => a.id === t.id) ??
            newBacklogOrder.find((b) => b.id === t.id) ??
            t
          );
        }
        return t;
      });
    });

    setCrossSectionDialog(null);

    // Persist: update status + reorder
    const formData = new FormData();
    formData.set("status", toStatus);
    const statusResult = await updateTask(taskId, formData);
    if (statusResult.error) {
      console.error("Cross-section drag: updateTask failed:", statusResult.error);
      fetchTasks();
      return;
    }

    // ⚠️ If updateTask succeeds but reorderTasks fails, task is moved but ordering is stale until re-fetch
    // Reorder both sections
    const allReordered = [...newActiveOrder, ...newBacklogOrder];
    const taskIds = allReordered.map((t) => t.id);
    const reorderResult = await reorderTasks(taskIds);
    if (!reorderResult.success) {
      console.error("Cross-section drag: reorderTasks failed:", reorderResult.error);
      fetchTasks();
    }
  }, [crossSectionDialog, fetchTasks]);

  const cancelCrossSectionDrag = useCallback(() => {
    setCrossSectionDialog(null);
  }, []);

  const priority = selectedTask ? PRIORITY_CONFIG[selectedTask.priority] ?? PRIORITY_CONFIG.p3 : null;
  const status = selectedTask ? STATUS_CONFIG[selectedTask.status] ?? STATUS_CONFIG.todo : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {loadState === "loaded"
              ? `${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""}`
              : "Loading your tasks..."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button render={<Link href="/tasks/new" />}>
            <Plus className="size-4" /> New Task
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowCompleted((v) => !v)} className="gap-1.5">
            {showCompleted ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            {showCompleted ? "Hide completed" : "Show completed"}
          </Button>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTER_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {(search || priorityFilter || statusFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setPriorityFilter(""); setStatusFilter(""); }} className="shrink-0">Clear</Button>
        )}
      </motion.div>

      {/* Quick create */}
      {loadState === "loaded" && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Quick add task by name..." value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleQuickCreate(); } }}
                disabled={quickAdding} className="pl-8" />
            </div>
            <Button size="icon" onClick={handleQuickCreate} disabled={!quickTitle.trim() || quickAdding} className="shrink-0"><Plus className="size-4" /></Button>
          </div>
          {quickError && <p className="text-xs text-destructive">{quickError}</p>}
        </motion.div>
      )}

      {/* Split view: list left (md+), detail right (md+) */}
      <div className="flex gap-6 items-start">
        {/* Left: task list */}
        <div className={cn("min-w-0 flex-1", selectedTaskId && "hidden md:block md:w-1/2 md:flex-none")}>
          <AnimatePresence mode="wait">
            {loadState === "loading" && <TaskSkeletons key="skeletons" />}
            {loadState === "error" && (
              <motion.div key="error" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-destructive/40">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><AlertCircle className="size-5 text-destructive" />Failed to load tasks</CardTitle>
                    <CardDescription>{error ?? "An unexpected error occurred."}</CardDescription>
                  </CardHeader>
                  <CardContent><Button variant="outline" onClick={fetchTasks}><RefreshCw className="size-4" />Retry</Button></CardContent>
                </Card>
              </motion.div>
            )}
            {loadState === "loaded" && filteredTasks.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center gap-4 py-12">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted"><ClipboardList className="size-6 text-muted-foreground" /></div>
                    <div className="text-center">
                      <p className="font-medium">{tasks.length === 0 ? "No tasks yet. Create your first task!" : "No tasks match your filters."}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{tasks.length === 0 ? "Start by adding a task to get organized." : "Try adjusting your search or filter criteria."}</p>
                    </div>
                    {tasks.length === 0 ? (
                      <Button render={<Link href="/tasks/new" />}><Plus className="size-4" />Create Task</Button>
                    ) : (
                      <Button variant="outline" onClick={() => { setSearch(""); setPriorityFilter(""); setStatusFilter(""); }}>Clear Filters</Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
            {loadState === "loaded" && (backlogTasks.length > 0 || activeTasks.length > 0) && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-3">
                  {/* Active (non-backlog) tasks */}
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      Active ({activeTasks.length})
                    </span>
                    {activeTasks.length > 1 && (
                      <span className="text-[11px] text-muted-foreground/60">Drag to reorder</span>
                    )}
                  </div>
                  <SortableContext items={activeTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {activeTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onSelect={loadSelectedTask}
                        isSelected={selectedTaskId === task.id}
                        onDelete={fetchTasks}
                      />
                    ))}
                  </SortableContext>
                  {/* D5: Backlog / Todo separator — always visible when there are active tasks */}
                  {activeTasks.length > 0 && (
                    <div className="flex items-center gap-3 py-1">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs font-medium text-muted-foreground">Backlog</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}
                  {/* D5: Backlog inline create — always visible, above backlog tasks */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleBacklogQuickCreate(); }}
                    className="flex items-center gap-2 px-1"
                  >
                    <Input
                      placeholder="Quick add to backlog..."
                      value={backlogQuickTitle}
                      onChange={(e) => setBacklogQuickTitle(e.target.value)}
                      disabled={backlogQuickAdding}
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="icon" variant="ghost" className="size-7 shrink-0"
                      disabled={!backlogQuickTitle.trim() || backlogQuickAdding}>
                      <Plus className="size-3.5" />
                    </Button>
                  </form>
                  {/* Backlog tasks */}
                  <SortableContext items={backlogTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {backlogTasks.map((task) => (
                      <SortableTaskCard
                        key={task.id}
                        task={task}
                        onSelect={loadSelectedTask}
                        isSelected={selectedTaskId === task.id}
                        onDelete={fetchTasks}
                      />
                    ))}
                  </SortableContext>
                </motion.div>
              </DndContext>
            )}
          </AnimatePresence>
        </div>

        {/* Right: task detail panel (desktop only) */}
        {selectedTaskId && (
          <div className="hidden md:block w-1/2 flex-none sticky top-6">
            {detailLoading ? (
              <Card><CardContent className="py-12"><Skeleton className="h-6 w-3/4 mb-3" /><Skeleton className="h-4 w-full mb-2" /><Skeleton className="h-4 w-2/3" /></CardContent></Card>
            ) : selectedTask ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className={cn("text-lg", selectedTask.status === "done" && "line-through")}>
                        {selectedTask.title}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Created {new Date(selectedTask.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon-xs" render={<Link href={`/tasks/${selectedTask.id}`} />}>
                        <Edit className="size-3.5" />
                      </Button>
                      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <DialogTrigger render={<Button variant="ghost" size="icon-xs" />}>
                          <Trash2 className="size-3.5" />
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete task?</DialogTitle>
                            <DialogDescription>This will permanently delete &quot;{selectedTask.title}&quot;.</DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose render={<Button variant="outline" disabled={deleting} />}>Cancel</DialogClose>
                            <Button variant="destructive" onClick={handleDeleteSelected} disabled={deleting}>
                              {deleting ? "Deleting..." : "Delete"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedTask.description && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedTask.description}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
                      <Badge variant={priority!.variant}>{priority!.label}</Badge>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                      <Badge variant={status!.variant}>{status!.label}</Badge>
                    </div>
                    {selectedTask.due_date && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Due date</p>
                        <span className="text-sm inline-flex items-center gap-1">
                          <Calendar className="size-3 text-muted-foreground" />
                          {new Date(selectedTask.due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedTask.tags && selectedTask.tags.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedTask.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs">
                            <Tag className="size-3" />{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>

      {/* Cross-section drag confirmation dialog */}
      <Dialog
        open={crossSectionDialog?.open ?? false}
        onOpenChange={(open) => {
          if (!open) cancelCrossSectionDrag();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {crossSectionDialog?.toStatus === TaskStatus.Backlog
                ? "Move to Backlog?"
                : "Move to Active?"}
            </DialogTitle>
            <DialogDescription>
              {crossSectionDialog?.toStatus === TaskStatus.Backlog
                ? "This task will be moved from active to backlog."
                : "This task will be moved from backlog to active."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={confirmCrossSectionDrag}>
              {crossSectionDialog?.toStatus === TaskStatus.Backlog
                ? "Move to Backlog"
                : "Move to Active"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskSkeletons() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader><Skeleton className="h-4 w-3/4" /></CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2"><Skeleton className="h-5 w-10 rounded-full" /><Skeleton className="h-5 w-16 rounded-full" /><Skeleton className="h-5 w-20 rounded-full" /></div>
            <Skeleton className="h-4 w-1/2" /></CardContent>
        </Card>
      ))}
    </div>
  );
}
