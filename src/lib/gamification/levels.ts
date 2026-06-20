/**
 * Level thresholds for Questify gamification system.
 * Formula: level_n = (n-1)² × 25
 * Level 1 = 0 XP, Level 50 = 62,500 XP (max)
 */

export const MAX_LEVEL = 50;

/**
 * Returns the XP required to reach a given level.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > MAX_LEVEL) return xpForLevel(MAX_LEVEL);
  return (level - 1) * (level - 1) * 25;
}

/**
 * Returns the total XP accumulated from level 1 to given level.
 * Alias for xpForLevel.
 */
export function totalXpForLevel(level: number): number {
  return xpForLevel(level);
}

/**
 * Returns the XP needed to progress from current level to next.
 */
export function xpToNextLevel(currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0;
  return xpForLevel(currentLevel + 1) - xpForLevel(currentLevel);
}

/**
 * Calculate level from total XP.
 */
export function getLevel(totalXp: number): number {
  if (totalXp <= 0) return 1;
  // Reverse formula: level = floor(sqrt(xp / 25)) + 1
  const level = Math.floor(Math.sqrt(totalXp / 25)) + 1;
  return Math.min(level, MAX_LEVEL);
}

/**
 * XP rewards by task priority.
 */
export const XP_REWARDS = {
  p1: 50,
  p2: 30,
  p3: 15,
  p4: 5,
  subtaskMultiplier: 1 / 3,
  planStep: 5,
  planCompleted: 25,
  streakBonus: 10,
} as const;

/**
 * Streak multipliers.
 */
export const STREAK_MULTIPLIERS = {
  normal: 1.0,
  week: 1.5, // > 7 days
  month: 2.0, // > 30 days
} as const;

export function getStreakMultiplier(streak: number): number {
  if (streak > 30) return STREAK_MULTIPLIERS.month;
  if (streak > 7) return STREAK_MULTIPLIERS.week;
  return STREAK_MULTIPLIERS.normal;
}
