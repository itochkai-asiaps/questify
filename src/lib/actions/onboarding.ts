"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { createClient } from "@/lib/supabase/server";
import { TaskPriority } from "@/types/task";

const onboardingSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  avatarColor: z.string().min(1),
  goal: z.string().optional(),
  taskTitle: z.string().max(200).optional(),
  taskPriority: z.nativeEnum(TaskPriority).optional(),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

export async function completeOnboarding(
  data: OnboardingData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Invalid input";
    return { error: firstError };
  }

  const { displayName, avatarColor, taskTitle, taskPriority } = parsed.data;

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarColor,
    })
    .eq("id", user.id);

  if (profileError) {
    return { error: profileError.message };
  }

  if (taskTitle) {
    const { error: taskError } = await supabase.from("tasks").insert({
      title: taskTitle,
      priority: taskPriority ?? TaskPriority.P3,
      user_id: user.id,
      status: "todo",
    });

    if (taskError) {
      return { error: taskError.message };
    }
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
