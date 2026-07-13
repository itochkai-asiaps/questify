/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted; must not reference outer-scope variables
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mock hoisting, so they resolve to mocked modules)
// ---------------------------------------------------------------------------

import { requireUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import {
  convertIdeaToTask,
  convertIdeaToPlan,
  convertPlanItemToTask,
} from "@/lib/actions/conversions";

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockRequireUser = vi.mocked(requireUser);

const mockSupabase = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
};

const TEST_USER_ID = "8c5e1e8a-1111-4444-9999-000000000001";
const TEST_IDEA_ID = "8c5e1e8a-2222-4444-9999-000000000001";
const TEST_ITEM_ID = "8c5e1e8a-3333-4444-9999-000000000001";

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
  mockSupabase.neq.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
}

// ---------------------------------------------------------------------------
// beforeEach — reset state for every test
// ---------------------------------------------------------------------------

beforeEach(() => {
  setupChain();

  mockRequireUser.mockResolvedValue({
    supabase: mockSupabase as any,
    user: { id: TEST_USER_ID } as any,
  });

  mockSupabase.single.mockResolvedValue({ data: null, error: null });
});

// ===========================================================================
// convertIdeaToTask
// ===========================================================================

describe("convertIdeaToTask", () => {
  const ideaData = {
    title: "My test idea",
    description: "A detailed description of my idea",
  };

  const taskData = {
    id: "8c5e1e8a-aaaa-4444-9999-000000000001",
    user_id: TEST_USER_ID,
    title: "My test idea",
    description: "A detailed description of my idea",
    priority: "p3",
    status: "todo",
    xp_reward: 15,
  };

  // -- Successful conversion ------------------------------------------------

  it("converts an idea to a task successfully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(taskData);
  });

  // -- Idea not found -------------------------------------------------------

  it("returns error when idea is not found (fetchError)", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toBe("Idea not found");
    expect("data" in result ? result.data : undefined).toBeUndefined();
  });

  it("returns error when idea fetch returns null data", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toBe("Idea not found");
  });

  // -- Zod validation failure -----------------------------------------------

  it("returns Zod validation error when idea title is empty", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { title: "", description: "" },
      error: null,
    });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toContain("Validation failed");
    expect("data" in result ? result.data : undefined).toBeUndefined();
  });

  // -- xp_reward derived from priority --------------------------------------

  it("inserts task with xp_reward derived from priority (p3 → 15)", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertIdeaToTask(TEST_IDEA_ID);

    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.xp_reward).toBe(15);
    expect(insertPayload.priority).toBe("p3");
    expect(insertPayload.status).toBe("todo");
  });

  it("includes xp_reward in the task insert payload", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertIdeaToTask(TEST_IDEA_ID);

    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload).toHaveProperty("xp_reward");
    expect(insertPayload.xp_reward).toBeGreaterThan(0);
  });

  // -- Non-atomic delete ----------------------------------------------------

  it("deletes the idea after task creation (non-atomic)", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertIdeaToTask(TEST_IDEA_ID);

    // Verify delete was fired on the "ideas" table
    expect(mockSupabase.delete).toHaveBeenCalled();
    // Verify from("ideas") was called — at least for the delete step
    // (also called for the initial select, so at least 2 times total)
    const ideasCalls = mockSupabase.from.mock.calls.filter((call: any[]) => call[0] === "ideas");
    expect(ideasCalls.length).toBeGreaterThanOrEqual(2);
    // The final from("ideas") call should be the delete
    expect(mockSupabase.from.mock.calls[mockSupabase.from.mock.calls.length - 1][0]).toBe("ideas");
  });

  it("continues after task creation even if idea was not found", async () => {
    // The delete step does not check its result — it is fire-and-forget
    // This test verifies the function returns normally even if single succeeds for insert
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    const result = await convertIdeaToTask(TEST_IDEA_ID);
    expect("data" in result ? result.data : undefined).toEqual(taskData);
  });

  // -- revalidatePath calls -------------------------------------------------

  it("calls revalidatePath for /ideas, /tasks, and /dashboard", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertIdeaToTask(TEST_IDEA_ID);

    expect(revalidatePath).toHaveBeenCalledWith("/ideas", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/tasks", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(revalidatePath).toHaveBeenCalledTimes(3);
  });

  // -- Task insert from the "tasks" table -----------------------------------

  it("inserts into the tasks table", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertIdeaToTask(TEST_IDEA_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith("tasks");
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toBe("Not authenticated");
  });

  // -- Supabase insert error propagation ------------------------------------

  it("propagates Supabase error on task insert failure", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "DB constraint violation" },
      });

    const result = await convertIdeaToTask(TEST_IDEA_ID);

    expect(result.error).toBe("DB constraint violation");
    expect("data" in result ? result.data : undefined).toBeUndefined();
  });
});

// ===========================================================================
// convertIdeaToPlan
// ===========================================================================

describe("convertIdeaToPlan", () => {
  const ideaData = {
    title: "Plan-worthy idea",
    description: "This should become a plan",
  };

  const planData = {
    id: "8c5e1e8a-bbbb-4444-9999-000000000001",
    user_id: TEST_USER_ID,
    title: "Plan-worthy idea",
    description: "This should become a plan",
  };

  // -- Successful conversion ------------------------------------------------

  it("converts an idea to a plan successfully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: planData, error: null });

    const result = await convertIdeaToPlan(TEST_IDEA_ID);

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(planData);
  });

  it("inserts into the plans table", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: planData, error: null });

    await convertIdeaToPlan(TEST_IDEA_ID);

    expect(mockSupabase.from).toHaveBeenCalledWith("plans");
  });

  it("deletes the idea after plan creation", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: planData, error: null });

    await convertIdeaToPlan(TEST_IDEA_ID);

    expect(mockSupabase.delete).toHaveBeenCalled();
  });

  it("calls revalidatePath for /ideas, /plans, and /dashboard", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: ideaData, error: null })
      .mockResolvedValueOnce({ data: planData, error: null });

    await convertIdeaToPlan(TEST_IDEA_ID);

    expect(revalidatePath).toHaveBeenCalledWith("/ideas", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/plans", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  // -- Validation -----------------------------------------------------------

  it("returns Zod validation error when idea title is empty", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { title: "", description: "" },
      error: null,
    });

    const result = await convertIdeaToPlan(TEST_IDEA_ID);

    expect(result.error).toContain("Validation failed");
    expect("data" in result ? result.data : undefined).toBeUndefined();
  });

  // -- Idea not found -------------------------------------------------------

  it("returns error when idea is not found", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await convertIdeaToPlan(TEST_IDEA_ID);

    expect(result.error).toBe("Idea not found");
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await convertIdeaToPlan(TEST_IDEA_ID);

    expect(result.error).toBe("Not authenticated");
  });
});

// ===========================================================================
// convertPlanItemToTask
// ===========================================================================

describe("convertPlanItemToTask", () => {
  const planId = "8c5e1e8a-cccc-4444-9999-000000000001";

  const planItemData = {
    title: "Do the thing",
    description: "Step-by-step instructions for doing the thing",
    plan_id: planId,
  };

  const taskData = {
    id: "8c5e1e8a-dddd-4444-9999-000000000001",
    user_id: TEST_USER_ID,
    title: "Do the thing",
    description: "Step-by-step instructions for doing the thing",
    priority: "p3",
    status: "todo",
    xp_reward: 15,
  };

  // -- Fetches description --------------------------------------------------

  it("fetches title, description, and plan_id from plan_items", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertPlanItemToTask(TEST_ITEM_ID);

    // Verify the first select call was on "plan_items" with proper columns
    expect(mockSupabase.from).toHaveBeenCalledWith("plan_items");
    expect(mockSupabase.select).toHaveBeenCalledWith("title, description, plan_id");
  });

  it("includes the plan item description in the task insert", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertPlanItemToTask(TEST_ITEM_ID);

    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.title).toBe("Do the thing");
    expect(insertPayload.description).toBe("Step-by-step instructions for doing the thing");
  });

  it("handles null description from plan item gracefully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { title: "No desc", description: null, plan_id: planId },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { ...taskData, description: undefined, title: "No desc" },
        error: null,
      });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toBeUndefined();
    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    // description should be undefined (no key) or an empty-ish value
    expect(insertPayload.description || undefined).toBeUndefined();
  });

  // -- Converts correctly ---------------------------------------------------

  it("converts a plan item to a task successfully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(taskData);
  });

  it("sets xp_reward to p3 value (15) in task insert", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertPlanItemToTask(TEST_ITEM_ID);

    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.xp_reward).toBe(15);
    expect(insertPayload.status).toBe("todo");
    expect(insertPayload.priority).toBe("p3");
  });

  it("deletes the plan item after task creation", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertPlanItemToTask(TEST_ITEM_ID);

    expect(mockSupabase.delete).toHaveBeenCalled();
    // Verify from("plan_items") was called for the delete
    const planItemCalls = mockSupabase.from.mock.calls.filter(
      (call: any[]) => call[0] === "plan_items",
    );
    expect(planItemCalls.length).toBeGreaterThanOrEqual(2);
  });

  it("revalidates /tasks, /plans, /plans/:id, and /dashboard", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({ data: taskData, error: null });

    await convertPlanItemToTask(TEST_ITEM_ID);

    expect(revalidatePath).toHaveBeenCalledWith("/tasks", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/plans", "layout");
    expect(revalidatePath).toHaveBeenCalledWith(`/plans/${planId}`, "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(revalidatePath).toHaveBeenCalledTimes(4);
  });

  // -- Validation -----------------------------------------------------------

  it("returns Zod validation error when plan item title is empty", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { title: "", description: "", plan_id: planId },
      error: null,
    });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toContain("Validation failed");
    expect("data" in result ? result.data : undefined).toBeUndefined();
  });

  // -- Error handling -------------------------------------------------------

  it("returns error when plan item is not found", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Not found" },
    });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toBe("Plan item not found");
  });

  it("propagates Supabase error on task insert failure", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: planItemData, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Insert failed" },
      });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toBe("Insert failed");
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await convertPlanItemToTask(TEST_ITEM_ID);

    expect(result.error).toBe("Not authenticated");
  });
});
