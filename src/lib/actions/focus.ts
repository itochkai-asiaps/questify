"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";

const TaskTitleSchema = z.object({ title: z.string() });

const SetFocusResultSchema = z.object({ task_id: z.string().uuid() });

export async function getFocusTask(): Promise<{
  data?: { task_id: string; task_title?: string } | null;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data: focus, error } = await supabase
    .from("focus_tasks")
    .select("task_id, tasks!inner(title)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!focus) return { data: null };

  // Extract title from nested join result
  const taskObj = Array.isArray(focus.tasks) ? focus.tasks[0] : focus.tasks;
  const titleParsed = TaskTitleSchema.safeParse(taskObj);
  const taskTitle = titleParsed.success ? titleParsed.data.title : "Untitled";

  return { data: { task_id: focus.task_id, task_title: taskTitle } };
}

export async function setFocusTask(
  taskId: string,
): Promise<{ data?: { task_id: string }; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("focus_tasks")
    .upsert({ user_id: user.id, task_id: taskId }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  const parsedFocus = SetFocusResultSchema.safeParse(data);
  if (!parsedFocus.success) {
    console.error("setFocusTask: schema mismatch", parsedFocus.error);
    return { error: "Invalid data returned from server" };
  }
  return { data: parsedFocus.data };
}

export async function clearFocusTask(): Promise<{
  success: boolean;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated", success: false };

  const { error } = await supabase.from("focus_tasks").delete().eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
