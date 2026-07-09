"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { CreateWellbeingEntrySchema, WellbeingEntrySchema } from "@/types/wellbeing";
import type { WellbeingEntry } from "@/types/wellbeing";

const MAX_ENTRIES_PER_DAY = 48;

export async function createWellbeingEntry(
  moodScore: number,
  note?: string,
): Promise<{ data?: WellbeingEntry; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateWellbeingEntrySchema.safeParse({ mood_score: moodScore, note });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Check 48/day cap (24h sliding window — timezone-agnostic)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("wellbeing_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", twentyFourHoursAgo);

  if (countError) return { error: countError.message };
  if (count !== null && count >= MAX_ENTRIES_PER_DAY) {
    return { error: `Limit reached: ${MAX_ENTRIES_PER_DAY} entries per day` };
  }

  // Always insert — no UPSERT
  const { data, error } = await supabase
    .from("wellbeing_entries")
    .insert({ user_id: user.id, mood_score: moodScore, note: note ?? null })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard", "layout");
  return { data: WellbeingEntrySchema.parse(data) };
}

export async function getTodaysLatestEntry(): Promise<{
  data?: WellbeingEntry | null;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  // 24h sliding window — timezone-agnostic (avoids UTC vs local date mismatch)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("wellbeing_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", twentyFourHoursAgo)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: WellbeingEntrySchema.nullable().parse(data) };
}

export async function getWellbeingHistory(
  days: number = 7,
): Promise<{ data?: WellbeingEntry[]; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const { data, error } = await supabase
    .from("wellbeing_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", sinceStr)
    .order("created_at", { ascending: true });

  if (error) return { error: error.message };
  return { data: z.array(WellbeingEntrySchema).parse(data ?? []) };
}
