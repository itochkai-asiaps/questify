"use server";

import { revalidatePath } from "next/cache";
import { withAuth } from "@/lib/auth/withAuth";
import { CreateTaskInputSchema } from "@/types/task";
import { CreatePlanInputSchema } from "@/types/plan";
import { XP_REWARDS } from "@/lib/gamification/levels";

/**
 * Convert an idea to a task. Deletes the idea after creation.
 * @note INSERT + DELETE are not transactional — if DELETE fails, duplicate may exist.
 */
export const convertIdeaToTask = withAuth(
  async ({ supabase, user }, ideaId: string): Promise<{ data?: unknown; error?: string }> => {
    const { data: idea, error: fetchError } = await supabase
      .from("ideas")
      .select("title, description")
      .eq("id", ideaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !idea) return { error: "Idea not found" };

    const taskInput = {
      title: idea.title.slice(0, 200),
      description: (idea.description ?? "").slice(0, 2000) || undefined,
      priority: "p3" as const,
    };

    const parsed = CreateTaskInputSchema.safeParse(taskInput);
    if (!parsed.success) {
      return { error: `Validation failed: ${parsed.error.message}` };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: "todo",
        xp_reward: XP_REWARDS[parsed.data.priority],
      })
      .select()
      .single();

    if (taskError) return { error: taskError.message };

    // @note Not transactional — if this DELETE fails, a duplicate may exist
    await supabase.from("ideas").delete().eq("id", ideaId).eq("user_id", user.id);

    revalidatePath("/ideas", "layout");
    revalidatePath("/tasks", "layout");
    revalidatePath("/dashboard", "layout");
    return { data: task };
  },
);

/**
 * Convert an idea to a plan. Deletes the idea after creation.
 * @note INSERT + DELETE are not transactional — if DELETE fails, duplicate may exist.
 */
export const convertIdeaToPlan = withAuth(
  async ({ supabase, user }, ideaId: string): Promise<{ data?: unknown; error?: string }> => {
    const { data: idea, error: fetchError } = await supabase
      .from("ideas")
      .select("title, description")
      .eq("id", ideaId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !idea) return { error: "Idea not found" };

    const planInput = {
      title: idea.title.slice(0, 200),
      description: (idea.description ?? "").slice(0, 2000) || undefined,
    };

    const parsed = CreatePlanInputSchema.safeParse(planInput);
    if (!parsed.success) {
      return { error: `Validation failed: ${parsed.error.message}` };
    }

    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
      })
      .select()
      .single();

    if (planError) return { error: planError.message };

    // @note Not transactional — if this DELETE fails, a duplicate may exist
    await supabase.from("ideas").delete().eq("id", ideaId).eq("user_id", user.id);

    revalidatePath("/ideas", "layout");
    revalidatePath("/plans", "layout");
    revalidatePath("/dashboard", "layout");
    return { data: plan };
  },
);

/**
 * Convert a plan item to a task. Deletes the plan item after creation.
 * @note INSERT + DELETE are not transactional — if DELETE fails, duplicate may exist.
 */
export const convertPlanItemToTask = withAuth(
  async ({ supabase, user }, itemId: string): Promise<{ data?: unknown; error?: string }> => {
    const { data: item, error: fetchError } = await supabase
      .from("plan_items")
      .select("title, description, plan_id")
      .eq("id", itemId)
      .single();

    if (fetchError || !item) return { error: "Plan item not found" };

    const taskInput = {
      title: item.title.slice(0, 200),
      description: (item.description ?? "").slice(0, 2000) || undefined,
      priority: "p3" as const,
    };

    const parsed = CreateTaskInputSchema.safeParse(taskInput);
    if (!parsed.success) {
      return { error: `Validation failed: ${parsed.error.message}` };
    }

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        status: "todo",
        xp_reward: XP_REWARDS[parsed.data.priority],
      })
      .select()
      .single();

    if (taskError) return { error: taskError.message };

    // @note Not transactional — if this DELETE fails, a duplicate may exist
    await supabase.from("plan_items").delete().eq("id", itemId);

    revalidatePath("/tasks", "layout");
    revalidatePath("/plans", "layout");
    revalidatePath(`/plans/${item.plan_id}`, "layout");
    revalidatePath("/dashboard", "layout");
    return { data: task };
  },
);
