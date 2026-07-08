"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  CreateTaskInputSchema,
  UpdateTaskInputSchema,
  TaskPriority,
  TaskStatus,
} from "@/types/task";
import { completeTask, checkAndAwardAchievements } from "@/lib/gamification/engine";

const XP_REWARDS: Record<string, number> = {
  p1: 50,
  p2: 30,
  p3: 15,
  p4: 5,
};

export async function createTask(
  formData: FormData,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const rawData = {
    title: formData.get("title") as string,
    description: (formData.get("description") as string) || undefined,
    priority: (formData.get("priority") as string) ?? undefined,
    due_date: (formData.get("due_date") as string) || undefined,
    tags: (formData.get("tags") as string) || undefined,
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  if (tags !== null) rawData.tags = tags;
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
    updateData.xp_reward = XP_REWARDS[updateData.priority as string] ?? 15;
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
  if (wasJustCompleted) {
    const taskPriority = (currentTask?.priority ?? "p3") as TaskPriority;
    try {
      await completeTask(user.id, taskPriority);
      await checkAndAwardAchievements(user.id);
    } catch {
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.rpc("reorder_tasks", { p_task_ids: taskIds });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/tasks", "layout");
  return { success: true };
}

export async function getTasks(
  orderBy: "created_at" | "sort_order" = "sort_order",
): Promise<{
  data?: unknown[];
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
