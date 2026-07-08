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
import { bulkUpdateTaskStatuses, updateTask } from "@/lib/actions/tasks";

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockRequireUser = vi.mocked(requireUser);

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  rpc: vi.fn(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wire up the fluent Supabase chain: every chaining method returns mockSupabase. */
function setupChain() {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
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
  setupChain();

  mockRequireUser.mockResolvedValue({
    supabase: mockSupabase as any,
    user: { id: "test-user-id" } as any,
  });

  // Default: single() resolves to empty data (no error)
  mockSupabase.single.mockResolvedValue({ data: [], error: null });
});

// ===========================================================================
// bulkUpdateTaskStatuses
// ===========================================================================

describe("bulkUpdateTaskStatuses", () => {
  // -- Validation -----------------------------------------------------------

  it("rejects non-array input", async () => {
    // @ts-expect-error testing runtime validation
    const result = await bulkUpdateTaskStatuses("not-an-array");
    expect(result.success).toBe(false);
    expect(result.error).toBe("No updates provided");
  });

  it("rejects empty array", async () => {
    const result = await bulkUpdateTaskStatuses([]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("No updates provided");
  });

  it("rejects more than 500 updates", async () => {
    const updates = Array.from({ length: 501 }, (_, i) => ({
      taskId: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
      newStatus: "todo",
    }));
    const result = await bulkUpdateTaskStatuses(updates);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Too many tasks (max 500)");
  });

  it("rejects invalid UUID task IDs", async () => {
    const result = await bulkUpdateTaskStatuses([
      { taskId: "not-a-uuid", newStatus: "todo" },
    ]);
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid task ID");
  });

  // -- Auth ----------------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await bulkUpdateTaskStatuses([
      { taskId: "550e8400-e29b-41d4-a716-446655440001", newStatus: "todo" },
    ]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  // -- D7a: previous_status for backlog moves -------------------------------

  it("saves previous_status when moving to backlog", async () => {
    const result = await bulkUpdateTaskStatuses([
      {
        taskId: "550e8400-e29b-41d4-a716-446655440001",
        newStatus: "backlog",
        previousStatus: "todo",
      },
    ]);
    expect(result.success).toBe(true);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("backlog");
    expect(updateCall.previous_status).toBe("todo");
    expect(updateCall).toHaveProperty("updated_at");
  });

  it("clears previous_status when moving out of backlog", async () => {
    const result = await bulkUpdateTaskStatuses([
      {
        taskId: "550e8400-e29b-41d4-a716-446655440002",
        newStatus: "todo",
      },
    ]);
    expect(result.success).toBe(true);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("todo");
    expect(updateCall.previous_status).toBeNull();
    expect(updateCall).toHaveProperty("updated_at");
  });

  it("does not include previous_status when newStatus is backlog but no previousStatus provided", async () => {
    const result = await bulkUpdateTaskStatuses([
      {
        taskId: "550e8400-e29b-41d4-a716-446655440003",
        newStatus: "backlog",
        // no previousStatus
      },
    ]);
    expect(result.success).toBe(true);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("backlog");
    // previous_status should NOT be set when no previousStatus argument
    expect(updateCall.previous_status).toBeUndefined();
  });

  // -- Revalidation ---------------------------------------------------------

  it("calls revalidatePath for /tasks and /dashboard", async () => {
    await bulkUpdateTaskStatuses([
      { taskId: "550e8400-e29b-41d4-a716-446655440001", newStatus: "todo" },
    ]);

    expect(revalidatePath).toHaveBeenCalledWith("/tasks", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  // -- Error propagation ----------------------------------------------------

  it("propagates Supabase error on update failure", async () => {
    // Override the chain: the final eq() returns an object carrying an error.
    const errorSupabase = {
      ...mockSupabase,
      error: { message: "DB constraint violation" },
    };
    mockSupabase.from.mockReturnValue(errorSupabase);
    mockSupabase.update.mockReturnValue(errorSupabase);
    mockSupabase.eq.mockReturnValue(errorSupabase);

    const result = await bulkUpdateTaskStatuses([
      { taskId: "550e8400-e29b-41d4-a716-446655440001", newStatus: "todo" },
    ]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB constraint violation");
  });
});

// ===========================================================================
// updateTask — D7a previous_status
// ===========================================================================

describe("updateTask — D7a previous_status", () => {
  const taskId = "550e8400-e29b-41d4-a716-4466554400ff";

  it("saves previous_status when moving to backlog", async () => {
    // First .single(): fetch current task (status "todo")
    // Second .single(): the update result
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "backlog", previous_status: "todo" },
        error: null,
      });

    const fd = mockFormData({ status: "backlog" });
    await updateTask(taskId, fd);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("backlog");
    expect(updateCall.previous_status).toBe("todo");
  });

  it("clears previous_status when moving out of backlog", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "backlog", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "todo", previous_status: null },
        error: null,
      });

    const fd = mockFormData({ status: "todo" });
    await updateTask(taskId, fd);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("todo");
    expect(updateCall.previous_status).toBeNull();
  });

  it("does not change previous_status when staying in same status", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "todo" },
        error: null,
      });

    const fd = mockFormData({ status: "todo" });
    await updateTask(taskId, fd);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("todo");
    // previous_status must NOT be in the update payload
    expect(updateCall).not.toHaveProperty("previous_status");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ status: "todo" });
    const result = await updateTask(taskId, fd);
    expect(result.error).toBe("Not authenticated");
  });
});
