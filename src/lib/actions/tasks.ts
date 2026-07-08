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

export async function createTask(
  formData: FormData,
): Promise<{ data?: unknown; error?: string }> {
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
  };

  const parsed = CreateTaskInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title, description, priority, due_date, tags } = parsed.data;
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
  };
  if (kanbanColumnId) insertData.kanban_column_id = kanbanColumnId;

  const { data, error } = await supabase
    .from("tasks")
    .insert(insertData)
    .select()
    .single();

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

  // Fetch current task to detect status transition to "done"
  const { data: currentTask } = await supabase
    .from("tasks")
    .select("status, priority")
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

  const parsed = UpdateTaskInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const updateData: Record<string, unknown> = { ...parsed.data };

  if (updateData.priority) {
    updateData.xp_reward = XP_REWARDS[updateData.priority as TaskPriority] ?? 15;
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

  // Award XP if task was just marked as done
  const wasJustCompleted =
    currentTask?.status !== "done" && parsed.data.status === TaskStatus.Done;
  let wasCompletionAwarded = false;
  if (wasJustCompleted && !wasCompletionAwarded) {
    wasCompletionAwarded = true;
    const taskPriority = (currentTask?.priority ?? "p3") as TaskPriority;
    try {
      await completeTask(user.id, taskPriority);
      await checkAndAwardAchievements(user.id);
    } catch (e) {
      console.error("completeTask failed:", e);
      // Gamification failure should not block the task update
    }
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/tasks", "layout");
  return { data };
}

export async function deleteTask(
  taskId: string,
): Promise<{ success: boolean; error?: string }> {
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

export async function getTasks(
  orderBy: "created_at" | "sort_order" = "sort_order",
): Promise<{
  data?: unknown[];
  error?: string;
}> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", user.id)
    .is("deleted_at", null);

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

export async function getTaskById(
  taskId: string,
): Promise<{ data?: unknown; error?: string }> {
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
