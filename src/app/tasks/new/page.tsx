"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TaskForm from "@/components/tasks/task-form";

export default function NewTaskPage() {
  const router = useRouter();

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
      {/* Back link */}
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Button variant="ghost" size="sm" render={<a href="/tasks" />}>
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
                <ClipboardList className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle>Create Task</CardTitle>
                <CardDescription>
                  Add a new task to your list.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TaskForm
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
