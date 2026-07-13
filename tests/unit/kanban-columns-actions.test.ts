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
  getKanbanColumns,
  createKanbanColumn,
  updateKanbanColumn,
  reorderKanbanColumns,
  deleteKanbanColumn,
} from "@/lib/actions/kanban-columns";

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

const TEST_USER_ID = "aaaaaaaa-1111-4444-9999-000000000001";
const TEST_COL_ID_1 = "aaaaaaaa-2222-4444-9999-000000000001";
const TEST_COL_ID_2 = "aaaaaaaa-3333-4444-9999-000000000001";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Wire up the fluent Supabase chain.
 * Every chaining method returns mockSupabase by default.
 * IMPORTANT: order() returns mockSupabase for chaining (create/update tests),
 * but getKanbanColumns tests override it individually.
 */
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

  // Reset single() fully between tests to prevent mockResolvedValueOnce leaks
  mockSupabase.single.mockReset();
});

// ===========================================================================
// getKanbanColumns
// ===========================================================================

describe("getKanbanColumns", () => {
  const validColumns = [
    { id: TEST_COL_ID_1, title: "Todo", position: 0 },
    { id: TEST_COL_ID_2, title: "Done", position: 1 },
  ];

  // In getKanbanColumns the chain is:
  //   await supabase.from("kanban_columns")
  //     .select("id, title, position")
  //     .eq("user_id", user.id)
  //     .order("position");
  // The result is destructured as `{ data }`, so order() must resolve to
  // { data: [...], error?: ... } — NOT mockSupabase.

  it("returns columns array when Supabase returns valid data", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: validColumns,
      error: null,
    });

    const result = await getKanbanColumns();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual(validColumns[0]);
    expect(result[1]).toEqual(validColumns[1]);
  });

  it("returns empty array when no columns exist", async () => {
    mockSupabase.order.mockResolvedValueOnce({ data: null, error: null });

    const result = await getKanbanColumns();

    expect(result).toEqual([]);
  });

  it("queries kanban_columns ordered by position for the authenticated user", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: validColumns,
      error: null,
    });

    await getKanbanColumns();

    expect(mockSupabase.from).toHaveBeenCalledWith("kanban_columns");
    expect(mockSupabase.select).toHaveBeenCalledWith("id, title, position");
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", TEST_USER_ID);
    expect(mockSupabase.order).toHaveBeenCalledWith("position");
  });

  // -- Zod validation (KanbanColumnSchema) ----------------------------------
  // provide invalid data via order() → .parse() throws

  it("returns empty array when data has invalid shape (missing uuid id)", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [{ id: "not-a-uuid", title: "Col", position: 0 }],
      error: null,
    });

    const result = await getKanbanColumns();
    expect(result).toEqual([]);
  });

  it("returns empty array when position is not a number", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [
        {
          id: TEST_COL_ID_1,
          title: "Col",
          position: "first",
        },
      ],
      error: null,
    });

    const result = await getKanbanColumns();
    expect(result).toEqual([]);
  });

  it("returns empty array when title is missing", async () => {
    mockSupabase.order.mockResolvedValueOnce({
      data: [{ id: TEST_COL_ID_1, position: 0 }],
      error: null,
    });

    const result = await getKanbanColumns();
    expect(result).toEqual([]);
  });

  // -- Auth ----------------------------------------------------------------

  it("returns empty array when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await getKanbanColumns();

    expect(result).toEqual([]);
  });
});

// ===========================================================================
// createKanbanColumn
// ===========================================================================

describe("createKanbanColumn", () => {
  const createdColumn = {
    id: TEST_COL_ID_1,
    title: "In Progress",
    position: 2,
  };

  // createKanbanColumn calls single() twice:
  //   1) fetch last position via .limit(1).single()
  //   2) insert result via .select("id, title, position").single()
  // Between them, order() and limit() return mockSupabase for chaining.

  it("creates a column and returns it with correct shape { data?, error? }", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { position: 1 }, error: null })
      .mockResolvedValueOnce({ data: createdColumn, error: null });

    const result = await createKanbanColumn("In Progress");

    expect(result.data).toEqual(createdColumn);
    expect(result.error).toBeUndefined();
    expect(result).toHaveProperty("data");
    // When no error, the object should not have an "error" key at all
    expect(Object.prototype.hasOwnProperty.call(result, "error")).toBe(false);
  });

  it("inserts with computed position (last position + 1)", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { position: 3 }, error: null })
      .mockResolvedValueOnce({
        data: { ...createdColumn, position: 4 },
        error: null,
      });

    const result = await createKanbanColumn("New Col");

    expect(result.data!.position).toBe(4);
    const insertPayload = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertPayload.position).toBe(4);
  });

  it("defaults to position 0 when no existing columns", async () => {
    // last query returns null (no rows)
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
      data: { ...createdColumn, position: 0 },
      error: null,
    });

    const result = await createKanbanColumn("First Col");

    expect(result.data!.position).toBe(0);
  });

  it("calls revalidatePath for /kanban after creation", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { position: 0 }, error: null })
      .mockResolvedValueOnce({ data: createdColumn, error: null });

    await createKanbanColumn("In Progress");

    expect(revalidatePath).toHaveBeenCalledWith("/kanban", "layout");
  });

  // -- Zod validation -------------------------------------------------------

  it("returns Zod error when title is empty", async () => {
    const result = await createKanbanColumn("");

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
    expect(result.error).not.toBe("Not authenticated");
  });

  it("returns Zod error when title exceeds 100 characters", async () => {
    const longTitle = "x".repeat(101);

    const result = await createKanbanColumn(longTitle);

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it("accepts title at exactly 100 characters", async () => {
    const exactTitle = "x".repeat(100);
    mockSupabase.single
      .mockResolvedValueOnce({ data: { position: 0 }, error: null })
      .mockResolvedValueOnce({
        data: { ...createdColumn, title: exactTitle },
        error: null,
      });

    const result = await createKanbanColumn(exactTitle);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await createKanbanColumn("My Column");

    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeUndefined();
  });

  // -- Supabase error propagation -------------------------------------------

  it("returns Supabase error message on insert failure", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({ data: { position: 0 }, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Unique constraint violation" },
      });

    const result = await createKanbanColumn("Dupe");

    expect(result.error).toBe("Unique constraint violation");
    expect(result.data).toBeUndefined();
  });
});

// ===========================================================================
// updateKanbanColumn
// ===========================================================================

describe("updateKanbanColumn", () => {
  const updatedColumn = {
    id: TEST_COL_ID_1,
    title: "Updated Title",
    position: 0,
  };

  // updateKanbanColumn calls single() once (the update result).

  it("updates a column title and returns updated data", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: updatedColumn,
      error: null,
    });

    const result = await updateKanbanColumn(TEST_COL_ID_1, "Updated Title");

    expect(result.data).toEqual(updatedColumn);
    expect(result.error).toBeUndefined();
    expect(mockSupabase.update).toHaveBeenCalledWith({ title: "Updated Title" });
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", TEST_COL_ID_1);
  });

  it("calls revalidatePath for /kanban after update", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: updatedColumn,
      error: null,
    });

    await updateKanbanColumn(TEST_COL_ID_1, "Updated Title");

    expect(revalidatePath).toHaveBeenCalledWith("/kanban", "layout");
  });

  // -- Zod validation -------------------------------------------------------

  it("returns Zod error when title is empty", async () => {
    const result = await updateKanbanColumn(TEST_COL_ID_1, "");

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  it("returns Zod error when title exceeds 100 characters", async () => {
    const result = await updateKanbanColumn(TEST_COL_ID_1, "x".repeat(101));

    expect(result.data).toBeUndefined();
    expect(result.error).toBeDefined();
  });

  // -- Not found ------------------------------------------------------------

  it("catches and returns error message when Zod .parse() throws on null data", async () => {
    // single() returns null data → KanbanColumnSchema.parse(null) throws
    // → caught by try/catch → returns { error: "Failed to update column" }
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await updateKanbanColumn(TEST_COL_ID_1, "Valid Title");

    expect(result.error).toBeDefined();
    expect(result.data).toBeUndefined();
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await updateKanbanColumn(TEST_COL_ID_1, "Valid Title");

    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeUndefined();
  });

  // -- Supabase error propagation -------------------------------------------

  it("returns Supabase error on update failure", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "Column not found" },
    });

    const result = await updateKanbanColumn(TEST_COL_ID_1, "Valid Title");

    expect(result.error).toBe("Column not found");
    expect(result.data).toBeUndefined();
  });
});

// ===========================================================================
// reorderKanbanColumns
// ===========================================================================

describe("reorderKanbanColumns", () => {
  const ids = [TEST_COL_ID_2, TEST_COL_ID_1]; // reverse order

  // The loop does: await supabase.from(...).update({ position: i }).eq("id", ids[i])
  // eq() is the terminal method; its return value is await-ed and destructured as { error }.

  it("reorders columns by updating each position to its index", async () => {
    const result = await reorderKanbanColumns(ids);

    expect(result.error).toBeUndefined();
    expect(mockSupabase.update).toHaveBeenCalledTimes(2);
    expect(mockSupabase.update.mock.calls[0][0]).toEqual({ position: 0 });
    expect(mockSupabase.update.mock.calls[1][0]).toEqual({ position: 1 });
  });

  it("returns empty object on success", async () => {
    const result = await reorderKanbanColumns(ids);

    expect(result).toEqual({});
    expect(result.error).toBeUndefined();
  });

  it("calls revalidatePath for /kanban", async () => {
    await reorderKanbanColumns(ids);

    expect(revalidatePath).toHaveBeenCalledWith("/kanban", "layout");
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await reorderKanbanColumns(ids);

    expect(result.error).toBe("Not authenticated");
  });

  // -- Error propagation ----------------------------------------------------
  // For the error case, eq() must return { error: { message: "..." } }
  // so that `const { error } = await ...eq(...)` picks it up.

  it("propagates Supabase error on update failure and stops loop", async () => {
    // Override eq() to return { error: { message: "Update failed" } } once
    mockSupabase.eq.mockReturnValueOnce({
      error: { message: "Update failed" },
    });

    const result = await reorderKanbanColumns(ids);

    expect(result.error).toBe("Update failed");
    // Should have stopped after the first failure (update was called, then eq() returned error)
    expect(mockSupabase.update).toHaveBeenCalledTimes(1);
  });

  it("handles empty array gracefully", async () => {
    const result = await reorderKanbanColumns([]);

    expect(result.error).toBeUndefined();
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// deleteKanbanColumn
// ===========================================================================

describe("deleteKanbanColumn", () => {
  it("deletes a column and returns empty object on success", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: TEST_COL_ID_2 },
      error: null,
    });

    const result = await deleteKanbanColumn(TEST_COL_ID_1);

    expect(result).toEqual({});
    expect(result.error).toBeUndefined();
  });

  it("moves tasks to fallback column before deleting", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: TEST_COL_ID_2 },
      error: null,
    });

    await deleteKanbanColumn(TEST_COL_ID_1);

    // from() is called for the fallback fetch (kanban_columns), then for
    // the task migration (tasks), then for the delete (kanban_columns).
    // We check that "tasks" was among the from() calls.
    const fromCalls = mockSupabase.from.mock.calls.map((call: any[]) => call[0]);
    expect(fromCalls).toContain("tasks");

    expect(mockSupabase.update).toHaveBeenCalledWith({
      kanban_column_id: TEST_COL_ID_2,
    });
  });

  it("skips task migration when no fallback column exists", async () => {
    // find fallback → returns null (no other columns)
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    await deleteKanbanColumn(TEST_COL_ID_1);

    // from() was NOT called with "tasks"
    const fromCalls = mockSupabase.from.mock.calls.map((call: any[]) => call[0]);
    expect(fromCalls).not.toContain("tasks");
    // But kanban_columns was called (for fallback fetch and/or delete)
    expect(fromCalls).toContain("kanban_columns");
  });

  it("deletes the column from kanban_columns", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: TEST_COL_ID_2 },
      error: null,
    });

    await deleteKanbanColumn(TEST_COL_ID_1);

    expect(mockSupabase.delete).toHaveBeenCalled();
  });

  it("calls revalidatePath for /kanban", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: { id: TEST_COL_ID_2 },
      error: null,
    });

    await deleteKanbanColumn(TEST_COL_ID_1);

    expect(revalidatePath).toHaveBeenCalledWith("/kanban", "layout");
  });

  // -- Auth check -----------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({
      supabase: mockSupabase as any,
      user: null,
    });

    const result = await deleteKanbanColumn(TEST_COL_ID_1);

    expect(result.error).toBe("Not authenticated");
  });

  // -- Fallback fetch failures ----------------------------------------------

  it("still completes when fallback fetch returns error (not checked)", async () => {
    mockSupabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "DB error" },
    });

    const result = await deleteKanbanColumn(TEST_COL_ID_1);

    // The code does not check fallback fetch errors, so it proceeds
    expect(result).toEqual({});
    expect(result.error).toBeUndefined();
  });

  it("still deletes column even when fallback fetch returns null", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

    const result = await deleteKanbanColumn(TEST_COL_ID_1);

    expect(result).toEqual({});
    expect(mockSupabase.delete).toHaveBeenCalled();
  });
});
