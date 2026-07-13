"use client";

import { useState, useCallback } from "react";
import { Plus, Lightbulb, ListChecks, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createTask } from "@/lib/actions/tasks";
import { createIdea } from "@/lib/actions/ideas";
import { createPlan } from "@/lib/actions/plans";

type QuickAction = "task" | "idea" | "plan" | null;

export function QuickActions() {
  const [action, setAction] = useState<QuickAction>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const t = title.trim();
    if (!t || !action || loading) return;

    setLoading(true);
    setError(null);

    try {
      const fd = new FormData();
      fd.set("title", t);

      let result: { error?: string };
      switch (action) {
        case "task":
          result = await createTask(fd);
          break;
        case "idea": {
          const ideaFd = new FormData();
          ideaFd.set("title", t);
          result = await createIdea(ideaFd);
          break;
        }
        case "plan": {
          const planFd = new FormData();
          planFd.set("title", t);
          result = await createPlan(planFd);
          break;
        }
      }

      if (result.error) {
        setError(result.error);
      } else {
        setTitle("");
        setAction(null);
        setSuccess(`${action === "task" ? "Task" : action === "idea" ? "Idea" : "Plan"} created!`);
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [title, action, loading]);

  const reset = useCallback(() => {
    setAction(null);
    setTitle("");
    setError(null);
  }, []);

  const labels: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; label: string; placeholder: string }
  > = {
    task: { icon: Plus, label: "New Task", placeholder: "Task title..." },
    idea: { icon: Lightbulb, label: "New Idea", placeholder: "Idea title..." },
    plan: { icon: ListChecks, label: "New Plan", placeholder: "Plan title..." },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <AnimatePresence mode="wait">
          {action ? (
            <motion.div
              key="input"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSubmit();
                    }
                    if (e.key === "Escape") reset();
                  }}
                  placeholder={labels[action].placeholder}
                  className="h-8 text-sm"
                  autoFocus
                  disabled={loading}
                />
                <Button size="icon-xs" onClick={handleSubmit} disabled={!title.trim() || loading}>
                  {loading ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                </Button>
              </div>
              {error && <p className="text-xs text-destructive">{error}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="buttons"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-wrap gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAction("task")}
              >
                <Plus className="size-3.5" />
                Task
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAction("idea")}
              >
                <Lightbulb className="size-3.5" />
                Idea
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setAction("plan")}
              >
                <ListChecks className="size-3.5" />
                Plan
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        {success && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-green-600 dark:text-green-400"
          >
            {success}
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}
