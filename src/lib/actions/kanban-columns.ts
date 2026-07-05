"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type KanbanColumn = {
  id: string;
  title: string;
  position: number;
};

export async function getKanbanColumns(): Promise<KanbanColumn[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("kanban_columns")
    .select("id, title, position")
    .eq("user_id", user.id)
    .order("position");

  return (data ?? []) as KanbanColumn[];
}

export async function createKanbanColumn(title: string): Promise<KanbanColumn | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get max position
  const { data: last } = await supabase
    .from("kanban_columns")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const position = (last?.position ?? -1) + 1;

  const { data } = await supabase
    .from("kanban_columns")
    .insert({ user_id: user.id, title, position })
    .select("id, title, position")
    .single();

  revalidatePath("/kanban", "layout");
  return data as KanbanColumn;
}

export async function updateKanbanColumn(id: string, title: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("kanban_columns").update({ title }).eq("id", id);
  revalidatePath("/kanban", "layout");
}

export async function reorderKanbanColumns(ids: string[]): Promise<void> {
  const supabase = await createClient();
  for (let i = 0; i < ids.length; i++) {
    await supabase.from("kanban_columns").update({ position: i }).eq("id", ids[i]);
  }
  revalidatePath("/kanban", "layout");
}

export async function deleteKanbanColumn(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

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
    await supabase.from("tasks").update({ kanban_column_id: fallback.id }).eq("kanban_column_id", id);
  }

  await supabase.from("kanban_columns").delete().eq("id", id);
  revalidatePath("/kanban", "layout");
}
