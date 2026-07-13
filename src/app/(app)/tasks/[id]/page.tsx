"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import TaskForm from "@/components/tasks/task-form";
import { getTaskById } from "@/lib/actions/tasks";
import type { Task } from "@/types/task";

export default function EditTaskPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getTaskById(taskId);

    if (!("data" in result)) {
      if ("error" in result && result.error) setError(result.error);
      setLoading(false);
      return;
    }

    setTask((result.data as Task) ?? null);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <Skeleton className="h-9 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-28" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" render={<Link href="/tasks" />}>
          <ArrowLeft className="size-4" />
          Back to Tasks
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Task not found</CardTitle>
            <CardDescription>
              {error ?? "The task you are looking for does not exist or has been deleted."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link href="/tasks" />}>Go to Tasks</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
      {/* Back link */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <Button variant="ghost" size="sm" render={<Link href="/tasks" />}>
          <ArrowLeft className="size-4" />
          Back to Tasks
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Edit Task</CardTitle>
                <CardDescription>Update your task details below.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TaskForm
              task={task}
              onSuccess={() => {
                router.push("/tasks");
              }}
            />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
