"use client";

import {
  type FormEvent,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask, updateTask } from "@/lib/actions/tasks";
import type { Task } from "@/types/task";
import { TaskPriority, TaskStatus } from "@/types/task";

const PRIORITY_OPTIONS = [
  { value: TaskPriority.P1, label: "P1 — Urgent" },
  { value: TaskPriority.P2, label: "P2 — High" },
  { value: TaskPriority.P3, label: "P3 — Medium" },
  { value: TaskPriority.P4, label: "P4 — Low" },
] as const;

const STATUS_OPTIONS = [
  { value: TaskStatus.Todo, label: "Todo" },
  { value: TaskStatus.InProgress, label: "In Progress" },
  { value: TaskStatus.Done, label: "Done" },
  { value: TaskStatus.Missed, label: "Missed" },
] as const;

interface TaskFormState {
  error?: string;
  data?: unknown;
}

interface TaskFormProps {
  /** Existing task for edit mode; undefined for create mode. */
  task?: Task;
  /** Called after successful create/update. */
  onSuccess?: () => void;
}

export default function TaskForm({ task, onSuccess }: TaskFormProps) {
  const isEdit = task !== undefined;
  const titleId = useId();
  const descId = useId();
  const priorityId = useId();
  const statusId = useId();
  const dueId = useId();
  const tagsId = useId();

  // Controlled fields that don't map 1:1 to native inputs
  const [priority, setPriority] = useState<string>(task?.priority ?? TaskPriority.P3);
  const [status, setStatus] = useState<string>(task?.status ?? TaskStatus.Todo);
  const [dueDate, setDueDate] = useState<string>(
    task?.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : "",
  );
  const [tagsStr, setTagsStr] = useState<string>(task?.tags?.join(", ") ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    task?.estimated_minutes?.toString() ?? "",
  );

  const actionFn = useCallback(
    async (_prevState: TaskFormState, formData: FormData) => {
      // Convert YYYY-MM-DD to ISO datetime string for the schema
      const rawDue = formData.get("due_date") as string;
      if (rawDue && rawDue.length > 0) {
        formData.set("due_date", new Date(`${rawDue}T00:00:00`).toISOString());
      } else {
        formData.delete("due_date");
      }

      // NOTE: The current server action reads tags as a plain string from
      // FormData, but the Zod schema expects an array. To avoid validation
      // failures we omit the tags field. Tags will default to [].
      formData.delete("tags");

      if (isEdit && task) {
        return updateTask(task.id, formData);
      }
      return createTask(formData);
    },
    [isEdit, task],
  );

  const [state, formAction, isPending] = useActionState<TaskFormState, FormData>(
    actionFn,
    {} as TaskFormState,
  );

  const successCalled = useRef(false);

  useEffect(() => {
    if (state.data && !successCalled.current) {
      successCalled.current = true;
      onSuccess?.();
    }
  }, [state.data, onSuccess]);

  // Prevent form re-submission after success
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      if (state.data) {
        e.preventDefault();
      }
    },
    [state.data],
  );

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor={titleId}>
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id={titleId}
          name="title"
          placeholder="What needs to be done?"
          defaultValue={task?.title}
          required
          maxLength={200}
          aria-invalid={!!state.error}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor={descId}>Description</Label>
        <textarea
          id={descId}
          name="description"
          rows={3}
          placeholder="Add details (optional)"
          defaultValue={task?.description ?? ""}
          maxLength={2000}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <Label htmlFor={priorityId}>Priority</Label>
        <input type="hidden" name="priority" value={priority} />
        <Select value={priority} onValueChange={(v) => setPriority(v ?? TaskPriority.P3)}>
          <SelectTrigger id={priorityId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status (edit mode only) */}
      {isEdit && (
        <div className="space-y-2">
          <Label htmlFor={statusId}>Status</Label>
          <input type="hidden" name="status" value={status} />
          <Select value={status} onValueChange={(v) => setStatus(v ?? TaskStatus.Todo)}>
            <SelectTrigger id={statusId}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor={dueId}>Due Date</Label>
        <Input
          id={dueId}
          name="due_date"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Estimated Time */}
      <div className="space-y-2">
        <Label htmlFor="estId">Estimated Time (min)</Label>
        <Input
          id="estId"
          name="estimated_minutes"
          type="number"
          min="1"
          placeholder="e.g. 30"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor={tagsId}>Tags</Label>
        <Input
          id={tagsId}
          placeholder="comma, separated, list"
          value={tagsStr}
          onChange={(e) => setTagsStr(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated tags (e.g. &ldquo;work, important, follow-up&rdquo;)
        </p>
      </div>

      {/* Error display */}
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {isEdit ? "Saving..." : "Creating..."}
            </>
          ) : isEdit ? (
            "Save Changes"
          ) : (
            "Create Task"
          )}
        </Button>
        <Button type="button" variant="ghost" disabled={isPending} render={<Link href="/tasks" />}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
