"use server";

import { createClient } from "@/lib/supabase/server";
import { TaskPriority } from "@/types/task";
import {
  XP_REWARDS,
  getStreakMultiplier,
  getLevel,
  xpForLevel,
} from "./levels";

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

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    slug: "first_task",
    title: "First Task",
    description: "Complete your first task",
    iconUrl: null,
    xpReward: 10,
  },
  {
    slug: "getting_started",
    title: "Getting Started",
    description: "Complete 10 tasks",
    iconUrl: null,
    xpReward: 25,
  },
  {
    slug: "hard_worker",
    title: "Hard Worker",
    description: "Complete 50 tasks",
    iconUrl: null,
    xpReward: 50,
  },
  {
    slug: "week_warrior",
    title: "Week Warrior",
    description: "Maintain a 7-day streak",
    iconUrl: null,
    xpReward: 30,
  },
  {
    slug: "monthly_master",
    title: "Monthly Master",
    description: "Maintain a 30-day streak",
    iconUrl: null,
    xpReward: 100,
  },
  {
    slug: "perfect_day",
    title: "Perfect Day",
    description: "Complete 10 tasks in a single day",
    iconUrl: null,
    xpReward: 40,
  },
  {
    slug: "planner",
    title: "Planner",
    description: "Complete 5 plans",
    iconUrl: null,
    xpReward: 25,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function xpForPriority(priority: TaskPriority): number {
  switch (priority) {
    case TaskPriority.P1:
      return XP_REWARDS.p1;
    case TaskPriority.P2:
      return XP_REWARDS.p2;
    case TaskPriority.P3:
      return XP_REWARDS.p3;
    case TaskPriority.P4:
      return XP_REWARDS.p4;
  }
}

// ---------------------------------------------------------------------------
// awardXp
// ---------------------------------------------------------------------------

export async function awardXp(
  userId: string,
  amount: number,
): Promise<AwardXpResult> {
  const supabase = await createClient();

  const { error: incError } = await supabase.rpc("increment_xp", {
    p_user_id: userId,
    p_amount: amount,
  });

  if (incError) {
    throw new Error(`Failed to increment XP: ${incError.message}`);
  }

  const { data: newLevel, error: levelError } = await supabase.rpc(
    "check_level_up",
    { p_user_id: userId },
  );

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
  const { data: newStreak, error: streakError } = await supabase.rpc(
    "update_streak",
    { p_user_id: userId },
  );

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

export async function checkAndAwardAchievements(
  userId: string,
): Promise<string[]> {
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
    throw new Error(
      `Failed to count today's tasks: ${todayError.message}`,
    );
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
    throw new Error(
      `Failed to fetch achievements: ${achError?.message}`,
    );
  }

  // Fetch already-unlocked achievement slugs for this user
  const { data: existing, error: existingError } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);

  if (existingError) {
    throw new Error(
      `Failed to fetch existing achievements: ${existingError.message}`,
    );
  }

  const existingIds = new Set(existing.map((e) => e.achievement_id));

  // Filter to only new achievements
  const newAchievements = achievements.filter(
    (a) => !existingIds.has(a.id),
  );

  if (newAchievements.length === 0) return [];

  // Insert new achievements
  const inserts = newAchievements.map((a) => ({
    user_id: userId,
    achievement_id: a.id,
  }));

  const { error: insertError } = await supabase
    .from("user_achievements")
    .insert(inserts);

  if (insertError) {
    throw new Error(
      `Failed to insert achievements: ${insertError.message}`,
    );
  }

  // Award XP for each new achievement
  for (const achievement of newAchievements) {
    const def = ACHIEVEMENT_DEFINITIONS.find(
      (d) => d.slug === achievement.slug,
    );
    if (def && def.xpReward > 0) {
      await awardXp(userId, def.xpReward);
    }
  }

  return newAchievements.map((a) => a.slug);
}

// ---------------------------------------------------------------------------
// getAchievements
// ---------------------------------------------------------------------------

export async function getAchievements(
  userId: string,
): Promise<AchievementWithStatus[]> {
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
    const ua = (row.user_achievements as Array<{
      unlocked_at: string;
      user_id: string;
    }> | null)?.filter((ua) => ua.user_id === userId) ?? [];

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

export async function getOrCreateUserStats(
  userId: string,
): Promise<UserStatsRow> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (data) {
    return mapStatsRow(data);
  }

  // Create if missing
  const { data: inserted, error: insertError } = await supabase
    .from("user_stats")
    .insert({ user_id: userId })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(
      `Failed to create user stats: ${insertError?.message}`,
    );
  }

  return mapStatsRow(inserted);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function mapStatsRow(row: Record<string, unknown>): UserStatsRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    totalXp: row.total_xp as number,
    level: row.level as number,
    currentStreak: row.current_streak as number,
    longestStreak: row.longest_streak as number,
    lastCompletedDate: (row.last_completed_date as string) ?? null,
    tasksCompleted: row.tasks_completed as number,
    plansCompleted: row.plans_completed as number,
    updatedAt: row.updated_at as string,
  };
}
