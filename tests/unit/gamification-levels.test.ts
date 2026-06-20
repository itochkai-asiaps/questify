import { describe, it, expect } from "vitest";
import {
  MAX_LEVEL,
  xpForLevel,
  totalXpForLevel,
  xpToNextLevel,
  getLevel,
  XP_REWARDS,
  STREAK_MULTIPLIERS,
  getStreakMultiplier,
} from "@/lib/gamification/levels";

describe("xpForLevel", () => {
  it("returns 0 for level 1", () => {
    expect(xpForLevel(1)).toBe(0);
  });

  it("returns 0 for level <= 1", () => {
    expect(xpForLevel(0)).toBe(0);
    expect(xpForLevel(-5)).toBe(0);
  });

  it("follows formula (n-1)² × 25", () => {
    expect(xpForLevel(2)).toBe(25); // 1² × 25
    expect(xpForLevel(3)).toBe(100); // 2² × 25
    expect(xpForLevel(4)).toBe(225); // 3² × 25
    expect(xpForLevel(5)).toBe(400); // 4² × 25
  });

  it("caps at MAX_LEVEL (50)", () => {
    expect(xpForLevel(50)).toBe(49 * 49 * 25); // 60025
    expect(xpForLevel(51)).toBe(xpForLevel(MAX_LEVEL));
    expect(xpForLevel(100)).toBe(xpForLevel(MAX_LEVEL));
  });
});

describe("totalXpForLevel", () => {
  it("is alias for xpForLevel", () => {
    expect(totalXpForLevel(5)).toBe(xpForLevel(5));
    expect(totalXpForLevel(1)).toBe(0);
  });
});

describe("xpToNextLevel", () => {
  it("returns XP gap between current and next level", () => {
    expect(xpToNextLevel(1)).toBe(25); // level 2 needs 25, level 1 is 0 → 25
    expect(xpToNextLevel(2)).toBe(75); // 100 - 25
    expect(xpToNextLevel(3)).toBe(125); // 225 - 100
  });

  it("returns 0 at max level", () => {
    expect(xpToNextLevel(MAX_LEVEL)).toBe(0);
    expect(xpToNextLevel(MAX_LEVEL + 1)).toBe(0);
  });
});

describe("getLevel", () => {
  it("returns 1 for 0 or negative XP", () => {
    expect(getLevel(0)).toBe(1);
    expect(getLevel(-100)).toBe(1);
  });

  it("returns correct level for known thresholds", () => {
    expect(getLevel(0)).toBe(1);
    expect(getLevel(24)).toBe(1); // still below 25
    expect(getLevel(25)).toBe(2); // just hit level 2
    expect(getLevel(99)).toBe(2);
    expect(getLevel(100)).toBe(3); // level 3
    expect(getLevel(224)).toBe(3);
    expect(getLevel(225)).toBe(4); // level 4
  });

  it("caps at MAX_LEVEL (50)", () => {
    expect(getLevel(999999)).toBe(50);
  });

  it("level 50 requires 60025 XP", () => {
    expect(getLevel(60025)).toBe(50);
    expect(getLevel(60024)).toBe(49);
  });
});

describe("XP_REWARDS", () => {
  it("has correct priority rewards", () => {
    expect(XP_REWARDS.p1).toBe(50);
    expect(XP_REWARDS.p2).toBe(30);
    expect(XP_REWARDS.p3).toBe(15);
    expect(XP_REWARDS.p4).toBe(5);
  });

  it("has correct plan rewards", () => {
    expect(XP_REWARDS.planStep).toBe(5);
    expect(XP_REWARDS.planCompleted).toBe(25);
  });

  it("subtask multiplier is 1/3", () => {
    expect(XP_REWARDS.subtaskMultiplier).toBeCloseTo(1 / 3);
  });

  it("streak bonus is 10 XP/day", () => {
    expect(XP_REWARDS.streakBonus).toBe(10);
  });
});

describe("getStreakMultiplier", () => {
  it("returns 1.0 for streak <= 7", () => {
    expect(getStreakMultiplier(0)).toBe(1.0);
    expect(getStreakMultiplier(1)).toBe(1.0);
    expect(getStreakMultiplier(7)).toBe(1.0);
  });

  it("returns 1.5 for streak > 7 and <= 30", () => {
    expect(getStreakMultiplier(8)).toBe(1.5);
    expect(getStreakMultiplier(30)).toBe(1.5);
  });

  it("returns 2.0 for streak > 30", () => {
    expect(getStreakMultiplier(31)).toBe(2.0);
    expect(getStreakMultiplier(365)).toBe(2.0);
  });
});

describe("STREAK_MULTIPLIERS", () => {
  it("has correct constant values", () => {
    expect(STREAK_MULTIPLIERS.normal).toBe(1.0);
    expect(STREAK_MULTIPLIERS.week).toBe(1.5);
    expect(STREAK_MULTIPLIERS.month).toBe(2.0);
  });
});

describe("MAX_LEVEL", () => {
  it("is 50", () => {
    expect(MAX_LEVEL).toBe(50);
  });
});
