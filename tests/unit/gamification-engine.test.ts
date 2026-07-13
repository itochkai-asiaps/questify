/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
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
    expect(getQualifyingSlugs({ ...EMPTY_STATS, tasks_completed: 1 })).toEqual(["first_task"]);
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
    expect(getQualifyingSlugs({ ...EMPTY_STATS, longest_streak: 7 })).toContain("week_warrior");
  });

  it("unlocks monthly_master at 30-day streak", () => {
    expect(getQualifyingSlugs({ ...EMPTY_STATS, longest_streak: 30 })).toContain("monthly_master");
  });

  it("unlocks perfect_day at 10 tasks today", () => {
    expect(getQualifyingSlugs({ ...EMPTY_STATS, tasks_today: 10 })).toContain("perfect_day");
  });

  it("unlocks planner at 5 plans", () => {
    expect(getQualifyingSlugs({ ...EMPTY_STATS, plans_completed: 5 })).toContain("planner");
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

// ===========================================================================
// Async function tests — mock setup & integration tests
// ===========================================================================

const mockSupabase: Record<string, any> = {
  data: null,
  error: null,
  count: 0,
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  in: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

import {
  awardXp,
  completeTask,
  checkAndAwardAchievements,
  getAchievements,
  getOrCreateUserStats,
} from "@/lib/gamification/engine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupChain() {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.in.mockReturnValue(mockSupabase);
  mockSupabase.gte.mockReturnValue(mockSupabase);
  mockSupabase.lte.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
}

/**
 * Creates an independent chain mock with its own `data` for table-aware
 * queries.  Used when a function queries two different tables that both
 * destructure `data` from the chain (e.g., achievements vs user_achievements).
 */
function createTableMock(initialData: any = null) {
  const m: Record<string, any> = {
    data: initialData,
    error: null,
    count: 0,
  };
  m.select = vi.fn(() => m);
  m.update = vi.fn(() => m);
  m.insert = vi.fn(() => m);
  m.eq = vi.fn(() => m);
  m.in = vi.fn(() => m);
  m.gte = vi.fn(() => m);
  m.lte = vi.fn(() => m);
  m.order = vi.fn(() => m);
  m.single = mockSupabase.single;
  m.maybeSingle = mockSupabase.maybeSingle;
  m.rpc = mockSupabase.rpc;
  m.auth = mockSupabase.auth;
  return m;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.data = null;
  mockSupabase.error = null;
  mockSupabase.count = 0;
  setupChain();
  // Default single/maybeSingle/RPC — tests override with mockResolvedValueOnce
  mockSupabase.single.mockResolvedValue({
    data: { total_xp: 100, level: 1 },
    error: null,
  });
  mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
  mockSupabase.rpc.mockResolvedValue({ data: 1, error: null });
});

// ===========================================================================
// awardXp
// ===========================================================================

describe("awardXp", () => {
  it("calls increment_xp RPC with correct params", async () => {
    await awardXp("test-user", 50);
    expect(mockSupabase.rpc).toHaveBeenCalledWith("increment_xp", {
      p_user_id: "test-user",
      p_amount: 50,
    });
  });

  it("calls check_level_up RPC after increment_xp", async () => {
    await awardXp("test-user", 100);
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    expect(mockSupabase.rpc).toHaveBeenNthCalledWith(2, "check_level_up", {
      p_user_id: "test-user",
    });
  });

  it("fetches updated user_stats via .single() after RPCs", async () => {
    await awardXp("test-user", 50);
    expect(mockSupabase.from).toHaveBeenCalledWith("user_stats");
    expect(mockSupabase.select).toHaveBeenCalledWith("total_xp, level");
    expect(mockSupabase.single).toHaveBeenCalled();
  });

  it("returns newXp and newLevel from updated stats", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { total_xp: 250, level: 4 },
      error: null,
    });
    const result = await awardXp("test-user", 100);
    expect(result.newXp).toBe(250);
    expect(result.newLevel).toBe(4);
  });

  it("returns leveledUp based on stats.level vs RPC newLevel", async () => {
    // check_level_up returns the (re)computed level
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 3, error: null }) // increment_xp
      .mockResolvedValueOnce({ data: 4, error: null }); // check_level_up
    // Updated stats from DB (could differ from RPC if RPC didn't update)
    mockSupabase.single.mockResolvedValueOnce({
      data: { total_xp: 250, level: 4 },
      error: null,
    });
    const result = await awardXp("test-user", 100);
    // formula: stats.level > (newLevel ?? stats.level) - 1
    // 4 > (4 ?? 4) - 1 = 4 > 3 = true
    expect(result.leveledUp).toBe(true);
  });

  it("throws when increment_xp RPC returns error", async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "XP increment failed" },
    });
    await expect(awardXp("user", 50)).rejects.toThrow(
      "Failed to increment XP: XP increment failed",
    );
  });

  it("throws when check_level_up RPC returns error", async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 1, error: null }) // increment_xp ok
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Level check failed" },
      });
    await expect(awardXp("user", 50)).rejects.toThrow(
      "Failed to check level up: Level check failed",
    );
  });

  it("throws when stats fetch returns error", async () => {
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 1, error: null });
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Stats fetch failed" },
    });
    await expect(awardXp("user", 50)).rejects.toThrow(
      "Failed to fetch updated stats: Stats fetch failed",
    );
  });
});

// ===========================================================================
// completeTask
// ===========================================================================

describe("completeTask", () => {
  it("awards 50 XP for P1 with no streak", async () => {
    // First single(): current_streak = 0 → multiplier 1.0
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    // The three RPC calls (increment_xp, check_level_up, update_streak)
    // use default mock { data: 1, error: null }
    const result = await completeTask("user", TaskPriority.P1);
    expect(result.xpAwarded).toBe(50);
  });

  it("awards 30 XP for P2", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    const result = await completeTask("user", TaskPriority.P2);
    expect(result.xpAwarded).toBe(30);
  });

  it("awards 15 XP for P3", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    const result = await completeTask("user", TaskPriority.P3);
    expect(result.xpAwarded).toBe(15);
  });

  it("awards 5 XP for P4", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    const result = await completeTask("user", TaskPriority.P4);
    expect(result.xpAwarded).toBe(5);
  });

  it("applies streak multiplier when streak > 7", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 10, total_xp: 500, level: 3 },
      error: null,
    });
    const result = await completeTask("user", TaskPriority.P1);
    // 50 × 1.5 = 75
    expect(result.xpAwarded).toBe(75);
  });

  it("calls update_streak RPC after awardXp", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    await completeTask("user", TaskPriority.P3);
    const rpcCalls = mockSupabase.rpc.mock.calls.map((c: any[]) => c[0]);
    expect(rpcCalls).toContain("update_streak");
  });

  it("returns streak value from update_streak RPC", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    // increment_xp → 1, check_level_up → 1, update_streak → 7
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 7, error: null });
    const result = await completeTask("user", TaskPriority.P2);
    expect(result.streak).toBe(7);
  });

  it("throws when user_stats fetch fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Stats not found" },
    });
    await expect(completeTask("user", TaskPriority.P1)).rejects.toThrow(
      "Failed to fetch user stats: Stats not found",
    );
  });

  it("throws when update_streak RPC returns error", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { current_streak: 0, total_xp: 0, level: 1 },
      error: null,
    });
    // increment_xp ok, check_level_up ok, update_streak error
    mockSupabase.rpc
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({ data: 1, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Streak update failed" },
      });
    await expect(completeTask("user", TaskPriority.P1)).rejects.toThrow(
      "Failed to update streak: Streak update failed",
    );
  });
});

// ===========================================================================
// checkAndAwardAchievements — table-aware mocks
// ===========================================================================

describe("checkAndAwardAchievements", () => {
  /**
   * Override mockSupabase.from to return dedicated table mocks for tables that
   * share the `data` destructuring pattern (achievements, user_achievements).
   * Other tables (user_stats, tasks) flow through the default mockSupabase.
   * Returns the table mocks so tests can customize errors on them.
   */
  function mockTableAwareFrom(achievementsData: any[], uaData: any[]) {
    const achMock = createTableMock(achievementsData);
    const uaMock = createTableMock(uaData);
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "achievements") return achMock;
      if (table === "user_achievements") return uaMock;
      return mockSupabase;
    });
    return { achMock, uaMock };
  }

  it("returns empty array when no achievements earned", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 0,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    mockTableAwareFrom([], []);

    const result = await checkAndAwardAchievements("user");
    expect(result).toEqual([]);
  });

  it("unlocks first_task when tasks_completed >= 1", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 1,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    // achievements: one row for first_task; user_achievements: empty (none unlocked yet)
    mockTableAwareFrom([{ id: "ach-first", slug: "first_task" }], []);

    const result = await checkAndAwardAchievements("user");
    expect(result).toContain("first_task");
  });

  it("unlocks multiple achievements at once", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 50,
        current_streak: 7,
        longest_streak: 30,
        plans_completed: 5,
      },
      error: null,
    });
    mockSupabase.count = 10; // 10 tasks today → perfect_day
    // Return all qualifying achievements; no existing user_achievements
    mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
        { id: "a3", slug: "hard_worker" },
        { id: "a4", slug: "week_warrior" },
        { id: "a5", slug: "monthly_master" },
        { id: "a6", slug: "perfect_day" },
        { id: "a7", slug: "planner" },
      ],
      [],
    );

    const result = await checkAndAwardAchievements("user");
    expect(result.length).toBeGreaterThanOrEqual(5);
    expect(result).toContain("first_task");
    expect(result).toContain("hard_worker");
    expect(result).toContain("week_warrior");
  });

  it("does not re-award already unlocked achievements", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 25,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    // qualifying: first_task, getting_started
    // user_achievements already has first_task and getting_started
    mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
      ],
      [{ achievement_id: "a1" }, { achievement_id: "a2" }],
    );

    const result = await checkAndAwardAchievements("user");
    expect(result).toEqual([]);
  });

  it("filters out only already-unlocked, returns new ones", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 50,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    // qualifying: first_task, getting_started, hard_worker
    // user already has first_task
    mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
        { id: "a3", slug: "hard_worker" },
      ],
      [{ achievement_id: "a1" }],
    );

    const result = await checkAndAwardAchievements("user");
    expect(result).not.toContain("first_task");
    expect(result).toContain("getting_started");
    expect(result).toContain("hard_worker");
    expect(result.length).toBe(2);
  });

  it("calls awardXp for newly earned achievements (triggers increment_xp RPC)", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 25,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
      ],
      [{ achievement_id: "a1" }], // first_task already unlocked
    );

    await checkAndAwardAchievements("user");
    // awardXp should have been called for getting_started (25 XP)
    const incrementCalls = mockSupabase.rpc.mock.calls.filter(
      (c: any[]) => c[0] === "increment_xp",
    );
    expect(incrementCalls.length).toBe(1);
    // Verify the correct amount was passed for getting_started (25 XP)
    expect(incrementCalls[0][1]).toEqual({
      p_user_id: "user",
      p_amount: 25,
    });
  });

  it("throws when user_stats fetch fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });
    await expect(checkAndAwardAchievements("user")).rejects.toThrow(
      "Failed to fetch user stats: DB error",
    );
  });

  it("throws when today's tasks count query fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 10,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    // Simulate error from the tasks count query
    // The chain for tasks uses the default mockSupabase, so set error there
    mockSupabase.error = { message: "Count failed" };
    await expect(checkAndAwardAchievements("user")).rejects.toThrow(
      "Failed to count today's tasks: Count failed",
    );
  });

  it("throws when achievements DB fetch fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 5,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    const { achMock } = mockTableAwareFrom([], []);
    // Achievements query sees error after qualifying slugs are computed
    achMock.error = { message: "DB connection lost" };

    await expect(checkAndAwardAchievements("user")).rejects.toThrow(
      "Failed to fetch achievements: DB connection lost",
    );
  });

  it("throws when user_achievements DB fetch fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 5,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    const { uaMock } = mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
      ],
      [],
    );
    // Achievements query succeeds, user_achievements query fails
    uaMock.error = { message: "Permission denied" };

    await expect(checkAndAwardAchievements("user")).rejects.toThrow(
      "Failed to fetch existing achievements: Permission denied",
    );
  });

  it("throws when inserting new user_achievements fails", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        tasks_completed: 5,
        current_streak: 0,
        longest_streak: 0,
        plans_completed: 0,
      },
      error: null,
    });
    mockSupabase.count = 0;
    const { uaMock } = mockTableAwareFrom(
      [
        { id: "a1", slug: "first_task" },
        { id: "a2", slug: "getting_started" },
      ],
      [{ achievement_id: "a1" }], // first_task already unlocked
    );
    // Select succeeds (error = null), but insert fails
    // Override insert() return to carry an error
    const insertErrorMock = { ...uaMock, error: { message: "Unique violation" } };
    uaMock.insert.mockReturnValueOnce(insertErrorMock);

    await expect(checkAndAwardAchievements("user")).rejects.toThrow(
      "Failed to insert achievements: Unique violation",
    );
  });
});

// ===========================================================================
// getAchievements
// ===========================================================================

describe("getAchievements", () => {
  it("returns all achievements with unlocked state", async () => {
    mockSupabase.data = [
      {
        slug: "first_task",
        title: "First Task",
        description: "Complete your first task",
        icon_url: null,
        xp_reward: 10,
        user_achievements: [{ unlocked_at: "2024-01-01T00:00:00Z", user_id: "user-1" }],
      },
      {
        slug: "getting_started",
        title: "Getting Started",
        description: "Complete 10 tasks",
        icon_url: null,
        xp_reward: 25,
        user_achievements: [],
      },
      {
        slug: "hard_worker",
        title: "Hard Worker",
        description: "Complete 50 tasks",
        icon_url: null,
        xp_reward: 50,
        user_achievements: [{ unlocked_at: "2024-01-02T00:00:00Z", user_id: "other-user" }],
      },
    ];

    const result = await getAchievements("user-1");
    expect(result).toHaveLength(3);
    // first_task: unlocked by user-1
    expect(result[0].slug).toBe("first_task");
    expect(result[0].unlocked).toBe(true);
    expect(result[0].unlockedAt).toBe("2024-01-01T00:00:00Z");
    // getting_started: no user_achievements match → locked
    expect(result[1].slug).toBe("getting_started");
    expect(result[1].unlocked).toBe(false);
    expect(result[1].unlockedAt).toBeNull();
    // hard_worker: only other-user unlocked → locked for user-1
    expect(result[2].slug).toBe("hard_worker");
    expect(result[2].unlocked).toBe(false);
  });

  it("returns empty array when no achievements exist", async () => {
    mockSupabase.data = [];
    const result = await getAchievements("any-user");
    expect(result).toEqual([]);
  });

  it("throws when fetch fails", async () => {
    mockSupabase.error = { message: "Fetch error" };
    await expect(getAchievements("user")).rejects.toThrow(
      "Failed to fetch achievements: Fetch error",
    );
  });
});

// ===========================================================================
// getOrCreateUserStats
// ===========================================================================

describe("getOrCreateUserStats", () => {
  it("returns existing stats when found", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        user_id: "550e8400-e29b-41d4-a716-446655440001",
        total_xp: 100,
        level: 2,
        current_streak: 3,
        longest_streak: 5,
        last_completed_date: "2024-06-01",
        tasks_completed: 10,
        plans_completed: 2,
        updated_at: "2024-06-01T12:00:00Z",
      },
      error: null,
    });

    const result = await getOrCreateUserStats("test-user");
    expect(result.totalXp).toBe(100);
    expect(result.level).toBe(2);
    expect(result.currentStreak).toBe(3);
    expect(result.tasksCompleted).toBe(10);
    expect(result.plansCompleted).toBe(2);
  });

  it("creates new stats when not found", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: null }) // no existing
      .mockResolvedValueOnce({
        data: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          user_id: "550e8400-e29b-41d4-a716-446655440003",
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          last_completed_date: null,
          tasks_completed: 0,
          plans_completed: 0,
          updated_at: "2024-06-01T12:00:00Z",
        },
        error: null,
      }); // inserted row

    const result = await getOrCreateUserStats("test-user");
    expect(result.totalXp).toBe(0);
    expect(result.level).toBe(1);
    expect(mockSupabase.insert).toHaveBeenCalledWith({ user_id: "test-user" });
  });

  it("throws when insert fails", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: null, error: null }) // no existing
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Insert conflict" },
      });

    await expect(getOrCreateUserStats("user")).rejects.toThrow(
      "Failed to create user stats: Insert conflict",
    );
  });

  it("transforms snake_case to camelCase with UserStatsSchema.parse", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: {
        id: "550e8400-e29b-41d4-a716-446655440004",
        user_id: "550e8400-e29b-41d4-a716-446655440005",
        total_xp: 500,
        level: 5,
        current_streak: 14,
        longest_streak: 21,
        last_completed_date: "2024-06-15",
        tasks_completed: 42,
        plans_completed: 3,
        updated_at: "2024-06-15T08:00:00Z",
      },
      error: null,
    });

    const result = await getOrCreateUserStats("user");
    expect(result.userId).toBe("550e8400-e29b-41d4-a716-446655440005");
    expect(result.totalXp).toBe(500);
    expect(result.currentStreak).toBe(14);
    expect(result.longestStreak).toBe(21);
    expect(result.lastCompletedDate).toBe("2024-06-15");
    expect(result.tasksCompleted).toBe(42);
  });
});
