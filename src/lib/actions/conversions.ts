"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Convert an idea to a task. Deletes the idea after creation.
 */
export async function convertIdeaToTask(
  ideaId: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("title, description")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !idea) return { error: "Idea not found" };

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: idea.title.slice(0, 200),
      description: (idea.description ?? "").slice(0, 2000) || null,
      priority: "p3",
      status: "todo",
      xp_reward: 15,
    })
    .select()
    .single();

  if (taskError) return { error: taskError.message };

  await supabase.from("ideas").delete().eq("id", ideaId).eq("user_id", user.id);

  revalidatePath("/ideas", "layout");
  revalidatePath("/tasks", "layout");
  revalidatePath("/dashboard", "layout");
  return { data: task };
}

/**
 * Convert an idea to a plan. Deletes the idea after creation.
 */
export async function convertIdeaToPlan(
  ideaId: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: idea, error: fetchError } = await supabase
    .from("ideas")
    .select("title, description")
    .eq("id", ideaId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !idea) return { error: "Idea not found" };

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      user_id: user.id,
      title: idea.title.slice(0, 200),
      description: (idea.description ?? "").slice(0, 2000) || null,
    })
    .select()
    .single();

  if (planError) return { error: planError.message };

  await supabase.from("ideas").delete().eq("id", ideaId).eq("user_id", user.id);

  revalidatePath("/ideas", "layout");
  revalidatePath("/plans", "layout");
  revalidatePath("/dashboard", "layout");
  return { data: plan };
}

/**
 * Convert a plan item to a task. Deletes the plan item after creation.
 */
export async function convertPlanItemToTask(
  itemId: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: item, error: fetchError } = await supabase
    .from("plan_items")
    .select("title, plan_id")
    .eq("id", itemId)
    .single();

  if (fetchError || !item) return { error: "Plan item not found" };

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .insert({
      user_id: user.id,
      title: item.title.slice(0, 200),
      priority: "p3",
      status: "todo",
      xp_reward: 15,
    })
    .select()
    .single();

  if (taskError) return { error: taskError.message };

  await supabase.from("plan_items").delete().eq("id", itemId);

  revalidatePath("/tasks", "layout");
  revalidatePath("/plans", "layout");
  revalidatePath(`/plans/${item.plan_id}`, "layout");
  revalidatePath("/dashboard", "layout");
  return { data: task };
}
