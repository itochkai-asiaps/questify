"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { withAuth } from "@/lib/auth/withAuth";

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

export const getKanbanColumns = withAuth(
  async ({ supabase, user }): Promise<{ data?: KanbanColumn[]; error?: string }> => {
    const { data } = await supabase
      .from("kanban_columns")
      .select("id, title, position")
      .eq("user_id", user.id)
      .order("position");

    const parsed = KanbanColumnSchema.array().safeParse(data ?? []);
    if (!parsed.success) {
      console.error("getKanbanColumns: schema mismatch", parsed.error);
      return { data: [] };
    }
    return { data: parsed.data };
  },
);

export const createKanbanColumn = withAuth(
  async ({ supabase, user }, title: string): Promise<{ data?: KanbanColumn; error?: string }> => {
    const parsed = createKanbanColumnSchema.safeParse({ title });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid title" };
    }

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
    const parsedCol = KanbanColumnSchema.safeParse(data);
    if (!parsedCol.success) {
      console.error("createKanbanColumn: schema mismatch", parsedCol.error);
      return { error: "Invalid data returned from server" };
    }
    return { data: parsedCol.data };
  },
);

export const updateKanbanColumn = withAuth(
  async (
    { supabase },
    id: string,
    title: string,
  ): Promise<{ data?: KanbanColumn; error?: string }> => {
    const parsed = createKanbanColumnSchema.safeParse({ title });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid title" };
    }

    try {
      const { data, error } = await supabase
        .from("kanban_columns")
        .update({ title: parsed.data.title })
        .eq("id", id)
        .select("id, title, position")
        .single();

      if (error) return { error: error.message };

      revalidatePath("/kanban", "layout");
      const parsedCol = KanbanColumnSchema.safeParse(data);
      if (!parsedCol.success) {
        console.error("updateKanbanColumn: schema mismatch", parsedCol.error);
        return { error: "Invalid data returned from server" };
      }
      return { data: parsedCol.data };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Failed to update column" };
    }
  },
);

export const reorderKanbanColumns = withAuth(
  async ({ supabase }, ids: string[]): Promise<{ success: boolean; error?: string }> => {
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase
        .from("kanban_columns")
        .update({ position: i })
        .eq("id", ids[i]);
      if (error) return { success: false, error: error.message };
    }

    revalidatePath("/kanban", "layout");
    return { success: true };
  },
);

export const deleteKanbanColumn = withAuth(
  async ({ supabase, user }, id: string): Promise<{ success: boolean; error?: string }> => {
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
    return { success: true };
  },
);
