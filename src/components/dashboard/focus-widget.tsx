"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Target, Play, X, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFocusTask, setFocusTask, clearFocusTask } from "@/lib/actions/focus";
import { cn } from "@/lib/utils";

interface FocusWidgetProps {
  tasks: Array<{ id: string; title: string; status: string; priority: string; due_date: string | null }>;
}

export function FocusWidget({ tasks }: FocusWidgetProps) {
  const [focusTask, setFocusTaskState] = useState<{
    task_id: string;
    task_title?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting, setSetting] = useState(false);

  const fetchFocus = useCallback(async () => {
    const result = await getFocusTask();
    if (result.data) setFocusTaskState(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFocus();
  }, [fetchFocus]);

  const handleSetFocus = useCallback(async (taskId: string) => {
    setSetting(true);
    const result = await setFocusTask(taskId);
    if (result.data) {
      const task = tasks.find((t) => t.id === taskId);
      setFocusTaskState({ task_id: taskId, task_title: task?.title });
    }
    setSetting(false);
  }, [tasks]);

  const handleClear = useCallback(async () => {
    await clearFocusTask();
    setFocusTaskState(null);
  }, []);

  const todayStr = new Date().toISOString().slice(0, 10);

  // Combo sort: P1 (deadline today) → P1 (no deadline) → P2 (deadline today) → ...
  const priorityOrder: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 99;
      const pb = priorityOrder[b.priority] ?? 99;
      if (pa !== pb) return pa - pb;
      // Same priority: deadline today first, then no deadline, then future
      const aToday = a.due_date?.slice(0, 10) === todayStr ? 0 : !a.due_date ? 1 : 2;
      const bToday = b.due_date?.slice(0, 10) === todayStr ? 0 : !b.due_date ? 1 : 2;
      return aToday - bToday;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Target className="size-4 text-primary" />
          Focus
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {focusTask ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-medium truncate">
                {focusTask.task_title ?? "Selected task"}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="gap-1.5 flex-1"
                render={<Link href="/focus" />}
              >
                <Play className="size-3.5" />
                Start Focus
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleClear}
                className="shrink-0"
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </motion.div>
        ) : activeTasks.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Pick a task to focus on:
            </p>
            {activeTasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => handleSetFocus(task.id)}
                disabled={setting}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                  "border border-border",
                )}
              >
                <Target className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{task.title}</span>
                {setting && <Loader2 className="ml-auto size-3 animate-spin" />}
              </button>
            ))}
          </div>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            No active tasks. Create one first!
          </p>
        )}
      </CardContent>
    </Card>
  );
}
