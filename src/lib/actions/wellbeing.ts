"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CreateWellbeingEntrySchema } from "@/types/wellbeing";
import type { WellbeingEntry } from "@/types/wellbeing";

export async function createWellbeingEntry(
  moodScore: number,
  note?: string,
): Promise<{ data?: WellbeingEntry; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const parsed = CreateWellbeingEntrySchema.safeParse({ mood_score: moodScore, note });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // UPSERT: one entry per user per day
  const today = new Date().toISOString().split("T")[0];
  const startOfDay = `${today}T00:00:00Z`;
  const endOfDay = `${today}T23:59:59Z`;

  // Check if entry already exists today
  const { data: existing } = await supabase
    .from("wellbeing_entries")
    .select("id")
    .eq("user_id", user.id)
    .gte("created_at", startOfDay)
    .lte("created_at", endOfDay)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("wellbeing_entries")
      .update({ mood_score: moodScore, note: note ?? null })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { data: data as WellbeingEntry };
  }

  const { data, error } = await supabase
    .from("wellbeing_entries")
    .insert({ user_id: user.id, mood_score: moodScore, note: note ?? null })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { data: data as WellbeingEntry };
}

export async function getTodaysEntry(): Promise<{
  data?: WellbeingEntry | null;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const today = new Date().toISOString().split("T")[0];
  const { data, error } = await supabase
    .from("wellbeing_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00Z`)
    .lte("created_at", `${today}T23:59:59Z`)
    .maybeSingle();

  if (error) return { error: error.message };
  return { data: data as WellbeingEntry | null };
}

export async function getWellbeingHistory(
  days: number = 7,
): Promise<{ data?: WellbeingEntry[]; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  return { data: (data ?? []) as WellbeingEntry[] };
}
