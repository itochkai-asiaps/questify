"use server";

import { z } from "zod/v4";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { CreateWellbeingEntrySchema, WellbeingEntrySchema } from "@/types/wellbeing";
import type { WellbeingEntry } from "@/types/wellbeing";

const MAX_ENTRIES_PER_DAY = 48;

/** UTC midnight of today — calendar day reset, server time */
function getTodayStartUTC(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

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

  // Check 48/day cap (calendar day — resets at 00:00 UTC)
  const todayStart = getTodayStartUTC();
  const { count, error: countError } = await supabase
    .from("wellbeing_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", todayStart);

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
  const entryParsed = WellbeingEntrySchema.safeParse(data);
  if (!entryParsed.success) return { error: entryParsed.error.issues[0]?.message ?? "Invalid entry data" };
  revalidatePath("/dashboard", "layout");
  return { data: entryParsed.data };
}

export async function getTodaysLatestEntry(): Promise<{
  data?: WellbeingEntry | null;
  error?: string;
}> {
  const { supabase, user } = await requireUser();
  if (!user) return { error: "Not authenticated" };

  // Calendar day — resets at 00:00 UTC (server time)
  const todayStart = getTodayStartUTC();
  const { data, error } = await supabase
    .from("wellbeing_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", todayStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { error: error.message };
  const parsed = WellbeingEntrySchema.nullable().safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid entry data" };
  return { data: parsed.data };
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
  const parsed = z.array(WellbeingEntrySchema).safeParse(data ?? []);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid history data" };
  return { data: parsed.data };
}
