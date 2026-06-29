"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import TaskCard from "@/components/tasks/task-card";
import { getTasks, createTask } from "@/lib/actions/tasks";
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
  { value: TaskStatus.Todo, label: "Todo" },
  { value: TaskStatus.InProgress, label: "In Progress" },
  { value: TaskStatus.Done, label: "Done" },
] as const;

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

  // Filters
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

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

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Client-side filtering
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (search) {
        const q = search.toLowerCase();
        if (!task.title.toLowerCase().includes(q)) return false;
      }
      if (priorityFilter && task.priority !== priorityFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter]);

  const handleTaskDelete = useCallback(() => {
    fetchTasks();
  }, [fetchTasks]);

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
      // Optimistic: add the new task directly without full refetch
      if (result.data) {
        setTasks((prev) => [result.data as Task, ...prev]);
      }
    }
    setQuickAdding(false);
  }, [quickAdding]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-heading font-semibold tracking-tight">
            Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            {loadState === "loaded"
              ? `${filteredTasks.length} task${filteredTasks.length !== 1 ? "s" : ""}`
              : "Loading your tasks..."}
          </p>
        </div>
        <Button render={<Link href="/tasks/new" />}>
          <Plus className="size-4" />
          New Task
        </Button>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v ?? "")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "")}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || priorityFilter || statusFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setPriorityFilter("");
              setStatusFilter("");
            }}
            className="shrink-0"
          >
            Clear
          </Button>
        )}
      </motion.div>

      {/* Quick create */}
      {loadState === "loaded" && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Quick add task by name..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickCreate();
                  }
                }}
                disabled={quickAdding}
                className="pl-8"
              />
            </div>
            <Button
              size="icon"
              onClick={handleQuickCreate}
              disabled={!quickTitle.trim() || quickAdding}
              className="shrink-0"
            >
              <Plus className="size-4" />
            </Button>
          </div>
          {quickError && (
            <p className="text-xs text-destructive">{quickError}</p>
          )}
        </motion.div>
      )}

      {/* Task grid */}
      <AnimatePresence mode="wait">
        {loadState === "loading" && <TaskSkeletons key="skeletons" />}

        {loadState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="size-5 text-destructive" />
                  Failed to load tasks
                </CardTitle>
                <CardDescription>
                  {error ?? "An unexpected error occurred."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  onClick={fetchTasks}
                >
                  <RefreshCw className="size-4" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {loadState === "loaded" && filteredTasks.length === 0 && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <ClipboardList className="size-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="font-medium">
                    {tasks.length === 0
                      ? "No tasks yet. Create your first task!"
                      : "No tasks match your filters."}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tasks.length === 0
                      ? "Start by adding a task to get organized."
                      : "Try adjusting your search or filter criteria."}
                  </p>
                </div>
                {tasks.length === 0 ? (
                  <Button render={<Link href="/tasks/new" />}>
                    <Plus className="size-4" />
                    Create Task
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setPriorityFilter("");
                      setStatusFilter("");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {loadState === "loaded" && filteredTasks.length > 0 && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {filteredTasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                <TaskCard task={task} onDelete={handleTaskDelete} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Skeleton placeholder cards shown while tasks are loading. */
function TaskSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
