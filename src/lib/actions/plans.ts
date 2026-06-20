"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import {
  CreatePlanInputSchema,
  UpdatePlanInputSchema,
} from "@/types/plan";

const addPlanItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
});

type PlanProgress = {
  total: number;
  completed: number;
  progress: number; // 0–100
};

function computeProgress(items: { completed: boolean }[]): PlanProgress {
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  return {
    total,
    completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function createPlan(
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
    description: formData.get("description") as string | undefined,
    color: formData.get("color") as string | undefined,
    items: (() => {
      try {
        const raw = formData.get("items");
        return raw ? JSON.parse(raw as string) : [];
      } catch {
        return [];
      }
    })(),
  };

  const parsed = CreatePlanInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title, description, color, items } = parsed.data;

  // Insert plan
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      title,
      description: description ?? null,
      color,
      user_id: user.id,
    })
    .select()
    .single();

  if (planError) {
    return { error: planError.message };
  }

  // Insert items if any
  if (items.length > 0) {
    const planItems = items.map((item, index) => ({
      plan_id: plan.id,
      title: item.title,
      position: index,
    }));

    const { error: itemsError } = await supabase
      .from("plan_items")
      .insert(planItems);

    if (itemsError) {
      // Clean up the plan if items fail
      await supabase.from("plans").delete().eq("id", plan.id);
      return { error: itemsError.message };
    }
  }

  revalidatePath("/plans");
  revalidatePath("/dashboard");
  return { data: plan };
}

export async function updatePlan(
  planId: string,
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
    title: formData.get("title") as string | undefined,
    description: formData.get("description") as string | undefined,
    color: formData.get("color") as string | undefined,
  };

  const parsed = UpdatePlanInputSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title, description, color } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;

  const { data: plan, error } = await supabase
    .from("plans")
    .update(updateData)
    .eq("id", planId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
  return { data: plan };
}

export async function deletePlan(
  planId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("id", planId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plans");
  revalidatePath("/dashboard");
  return {};
}

export async function getPlans(): Promise<{
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

  const { data: plans, error } = await supabase
    .from("plans")
    .select("*, items:plan_items(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  const data = (plans ?? []).map((plan) => {
    const items = (plan.items ?? []) as { completed: boolean }[];
    const progress = computeProgress(items);
    return { ...plan, ...progress };
  });

  return { data };
}

export async function getPlanById(
  planId: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: plan, error } = await supabase
    .from("plans")
    .select("*, items:plan_items(*)")
    .eq("id", planId)
    .single();

  if (error) {
    return { error: error.message };
  }

  const items = (plan.items ?? []) as { completed: boolean }[];
  const progress = computeProgress(items);

  return { data: { ...plan, ...progress } };
}

export async function addPlanItem(
  planId: string,
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
  };

  const parsed = addPlanItemSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title } = parsed.data;

  // Get max position for this plan
  const { data: maxPosResult } = await supabase
    .from("plan_items")
    .select("position")
    .eq("plan_id", planId)
    .order("position", { ascending: false })
    .limit(1);

  const maxPosition =
    maxPosResult && maxPosResult.length > 0 ? maxPosResult[0].position : -1;
  const position = maxPosition + 1;

  const { data: item, error } = await supabase
    .from("plan_items")
    .insert({
      plan_id: planId,
      title,
      position,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  revalidatePath("/dashboard");
  return { data: item };
}

export async function togglePlanItem(
  itemId: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get current completed state
  const { data: current, error: fetchError } = await supabase
    .from("plan_items")
    .select("completed, plan_id")
    .eq("id", itemId)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const { data: item, error } = await supabase
    .from("plan_items")
    .update({ completed: !current.completed })
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plans");
  revalidatePath(`/plans/${current.plan_id}`);
  revalidatePath("/dashboard");
  return { data: item };
}

export async function deletePlanItem(
  itemId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get plan_id for revalidation
  const { data: item, error: fetchError } = await supabase
    .from("plan_items")
    .select("plan_id")
    .eq("id", itemId)
    .single();

  if (fetchError) {
    return { error: fetchError.message };
  }

  const { error } = await supabase
    .from("plan_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/plans");
  revalidatePath(`/plans/${item.plan_id}`);
  revalidatePath("/dashboard");
  return {};
}
