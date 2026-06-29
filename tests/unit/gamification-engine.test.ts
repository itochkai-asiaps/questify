import { describe, it, expect } from "vitest";
import {
  getLevel,
  getStreakMultiplier,
  XP_REWARDS,
  xpForPriority,
} from "@/lib/gamification/levels";
import { TaskPriority } from "@/types/task";

// ---------------------------------------------------------------------------
// xpForPriority — base XP by task priority
// ---------------------------------------------------------------------------

describe("xpForPriority", () => {
  it("returns 50 for P1 (urgent)", () => {
    expect(xpForPriority(TaskPriority.P1)).toBe(50);
  });

  it("returns 30 for P2 (high)", () => {
    expect(xpForPriority(TaskPriority.P2)).toBe(30);
  });

  it("returns 15 for P3 (medium)", () => {
    expect(xpForPriority(TaskPriority.P3)).toBe(15);
  });

  it("returns 5 for P4 (low)", () => {
    expect(xpForPriority(TaskPriority.P4)).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// computeTaskXp — pure math: base × multiplier → rounded
// ---------------------------------------------------------------------------

function computeTaskXp(priority: TaskPriority, streak: number): number {
  const baseXp = xpForPriority(priority);
  const multiplier = getStreakMultiplier(streak);
  return Math.round(baseXp * multiplier);
}

describe("computeTaskXp", () => {
  it("P1 with no streak bonus", () => {
    expect(computeTaskXp(TaskPriority.P1, 0)).toBe(50); // 50 × 1.0
    expect(computeTaskXp(TaskPriority.P1, 7)).toBe(50);
  });

  it("P1 with week streak (×1.5)", () => {
    expect(computeTaskXp(TaskPriority.P1, 8)).toBe(75); // 50 × 1.5
    expect(computeTaskXp(TaskPriority.P1, 30)).toBe(75);
  });

  it("P1 with month streak (×2.0)", () => {
    expect(computeTaskXp(TaskPriority.P1, 31)).toBe(100); // 50 × 2.0
  });

  it("P4 with month streak", () => {
    expect(computeTaskXp(TaskPriority.P4, 365)).toBe(10); // 5 × 2.0
  });

  it("rounds to integer", () => {
    // P3 × 1.5 = 15 × 1.5 = 22.5 → 23
    expect(computeTaskXp(TaskPriority.P3, 10)).toBe(23);
  });
});

// ---------------------------------------------------------------------------
// getLevel after XP gain
// ---------------------------------------------------------------------------

describe("getLevel after XP awards", () => {
  it("planStep XP alone (5) keeps level 1 at 0 starting XP", () => {
    expect(getLevel(0 + XP_REWARDS.planStep)).toBe(1);
  });

  it("planCompleted XP alone (25) reaches level 2", () => {
    expect(getLevel(0 + XP_REWARDS.planCompleted)).toBe(2);
  });

  it("P1 task completion reaches level 2 (50 >= 25)", () => {
    expect(getLevel(0 + 50)).toBe(2);
  });

  it("P4 task with month streak (10 XP) stays level 1", () => {
    expect(getLevel(0 + 10)).toBe(1);
  });

  it("5 planSteps (25) + 1 P1 (50) = 75 → level 2 (not 3, needs 100)", () => {
    const total = XP_REWARDS.planStep * 5 + XP_REWARDS.p1;
    expect(total).toBe(75);
    expect(getLevel(total)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Achievement qualifying slug logic (pure)
// ---------------------------------------------------------------------------

interface Stats {
  tasks_completed: number;
  current_streak: number;
  longest_streak: number;
  plans_completed: number;
  tasks_today: number;
}

function getQualifyingSlugs(stats: Stats): string[] {
  const slugs: string[] = [];

  if (stats.tasks_completed >= 1) slugs.push("first_task");
  if (stats.tasks_completed >= 10) slugs.push("getting_started");
  if (stats.tasks_completed >= 50) slugs.push("hard_worker");
  if (stats.longest_streak >= 7) slugs.push("week_warrior");
  if (stats.longest_streak >= 30) slugs.push("monthly_master");
  if (stats.tasks_today >= 10) slugs.push("perfect_day");
  if (stats.plans_completed >= 5) slugs.push("planner");

  return slugs;
}

const EMPTY_STATS: Stats = {
  tasks_completed: 0,
  current_streak: 0,
  longest_streak: 0,
  plans_completed: 0,
  tasks_today: 0,
};

describe("getQualifyingSlugs (achievement logic)", () => {
  it("returns empty for new user", () => {
    expect(getQualifyingSlugs(EMPTY_STATS)).toEqual([]);
  });

  it("unlocks first_task at 1 task", () => {
    expect(getQualifyingSlugs({ ...EMPTY_STATS, tasks_completed: 1 })).toEqual([
      "first_task",
    ]);
  });

  it("unlocks first_task + getting_started at 10 tasks", () => {
    const slugs = getQualifyingSlugs({ ...EMPTY_STATS, tasks_completed: 10 });
    expect(slugs).toContain("first_task");
    expect(slugs).toContain("getting_started");
  });

  it("unlocks hard_worker at 50 tasks", () => {
    const slugs = getQualifyingSlugs({ ...EMPTY_STATS, tasks_completed: 50 });
    expect(slugs).toContain("hard_worker");
  });

  it("unlocks week_warrior at 7-day streak", () => {
    expect(
      getQualifyingSlugs({ ...EMPTY_STATS, longest_streak: 7 }),
    ).toContain("week_warrior");
  });

  it("unlocks monthly_master at 30-day streak", () => {
    expect(
      getQualifyingSlugs({ ...EMPTY_STATS, longest_streak: 30 }),
    ).toContain("monthly_master");
  });

  it("unlocks perfect_day at 10 tasks today", () => {
    expect(
      getQualifyingSlugs({ ...EMPTY_STATS, tasks_today: 10 }),
    ).toContain("perfect_day");
  });

  it("unlocks planner at 5 plans", () => {
    expect(
      getQualifyingSlugs({ ...EMPTY_STATS, plans_completed: 5 }),
    ).toContain("planner");
  });

  it("unlocks multiple achievements simultaneously", () => {
    const slugs = getQualifyingSlugs({
      tasks_completed: 50,
      current_streak: 7,
      longest_streak: 30,
      plans_completed: 5,
      tasks_today: 10,
    });
    expect(slugs).toHaveLength(7);
    expect(slugs).toContain("first_task");
    expect(slugs).toContain("getting_started");
    expect(slugs).toContain("hard_worker");
    expect(slugs).toContain("week_warrior");
    expect(slugs).toContain("monthly_master");
    expect(slugs).toContain("perfect_day");
    expect(slugs).toContain("planner");
  });
});

// ---------------------------------------------------------------------------
// Streak boundaries (edge cases)
// ---------------------------------------------------------------------------

describe("streak multiplier boundaries", () => {
  it("day 7 → normal (1.0), day 8 → week (1.5)", () => {
    expect(getStreakMultiplier(7)).toBe(1.0);
    expect(getStreakMultiplier(8)).toBe(1.5);
  });

  it("day 30 → week (1.5), day 31 → month (2.0)", () => {
    expect(getStreakMultiplier(30)).toBe(1.5);
    expect(getStreakMultiplier(31)).toBe(2.0);
  });
});

// ---------------------------------------------------------------------------
// planStep + planCompleted edge cases
// ---------------------------------------------------------------------------

describe("plan XP combo", () => {
  it("1 planStep = 5 XP", () => {
    expect(XP_REWARDS.planStep).toBe(5);
  });

  it("1 planCompleted = 25 XP", () => {
    expect(XP_REWARDS.planCompleted).toBe(25);
  });

  it("5 planSteps (25) + planCompleted (25) = 50 → level 2", () => {
    const total = XP_REWARDS.planStep * 5 + XP_REWARDS.planCompleted;
    expect(total).toBe(50);
    expect(getLevel(total)).toBe(2);
  });
});
