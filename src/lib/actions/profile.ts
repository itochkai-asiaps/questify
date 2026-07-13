"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { requireUser } from "@/lib/auth/requireUser";

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<{ data?: unknown; error?: string }> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (user.id !== userId) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.data.displayName })
    .eq("id", userId)
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/profile", "layout");
  revalidatePath("/dashboard", "layout");
  return { data };
}

export async function getProfile(userId: string): Promise<{ data?: unknown; error?: string }> {
  const { supabase, user } = await requireUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  if (user.id !== userId) {
    return { error: "Unauthorized" };
  }

  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

  if (error) {
    return { error: error.message };
  }

  return { data };
}
