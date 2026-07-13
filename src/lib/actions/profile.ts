"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { withAuth } from "@/lib/auth/withAuth";

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(100),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateProfile = withAuth(
  async (
    { supabase, user },
    userId: string,
    input: UpdateProfileInput,
  ): Promise<{ data?: unknown; error?: string }> => {
    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
      return { error: firstError };
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
  },
);

export const getProfile = withAuth(
  async ({ supabase, user }, userId: string): Promise<{ data?: unknown; error?: string }> => {
    if (user.id !== userId) {
      return { error: "Unauthorized" };
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();

    if (error) {
      return { error: error.message };
    }

    return { data };
  },
);
