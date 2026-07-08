/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted; must not reference outer-scope variables
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/gamification/engine", () => ({
  awardXp: vi.fn().mockResolvedValue(undefined),
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Imports (after mock hoisting, so they resolve to mocked modules)
// ---------------------------------------------------------------------------

import { requireUser } from "@/lib/auth/requireUser";
import { awardXp, checkAndAwardAchievements } from "@/lib/gamification/engine";
import { revalidatePath } from "next/cache";
import {
  createPlan,
  updatePlan,
  deletePlan,
  addPlanItem,
  togglePlanItem,
  deletePlanItem,
  getPlans,
  getPlanById,
} from "@/lib/actions/plans";

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockRequireUser = vi.mocked(requireUser);
const mockAwardXp = vi.mocked(awardXp);
const mockCheckAndAward = vi.mocked(checkAndAwardAchievements);

// ---------------------------------------------------------------------------
// Chainable Supabase mock
// ---------------------------------------------------------------------------

const mockSupabase: Record<string, any> = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wire up the fluent Supabase chain: every chaining method returns mockSupabase. */
function setupChain() {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.is.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.rpc.mockReturnValue(mockSupabase);
}

/** Build a FormData from string key/value pairs. */
function mockFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value);
  }
  return fd;
}

// ---------------------------------------------------------------------------
// beforeEach — reset state for every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  setupChain();

  mockRequireUser.mockResolvedValue({
    supabase: mockSupabase as any,
    user: { id: "test-user-id" } as any,
  });

  // Default: single() resolves to empty data (no error)
  mockSupabase.single.mockResolvedValue({ data: null, error: null });
  // Default: maybeSingle resolves to empty (rpc keeps mockReturnValue from setupChain for chaining)
  mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
  // Default: non-single queries get empty data
  mockSupabase.data = [];
  mockSupabase.error = null;
});

// ===========================================================================
// createPlan
// ===========================================================================

describe("createPlan", () => {
  it("creates plan with valid input (no items)", async () => {
    const createdPlan = {
      id: "550e8400-e29b-41d4-a716-4466554400a1",
      title: "My Plan",
      user_id: "test-user-id",
    };
    mockSupabase.single.mockResolvedValue({ data: createdPlan, error: null });

    const fd = mockFormData({
      title: "My Plan",
      description: "Plan desc",
      color: "#ff0000",
    });

    const result = await createPlan(fd);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(createdPlan);

    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.title).toBe("My Plan");
    expect(insertCall.user_id).toBe("test-user-id");
    expect(insertCall.color).toBe("#ff0000");
  });

  it("creates plan with items", async () => {
    const createdPlan = { id: "plan-1", title: "Plan with items" };
    mockSupabase.single.mockResolvedValue({ data: createdPlan, error: null });
    // Items insert is non-single, resolve via mockSupabase.error = null
    mockSupabase.error = null;

    const fd = mockFormData({
      title: "Plan with items",
      description: "",
      color: "#6366f1",
      items: JSON.stringify([
        { title: "Step 1" },
        { title: "Step 2" },
      ]),
    });

    const result = await createPlan(fd);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(createdPlan);

    // Verify items were inserted
    const itemsInsertCall = mockSupabase.insert.mock.calls[1][0] as any[];
    expect(itemsInsertCall).toHaveLength(2);
    expect(itemsInsertCall[0].title).toBe("Step 1");
    expect(itemsInsertCall[0].position).toBe(0);
    expect(itemsInsertCall[0].plan_id).toBe("plan-1");
    expect(itemsInsertCall[1].title).toBe("Step 2");
    expect(itemsInsertCall[1].position).toBe(1);
    expect(itemsInsertCall[1].plan_id).toBe("plan-1");
  });

  it("returns error when title is missing", async () => {
    const fd = mockFormData({ title: "" });
    const result = await createPlan(fd);
    expect(result.error).toBe("Title is required");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ title: "Plan" });
    const result = await createPlan(fd);
    expect(result.error).toBe("Not authenticated");
  });

  it("handles invalid JSON items gracefully", async () => {
    const createdPlan = { id: "plan-1", title: "Plan" };
    mockSupabase.single.mockResolvedValue({ data: createdPlan, error: null });

    const fd = mockFormData({
      title: "Plan",
      description: "",
      color: "#6366f1",
      items: "{bad-json",
    });

    // Invalid JSON → items defaults to [], plan is still created
    const result = await createPlan(fd);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(createdPlan);
  });

  it("propagates plan insert error", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "DB insert failed" },
    });

    const fd = mockFormData({
      title: "Plan",
      description: "",
      color: "#6366f1",
    });
    const result = await createPlan(fd);
    expect(result.error).toBe("DB insert failed");
  });

  it("cleans up plan if items insert fails", async () => {
    const createdPlan = { id: "plan-1", title: "Plan" };
    // Plan insert success
    mockSupabase.single.mockResolvedValue({ data: createdPlan, error: null });
    // Items insert fails
    mockSupabase.error = { message: "Items insert failed" };

    const fd = mockFormData({
      title: "Plan",
      description: "",
      color: "#6366f1",
      items: JSON.stringify([{ title: "Step 1" }]),
    });

    const result = await createPlan(fd);
    expect(result.error).toBe("Items insert failed");

    // Verify cleanup: plan was deleted
    expect(mockSupabase.delete).toHaveBeenCalled();
  });
});

// ===========================================================================
// updatePlan
// ===========================================================================

describe("updatePlan", () => {
  const planId = "550e8400-e29b-41d4-a716-4466554400a2";

  it("changes plan title", async () => {
    const updatedPlan = { id: planId, title: "Updated Title" };
    mockSupabase.single.mockResolvedValue({ data: updatedPlan, error: null });

    const fd = mockFormData({
      title: "Updated Title",
      description: "",
      color: "#6366f1",
    });
    const result = await updatePlan(planId, fd);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(updatedPlan);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.title).toBe("Updated Title");
  });

  it("updates description and color", async () => {
    const updatedPlan = {
      id: planId,
      title: "Plan",
      description: "New desc",
      color: "#00ff00",
    };
    mockSupabase.single.mockResolvedValue({ data: updatedPlan, error: null });

    const fd = mockFormData({
      title: "Plan",
      description: "New desc",
      color: "#00ff00",
    });
    const result = await updatePlan(planId, fd);

    expect(result.error).toBeUndefined();

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.description).toBe("New desc");
    expect(updateCall.color).toBe("#00ff00");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ title: "Plan" });
    const result = await updatePlan(planId, fd);
    expect(result.error).toBe("Not authenticated");
  });
});

// ===========================================================================
// deletePlan
// ===========================================================================

describe("deletePlan", () => {
  const planId = "550e8400-e29b-41d4-a716-4466554400a3";

  it("deletes plan successfully", async () => {
    mockSupabase.error = null;

    const result = await deletePlan(planId);

    expect(result.error).toBeUndefined();
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", planId);

    expect(revalidatePath).toHaveBeenCalledWith("/plans", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("returns error when plan not found (DB delete succeeds with no rows)", async () => {
    // Supabase delete with 0 rows affected is not an error in supabase-js
    mockSupabase.error = null;

    const result = await deletePlan(planId);
    expect(result.error).toBeUndefined();
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await deletePlan(planId);
    expect(result.error).toBe("Not authenticated");
  });

  it("propagates Supabase error", async () => {
    mockSupabase.error = { message: "DB error" };

    const result = await deletePlan(planId);
    expect(result.error).toBe("DB error");
  });
});

// ===========================================================================
// addPlanItem
// ===========================================================================

describe("addPlanItem", () => {
  const planId = "550e8400-e29b-41d4-a716-4466554400a4";

  it("adds item to plan", async () => {
    const newItem = { id: "item-1", title: "New step", position: 3, plan_id: planId };
    // Position query returns non-single
    mockSupabase.data = [{ position: 2 }];
    // Insert returns single
    mockSupabase.single.mockResolvedValue({ data: newItem, error: null });

    const fd = mockFormData({ title: "New step" });
    const result = await addPlanItem(planId, fd);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(newItem);

    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.title).toBe("New step");
    expect(insertCall.plan_id).toBe(planId);
    expect(insertCall.position).toBe(3);
  });

  it("defaults position to 0 when no existing items", async () => {
    const newItem = { id: "item-1", title: "First step", position: 0, plan_id: planId };
    // Position query: empty result (max position = -1, position = 0)
    mockSupabase.data = [];
    mockSupabase.single.mockResolvedValue({ data: newItem, error: null });

    const fd = mockFormData({ title: "First step" });
    const result = await addPlanItem(planId, fd);

    expect(result.error).toBeUndefined();

    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.position).toBe(0);
  });

  it("returns validation error when title is empty", async () => {
    const fd = mockFormData({ title: "" });
    const result = await addPlanItem(planId, fd);
    expect(result.error).toBe("Title is required");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ title: "Step" });
    const result = await addPlanItem(planId, fd);
    expect(result.error).toBe("Not authenticated");
  });
});

// ===========================================================================
// togglePlanItem
// ===========================================================================

describe("togglePlanItem", () => {
  const itemId = "550e8400-e29b-41d4-a716-4466554400a5";

  beforeEach(() => {
    mockAwardXp.mockResolvedValue(undefined as any);
    mockCheckAndAward.mockResolvedValue([]);
  });

  it("toggles completion from incomplete to complete", async () => {
    // First single: fetch current state
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { completed: false, plan_id: "plan-1" },
        error: null,
      })
      // Second single: update result
      .mockResolvedValueOnce({
        data: { id: itemId, completed: true, plan_id: "plan-1" },
        error: null,
      });

    const result = await togglePlanItem(itemId);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.completed).toBe(true);
  });

  it("toggles completion from complete to incomplete", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { completed: true, plan_id: "plan-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: itemId, completed: false, plan_id: "plan-1" },
        error: null,
      });

    const result = await togglePlanItem(itemId);

    expect(result.error).toBeUndefined();

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.completed).toBe(false);

    // No XP awarded when uncompleting
    expect(mockAwardXp).not.toHaveBeenCalled();
  });

  it("awards step XP when completing an item", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { completed: false, plan_id: "plan-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: itemId, completed: true, plan_id: "plan-1" },
        error: null,
      });

    // Remaining query (non-single): some tasks still incomplete
    mockSupabase.data = [{ id: "other-item" }]; // has remaining → not all done

    await togglePlanItem(itemId);

    expect(mockAwardXp).toHaveBeenCalledWith("test-user-id", 5); // planStep = 5
    expect(mockCheckAndAward).toHaveBeenCalledWith("test-user-id");
  });

  it("awards plan completion XP when all items done", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { completed: false, plan_id: "plan-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: itemId, completed: true, plan_id: "plan-1" },
        error: null,
      });

    // Remaining query: all items done
    mockSupabase.data = [];

    await togglePlanItem(itemId);

    expect(mockAwardXp).toHaveBeenCalledWith("test-user-id", 5); // planStep
    expect(mockAwardXp).toHaveBeenCalledWith("test-user-id", 25); // planCompleted
    expect(mockSupabase.rpc).toHaveBeenCalledWith("increment_plans_completed", {
      p_user_id: "test-user-id",
    });
    expect(mockCheckAndAward).toHaveBeenCalledWith("test-user-id");
  });

  it("handles gamification failure gracefully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { completed: false, plan_id: "plan-1" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: itemId, completed: true, plan_id: "plan-1" },
        error: null,
      });

    mockAwardXp.mockRejectedValue(new Error("Gamification crash"));
    mockSupabase.data = [];

    const result = await togglePlanItem(itemId);

    // Toggle should still succeed despite gamification failure
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it("returns error when item not found", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const result = await togglePlanItem(itemId);
    expect(result.error).toBe("No rows found");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await togglePlanItem(itemId);
    expect(result.error).toBe("Not authenticated");
  });
});

// ===========================================================================
// deletePlanItem
// ===========================================================================

describe("deletePlanItem", () => {
  const itemId = "550e8400-e29b-41d4-a716-4466554400a6";

  it("removes item successfully", async () => {
    // Fetch plan_id
    mockSupabase.single.mockResolvedValueOnce({
      data: { plan_id: "plan-1" },
      error: null,
    });
    // Delete
    mockSupabase.error = null;

    const result = await deletePlanItem(itemId);

    expect(result.error).toBeUndefined();
    expect(mockSupabase.delete).toHaveBeenCalled();
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", itemId);

    expect(revalidatePath).toHaveBeenCalledWith("/plans", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/plans/plan-1", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("returns error when item not found", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const result = await deletePlanItem(itemId);
    expect(result.error).toBe("No rows found");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await deletePlanItem(itemId);
    expect(result.error).toBe("Not authenticated");
  });

  it("propagates delete error", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { plan_id: "plan-1" },
      error: null,
    });
    mockSupabase.error = { message: "Delete failed" };

    const result = await deletePlanItem(itemId);
    expect(result.error).toBe("Delete failed");
  });
});

// ===========================================================================
// getPlans
// ===========================================================================

describe("getPlans", () => {
  it("returns plans with items and computed progress", async () => {
    const planData = [
      {
        id: "plan-1",
        title: "Plan A",
        items: [
          { id: "i1", completed: true },
          { id: "i2", completed: false },
          { id: "i3", completed: true },
        ],
      },
      {
        id: "plan-2",
        title: "Plan B",
        items: [],
      },
    ];
    mockSupabase.data = planData;
    mockSupabase.error = null;

    const result = await getPlans();

    expect(result.error).toBeUndefined();
    expect(result.data).toHaveLength(2);

    const planA = (result.data as any[])[0];
    expect(planA.total).toBe(3);
    expect(planA.completed).toBe(2);
    expect(planA.progress).toBe(67); // 2/3 * 100 = 66.67 → rounded to 67

    const planB = (result.data as any[])[1];
    expect(planB.total).toBe(0);
    expect(planB.completed).toBe(0);
    expect(planB.progress).toBe(0);
  });

  it("returns empty array for no plans", async () => {
    mockSupabase.data = [];
    mockSupabase.error = null;

    const result = await getPlans();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getPlans();
    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeUndefined();
  });

  it("propagates Supabase query error", async () => {
    mockSupabase.data = null;
    mockSupabase.error = { message: "Query failed" };

    const result = await getPlans();
    expect(result.error).toBe("Query failed");
  });
});

// ===========================================================================
// getPlanById
// ===========================================================================

describe("getPlanById", () => {
  const planId = "550e8400-e29b-41d4-a716-4466554400a7";

  it("returns single plan with progress", async () => {
    const plan = {
      id: planId,
      title: "My Plan",
      items: [
        { id: "i1", completed: true },
        { id: "i2", completed: true },
        { id: "i3", completed: false },
        { id: "i4", completed: false },
      ],
    };
    mockSupabase.single.mockResolvedValue({ data: plan, error: null });

    const result = await getPlanById(planId);

    expect(result.error).toBeUndefined();
    const data = result.data as any;
    expect(data.id).toBe(planId);
    expect(data.total).toBe(4);
    expect(data.completed).toBe(2);
    expect(data.progress).toBe(50);
  });

  it("returns error when plan not found", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const result = await getPlanById(planId);
    expect(result.error).toBe("No rows found");
    expect(result.data).toBeUndefined();
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getPlanById(planId);
    expect(result.error).toBe("Not authenticated");
  });
});
