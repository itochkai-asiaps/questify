"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Calendar, Tag, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
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
import { deleteTask } from "@/lib/actions/tasks";
import { cn } from "@/lib/utils";
import type { Task } from "@/types/task";

const PRIORITY_CONFIG: Record<
  string,
  { label: string; variant: "destructive" | "secondary" | "outline" | "ghost" }
> = {
  p1: { label: "P1", variant: "destructive" },
  p2: { label: "P2", variant: "secondary" },
  p3: { label: "P3", variant: "outline" },
  p4: { label: "P4", variant: "ghost" },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  todo: { label: "Todo", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  done: { label: "Done", variant: "outline" },
};

function isOverdue(dueDate: string | null | undefined, status: string): boolean {
  if (!dueDate || status === "done") return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(
  dueDate: string | null | undefined,
  status: string,
): string | null {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isOverdue(dueDate, status)) {
    if (diffDays === -1) return "Yesterday";
    return `${Math.abs(diffDays)}d overdue`;
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `${diffDays}d left`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

interface TaskCardProps {
  task: Task;
  onDelete?: () => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}

export default function TaskCard({ task, onDelete, onSelect, isSelected }: TaskCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(task.id);
    } else {
      router.push(`/tasks/${task.id}`);
    }
  }, [router, task.id, onSelect]);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    setDeleteError(null);

    const result = await deleteTask(task.id);

    if (!result.success) {
      setDeleteError(result.error ?? "Failed to delete task");
      setIsDeleting(false);
      return;
    }

    setIsDeleting(false);
    setDialogOpen(false);
    onDelete?.();
  }, [task.id, onDelete]);

  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.p3;
  const status = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
  const overdue = isOverdue(task.due_date, task.status);
  const dueDateLabel = formatDueDate(task.due_date, task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "cursor-pointer transition-shadow duration-200 hover:shadow-md",
          task.status === "done" && "opacity-70",
          isSelected && "ring-2 ring-primary/50 shadow-md",
        )}
        onClick={handleClick}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn(
                "line-clamp-2 text-base leading-snug",
                task.status === "done" && "line-through",
              )}
            >
              {task.title}
            </CardTitle>
            <CardActionWrapper>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete task: ${task.title}`}
                    />
                  }
                >
                  <Trash2 className="size-3.5" />
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete task?</DialogTitle>
                    <DialogDescription>
                      This will permanently delete &ldquo;{task.title}&rdquo;.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  {deleteError && (
                    <p className="text-sm text-destructive">{deleteError}</p>
                  )}
                  <DialogFooter>
                    <DialogClose
                      render={
                        <Button variant="outline" disabled={isDeleting} />
                      }
                    >
                      Cancel
                    </DialogClose>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardActionWrapper>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Priority + Status badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={priority.variant}>{priority.label}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>

            {dueDateLabel && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  overdue ? "font-medium text-destructive" : "text-muted-foreground",
                )}
              >
                <Calendar className="size-3" />
                {dueDateLabel}
              </span>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              <Tag className="size-3 text-muted-foreground" />
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Thin wrapper so the Dialog trigger sits in the CardAction slot without triggering card navigation. */
function CardActionWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="col-start-2 row-span-2 row-start-1 self-start justify-self-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      role="presentation"
    >
      {children}
    </div>
  );
}
