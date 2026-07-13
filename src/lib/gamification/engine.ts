"use server";

import { z } from "zod/v4";
import { createClient } from "@/lib/supabase/server";
import { TaskPriority } from "@/types/task";
import { getStreakMultiplier, xpForPriority } from "./levels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AwardXpResult {
  newXp: number;
  newLevel: number;
  leveledUp: boolean;
}

export interface CompleteTaskResult {
  xpAwarded: number;
  newTotal: number;
  newLevel: number;
  leveledUp: boolean;
  streak: number;
}

export interface AchievementDefinition {
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
}

export interface AchievementWithStatus {
  slug: string;
  title: string;
  description: string;
  iconUrl: string | null;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface UserStatsRow {
  id: string;
  userId: string;
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  tasksCompleted: number;
  plansCompleted: number;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Hardcoded achievement definitions
// ---------------------------------------------------------------------------

// ⚠️ NOTE: These XP values duplicate the xp_reward column in the database achievements table.
// The SQL seed (00002_plans_completed_rpc.sql) may have different values.
// checkAndAwardAchievements uses these TS values for awarding XP — the DB column is for display only.
// TODO: Single source of truth — either query DB or align both.
const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    slug: "first_task",
    title: "First Task",
    description: "Complete your first task",
    iconUrl: null,
    xpReward: 10, // SQL has 25 — divergence, TS used for awards
  },
  {
    slug: "getting_started",
    title: "Getting Started",
    description: "Complete 10 tasks",
    iconUrl: null,
    xpReward: 25, // SQL has 50 — divergence, TS used for awards
  },
  {
    slug: "hard_worker",
    title: "Hard Worker",
    description: "Complete 50 tasks",
    iconUrl: null,
    xpReward: 50, // SQL has 100 — divergence, TS used for awards
  },
  {
    slug: "week_warrior",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    iconUrl: null,
    xpReward: 30, // SQL has 75 — divergence, TS used for awards
  },
  {
    slug: "monthly_master",
    title: "Monthly Master",
    description: "Maintain a 30-day streak",
    iconUrl: null,
    xpReward: 100, // SQL has 200 — divergence, TS used for awards
  },
  {
    slug: "perfect_day",
    title: "Perfect Day",
    description: "Complete 10 tasks in a single day",
    iconUrl: null,
    xpReward: 40, // SQL has 50 — divergence, TS used for awards
  },
  {
    slug: "planner",
    title: "Planner",
    description: "Complete 5 plans",
    iconUrl: null,
    xpReward: 25, // SQL has 100 — divergence, TS used for awards
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// (xpForPriority is in levels.ts)

// ---------------------------------------------------------------------------
// awardXp
// ---------------------------------------------------------------------------

export async function awardXp(userId: string, amount: number): Promise<AwardXpResult> {
  const supabase = await createClient();

  const { error: incError } = await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (incError) {
    throw new Error(`Failed to increment XP: ${incError.message}`);
  }

  const { data: newLevel, error: levelError } = await supabase.rpc("check_level_up", {
    p_user_id: userId,
  });

  if (levelError) {
    throw new Error(`Failed to check level up: ${levelError.message}`);
  }

  // Fetch updated stats to return
  const { data: stats, error: statsError } = await supabase
    .from("user_stats")
    .select("total_xp, level")
    .eq("user_id", userId)
    .single();

  if (statsError || !stats) {
    throw new Error(`Failed to fetch updated stats: ${statsError?.message}`);
  }

  return {
    newXp: stats.total_xp,
    newLevel: stats.level,
    leveledUp: stats.level > (newLevel ?? stats.level) - 1, // check_level_up returns the new level
  };
}

// ---------------------------------------------------------------------------
// completeTask
// ---------------------------------------------------------------------------

export async function completeTask(
  userId: string,
  priority: TaskPriority,
): Promise<CompleteTaskResult> {
  const supabase = await createClient();

  // Fetch current streak for multiplier
  const { data: stats, error: statsError } = await supabase
    .from("user_stats")
    .select("current_streak, total_xp, level")
    .eq("user_id", userId)
    .single();

  if (statsError || !stats) {
    throw new Error(`Failed to fetch user stats: ${statsError?.message}`);
  }

  const baseXp = xpForPriority(priority);
  const multiplier = getStreakMultiplier(stats.current_streak);
  const xpAwarded = Math.round(baseXp * multiplier);

  // Award XP and check level up
  const { newXp, newLevel, leveledUp } = await awardXp(userId, xpAwarded);

  // Update streak
  const { data: newStreak, error: streakError } = await supabase.rpc("update_streak", {
    p_user_id: userId,
  });

  if (streakError) {
    throw new Error(`Failed to update streak: ${streakError.message}`);
  }

  return {
    xpAwarded,
    newTotal: newXp,
    newLevel,
    leveledUp,
    streak: newStreak,
  };
}

// ---------------------------------------------------------------------------
// checkAndAwardAchievements
// ---------------------------------------------------------------------------

export async function checkAndAwardAchievements(userId: string): Promise<string[]> {
  const supabase = await createClient();

  // Fetch user stats
  const { data: stats, error: statsError } = await supabase
    .from("user_stats")
    .select("tasks_completed, current_streak, longest_streak, plans_completed")
    .eq("user_id", userId)
    .single();

  if (statsError || !stats) {
    throw new Error(`Failed to fetch user stats: ${statsError?.message}`);
  }

  // Check perfect_day: count tasks completed today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { count: todayCount, error: todayError } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "done")
    .gte("updated_at", todayStart.toISOString())
    .lte("updated_at", todayEnd.toISOString());

  if (todayError) {
    throw new Error(`Failed to count today's tasks: ${todayError.message}`);
  }

  // Determine which achievements the user qualifies for
  const qualifyingSlugs: string[] = [];

  if (stats.tasks_completed >= 1) qualifyingSlugs.push("first_task");
  if (stats.tasks_completed >= 10) qualifyingSlugs.push("getting_started");
  if (stats.tasks_completed >= 50) qualifyingSlugs.push("hard_worker");
  if (stats.longest_streak >= 7) qualifyingSlugs.push("week_warrior");
  if (stats.longest_streak >= 30) qualifyingSlugs.push("monthly_master");
  if ((todayCount ?? 0) >= 10) qualifyingSlugs.push("perfect_day");
  if (stats.plans_completed >= 5) qualifyingSlugs.push("planner");

  if (qualifyingSlugs.length === 0) return [];

  // Fetch achievement IDs for qualifying slugs
  const { data: achievements, error: achError } = await supabase
    .from("achievements")
    .select("id, slug")
    .in("slug", qualifyingSlugs);

  if (achError || !achievements) {
    throw new Error(`Failed to fetch achievements: ${achError?.message}`);
  }

  // Fetch already-unlocked achievement slugs for this user
  const { data: existing, error: existingError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (existingError) {
    throw new Error(`Failed to fetch existing achievements: ${existingError.message}`);
  }

  const existingIds = new Set(existing.map((e) => e.achievement_id));

  // Filter to only new achievements
  const newAchievements = achievements.filter((a) => !existingIds.has(a.id));

  if (newAchievements.length === 0) return [];

  // Insert new achievements
  const inserts = newAchievements.map((a) => ({
    user_id: userId,
    achievement_id: a.id,
  }));

  const { error: insertError } = await supabase.from("user_achievements").insert(inserts);

  if (insertError) {
    throw new Error(`Failed to insert achievements: ${insertError.message}`);
  }

  // Award XP for each new achievement
  for (const achievement of newAchievements) {
    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.slug === achievement.slug);
    if (def && def.xpReward > 0) {
      await awardXp(userId, def.xpReward);
    }
  }

  return newAchievements.map((a) => a.slug);
}

// ---------------------------------------------------------------------------
// getAchievements
// ---------------------------------------------------------------------------

export async function getAchievements(userId: string): Promise<AchievementWithStatus[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("achievements")
    .select(
      `
      slug,
      title,
      description,
      icon_url,
      xp_reward,
      user_achievements!left (
        unlocked_at,
        user_id
      )
    `,
    )
    .order("slug");

  if (error) {
    throw new Error(`Failed to fetch achievements: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const ua =
      (
        row.user_achievements as Array<{
          unlocked_at: string;
          user_id: string;
        }> | null
      )?.filter((ua) => ua.user_id === userId) ?? [];

    return {
      slug: row.slug,
      title: row.title,
      description: row.description ?? "",
      iconUrl: row.icon_url,
      xpReward: row.xp_reward,
      unlocked: ua.length > 0,
      unlockedAt: ua.length > 0 ? ua[0].unlocked_at : null,
    };
  });
}

// ---------------------------------------------------------------------------
// getOrCreateUserStats
// ---------------------------------------------------------------------------

export async function getOrCreateUserStats(userId: string): Promise<UserStatsRow> {
  const supabase = await createClient();

  const { data } = await supabase.from("user_stats").select("*").eq("user_id", userId).single();

  if (data) {
    const parsed = UserStatsSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Failed to parse user stats: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  // Create if missing
  const { data: inserted, error: insertError } = await supabase
    .from("user_stats")
    .insert({ user_id: userId })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create user stats: ${insertError?.message}`);
  }

  const parsedInserted = UserStatsSchema.safeParse(inserted);
  if (!parsedInserted.success) {
    throw new Error(`Failed to parse inserted user stats: ${parsedInserted.error.message}`);
  }
  return parsedInserted.data;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const UserStatsSchema = z
  .object({
    id: z.string().uuid(),
    user_id: z.string().uuid(),
    total_xp: z.number(),
    level: z.number(),
    current_streak: z.number(),
    longest_streak: z.number(),
    last_completed_date: z.string().nullable(),
    tasks_completed: z.number(),
    plans_completed: z.number(),
    updated_at: z.string(),
  })
  .transform((data) => ({
    id: data.id,
    userId: data.user_id,
    totalXp: data.total_xp,
    level: data.level,
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    lastCompletedDate: data.last_completed_date,
    tasksCompleted: data.tasks_completed,
    plansCompleted: data.plans_completed,
    updatedAt: data.updated_at,
  }));
