"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { requireUser } from "@/lib/auth/requireUser";

export type KanbanColumn = {
  id: string;
  title: string;
  position: number;
};

const KanbanColumnSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  position: z.number(),
});

const createKanbanColumnSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function getKanbanColumns(): Promise<KanbanColumn[]> {
  const { supabase, user } = await requireUser();
  if (!user) return [];

  const { data } = await supabase
    .from("kanban_columns")
    .select("id, title, position")
    .eq("user_id", user.id)
    .order("position");

  return KanbanColumnSchema.array().parse(data ?? []);
}

export async function createKanbanColumn(
  title: string,
): Promise<{ data?: KanbanColumn; error?: string }> {
  const parsed = createKanbanColumnSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid title" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  // Get max position
  const { data: last } = await supabase
    .from("kanban_columns")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { data, error } = await supabase
    .from("kanban_columns")
    .insert({ user_id: user.id, title: parsed.data.title, position })
    .select("id, title, position")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/kanban", "layout");
  return { data: KanbanColumnSchema.parse(data) };
}

export async function updateKanbanColumn(
  id: string,
  title: string,
): Promise<{ data?: KanbanColumn; error?: string }> {
  const parsed = createKanbanColumnSchema.safeParse({ title });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid title" };
  }

  try {
    const { supabase, user } = await requireUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("kanban_columns")
      .update({ title: parsed.data.title })
      .eq("id", id)
      .select("id, title, position")
      .single();

    if (error) return { error: error.message };

    revalidatePath("/kanban", "layout");
    return { data: KanbanColumnSchema.parse(data) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to update column" };
  }
}

export async function reorderKanbanColumns(
  ids: string[],
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  for (let i = 0; i < ids.length; i++) {
    const { error } = await supabase
      .from("kanban_columns")
      .update({ position: i })
      .eq("id", ids[i]);
    if (error) return { error: error.message };
  }

  revalidatePath("/kanban", "layout");
  return {};
}

export async function deleteKanbanColumn(
  id: string,
): Promise<{ error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  // Get first column as fallback
  const { data: fallback } = await supabase
    .from("kanban_columns")
    .select("id")
    .eq("user_id", user.id)
    .neq("id", id)
    .order("position")
    .limit(1)
    .single();

  if (fallback) {
    // Move tasks to fallback column
    await supabase
      .from("tasks")
      .update({ kanban_column_id: fallback.id })
      .eq("kanban_column_id", id);
  }

  await supabase.from("kanban_columns").delete().eq("id", id);
  revalidatePath("/kanban", "layout");
  return {};
}
