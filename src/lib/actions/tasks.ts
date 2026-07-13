"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { requireUser } from "@/lib/auth/requireUser";
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  TaskPriority,
  TaskStatus,
} from "@/types/task";
import { completeTask, checkAndAwardAchievements } from "@/lib/gamification/engine";
import { XP_REWARDS } from "@/lib/gamification/levels";

export async function createTask(formData: FormData): Promise<{ data?: unknown; error?: string }> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    priority: (formData.get("priority") as string) ?? undefined,
    due_date: (formData.get("due_date") as string) || undefined,
    tags: JSON.parse((formData.get("tags") as string) || "[]"),
    estimated_minutes: formData.get("estimated_minutes")
      ? Number(formData.get("estimated_minutes"))
      : undefined,
  };

  const parsed = CreateTaskInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title, description, priority, due_date, tags, estimated_minutes } = parsed.data;
  const xp_reward = XP_REWARDS[priority] ?? 15;
  const status = (formData.get("status") as string) === "backlog" ? "backlog" : "todo";
  const kanbanColumnId = (formData.get("kanban_column_id") as string) || null;

  const insertData: Record<string, unknown> = {
    title,
    description: description ?? null,
    priority,
    due_date: due_date ?? null,
    tags,
    xp_reward,
    user_id: user.id,
    status,
    estimated_minutes: estimated_minutes ?? null,
  };
  if (kanbanColumnId) insertData.kanban_column_id = kanbanColumnId;

  const { data, error } = await supabase.from("tasks").insert(insertData).select().single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/tasks", "layout");
  return { data };
}

export async function updateTask(
  taskId: string,
  formData: FormData,
): Promise<{ data?: unknown; error?: string }> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Fetch current task to detect status transition to "done" or "missed"
  const { data: currentTask } = await supabase
    .from("tasks")
    .select("status, priority, estimated_minutes, actual_minutes")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  const rawData: Record<string, unknown> = {};
  const title = formData.get("title");
  if (title !== null) rawData.title = title;
  const description = formData.get("description");
  if (description !== null) rawData.description = description;
  const status = formData.get("status");
  if (status !== null) rawData.status = status;
  const priority = formData.get("priority");
  if (priority !== null) rawData.priority = priority;
  const due_date = formData.get("due_date");
  if (due_date !== null) rawData.due_date = due_date;
  const tags = formData.get("tags");
  if (tags !== null) rawData.tags = JSON.parse((tags as string) || "[]");
  const kanban_column_id = formData.get("kanban_column_id");
  if (kanban_column_id !== null) rawData.kanban_column_id = kanban_column_id || null;
  const position = formData.get("position");
  if (position !== null) rawData.position = Number(position);
  const sort_order = formData.get("sort_order");
  if (sort_order !== null) rawData.sort_order = Number(sort_order);
  const estimated_minutes = formData.get("estimated_minutes");
  if (estimated_minutes !== null)
    rawData.estimated_minutes = estimated_minutes === "" ? null : Number(estimated_minutes);
  const actual_minutes = formData.get("actual_minutes");
  if (actual_minutes !== null)
    rawData.actual_minutes = actual_minutes === "" ? null : Number(actual_minutes);

  const parsed = UpdateTaskInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (updateData.priority) {
    updateData.xp_reward = XP_REWARDS[updateData.priority as TaskPriority] ?? 15;
  }

  // D7a: previous_status management
  // Save previous_status when moving TO backlog
  if (parsed.data.status === TaskStatus.Backlog && currentTask?.status !== TaskStatus.Backlog) {
    updateData.previous_status = currentTask?.status ?? TaskStatus.Todo;
  }
  // Clear previous_status when moving OUT of backlog
  if (
    parsed.data.status &&
    parsed.data.status !== TaskStatus.Backlog &&
    currentTask?.status === TaskStatus.Backlog
  ) {
    updateData.previous_status = null;
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(updateData)
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Detect completion: transition to done OR missed
  const wasJustCompleted =
    currentTask?.status !== "done" &&
    currentTask?.status !== "missed" &&
    (parsed.data.status === TaskStatus.Done || parsed.data.status === TaskStatus.Missed);

  // Award XP only for actual completion (done), not for missed
  if (wasJustCompleted && parsed.data.status === TaskStatus.Done) {
    const taskPriority = (currentTask?.priority ?? "p3") as TaskPriority;
    try {
      await completeTask(user.id, taskPriority);
      await checkAndAwardAchievements(user.id);
    } catch (e) {
      console.error("completeTask failed:", e);
      // Gamification failure should not block the task update
    }
  }

  // K1: Auto-capture actual_minutes on completion (done or missed)
  // If actual_minutes not explicitly set, fall back to estimated_minutes
  if (wasJustCompleted) {
    const finalActual =
      updateData.actual_minutes ??
      currentTask?.actual_minutes ??
      currentTask?.estimated_minutes ??
      null;

    if (finalActual !== null) {
      const { error: actualError } = await supabase
        .from("tasks")
        .update({ actual_minutes: finalActual })
        .eq("id", taskId)
        .eq("user_id", user.id);

      if (actualError) {
        console.error("Failed to set actual_minutes:", actualError.message);
      }
    }
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/tasks", "layout");
  revalidatePath("/kanban", "layout");
  return { data };
}

export async function deleteTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/tasks", "layout");
  return { success: true };
}

export async function reorderTasks(
  taskIds: string[],
): Promise<{ success: boolean; error?: string }> {
  // Validate input: non-empty array of UUIDs, max 500 tasks
  const parseResult = z.array(z.string().uuid()).min(1).max(500).safeParse(taskIds);
  if (!parseResult.success) {
    return { success: false, error: "Invalid task IDs" };
  }

  const { supabase, user } = await requireUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("reorder_tasks", { p_task_ids: parseResult.data });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks", "layout");
  revalidatePath("/kanban", "layout");
  return { success: true };
}

export async function getTasks(orderBy: "created_at" | "sort_order" = "sort_order"): Promise<{
  data?: unknown[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let query = supabase.from("tasks").select("*").eq("user_id", user.id).is("deleted_at", null);

  if (orderBy === "sort_order") {
    query = query
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    return { error: error.message };
  }

  return { data };
}

export async function getTaskById(taskId: string): Promise<{ data?: unknown; error?: string }> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .is("deleted_at", null)
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Bulk-update task statuses for the draggable backlog separator (D7).
 * Handles previous_status save/restore for D7a.
 */
export async function bulkUpdateTaskStatuses(
  updates: { taskId: string; newStatus: string; previousStatus?: string }[],
): Promise<{ success: boolean; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Validate input
  if (!Array.isArray(updates) || updates.length === 0) {
    return { success: false, error: "No updates provided" };
  }
  if (updates.length > 500) {
    return { success: false, error: "Too many tasks (max 500)" };
  }

  // Validate all task IDs are valid UUIDs
  const uuidSchema = z.string().uuid();
  for (const update of updates) {
    if (!uuidSchema.safeParse(update.taskId).success) {
      return { success: false, error: `Invalid task ID: ${update.taskId}` };
    }
  }

  // Build updates — each task gets status + previous_status
  // previous_status behavior:
  // - Going INTO backlog: save current status as previous_status
  // - Going OUT of backlog: clear previous_status (restoration happens client-side)
  for (const update of updates) {
    const updateData: Record<string, unknown> = {
      status: update.newStatus,
      updated_at: new Date().toISOString(),
    };

    if (update.newStatus === "backlog" && update.previousStatus) {
      updateData.previous_status = update.previousStatus;
    } else if (update.newStatus !== "backlog") {
      updateData.previous_status = null;
    }

    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", update.taskId)
      .eq("user_id", user.id);

    if (error) {
      console.error("bulkUpdateTaskStatuses: failed for", update.taskId, error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/tasks", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/kanban", "layout");
  return { success: true };
}
