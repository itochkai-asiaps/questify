"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";

const createIdeaSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().max(5000).optional(),
  source: z.enum(["web", "telegram"]).default("web"),
});

export async function createIdea(
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
    source: (formData.get("source") as string) || "web",
  };

  const parsed = createIdeaSchema.safeParse(rawData);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { title, description, source } = parsed.data;

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: user.id,
      title,
      description: description || null,
      source,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/ideas", "layout");
  return { data };
}

export async function deleteIdea(
  ideaId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("ideas")
    .delete()
    .eq("id", ideaId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/ideas", "layout");
  return { success: true };
}

export async function getIdeas(): Promise<{ data?: unknown[]; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("ideas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Create an idea from Telegram bot message.
 * Called by the telegram webhook route handler.
 */
export async function createIdeaFromTelegram(
  userId: string,
  text: string,
): Promise<{ data?: unknown; error?: string }> {
  const supabase = await createClient();

  const lines = text.trim().split("\n");
  const title = lines[0].slice(0, 500);
  const description = lines.slice(1).join("\n").slice(0, 5000) || null;

  const { data, error } = await supabase
    .from("ideas")
    .insert({
      user_id: userId,
      title,
      description,
      source: "telegram",
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}

/**
 * Find user_id by Telegram chat ID mapping.
 * Simple approach: store mapping in user_metadata or a separate table.
 * For MVP, we use a hardcoded mapping. Phase 2: proper auth linking.
 */
export async function getUserIdByTelegramChatId(
  chatId: number,
): Promise<string | null> {
  const supabase = await createClient();

  // For MVP: check profiles with telegram_chat_id in raw_user_meta_data
  // We'll use a simpler approach — read from a telegram_chats table
  const { data } = await supabase
    .from("telegram_chats")
    .select("user_id")
    .eq("chat_id", chatId)
    .single();

  return data?.user_id ?? null;
}

export async function linkTelegramChat(
  userId: string,
  chatId: number,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("telegram_chats")
    .upsert({ user_id: userId, chat_id: chatId, linked_at: new Date().toISOString() });

  if (error) {
    return { error: error.message };
  }

  return {};
}
