/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — vi.mock is hoisted; must not reference outer-scope variables
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth/requireUser", () => ({
  requireUser: vi.fn(),
}));

vi.mock("@/lib/gamification/engine", () => ({
  completeTask: vi.fn().mockResolvedValue(undefined),
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
}));

// ---------------------------------------------------------------------------
// Imports (after mock hoisting, so they resolve to mocked modules)
// ---------------------------------------------------------------------------

import { requireUser } from "@/lib/auth/requireUser";
import { completeTask, checkAndAwardAchievements } from "@/lib/gamification/engine";
import { revalidatePath } from "next/cache";
import {
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  getTasks,
  getTaskById,
} from "@/lib/actions/tasks";

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockRequireUser = vi.mocked(requireUser);
const mockCompleteTask = vi.mocked(completeTask);
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
  upsert: vi.fn(),
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
  // Default: rpc() resolves to empty
  mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
  // Default: non-single queries get empty data
  mockSupabase.data = [];
  mockSupabase.error = null;
});

// ===========================================================================
// createTask
// ===========================================================================

describe("createTask", () => {
  it("creates task with valid input", async () => {
    const createdTask = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      title: "Test Task",
      priority: "p2",
      status: "todo",
      tags: ["frontend"],
      xp_reward: 30,
    };
    mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

    const fd = mockFormData({
      title: "Test Task",
      description: "Do the thing",
      priority: "p2",
      tags: '["frontend"]',
    });

    const result = await createTask(fd);
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(createdTask);

    // Verify insert was called with correct data
    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.title).toBe("Test Task");
    expect(insertCall.priority).toBe("p2");
    expect(insertCall.xp_reward).toBe(30);
    expect(insertCall.tags).toEqual(["frontend"]);
    expect(insertCall.status).toBe("todo");
    expect(insertCall.user_id).toBe("test-user-id");
  });

  it("returns error when title is missing", async () => {
    const fd = mockFormData({ title: "" });
    const result = await createTask(fd);
    expect(result.error).toBe("Title is required");
    expect(result.data).toBeUndefined();
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ title: "Test" });
    const result = await createTask(fd);
    expect(result.error).toBe("Not authenticated");
  });

  it("throws on invalid JSON in tags", async () => {
    const fd = mockFormData({
      title: "Test",
      tags: "{invalid-json",
    });

    await expect(createTask(fd)).rejects.toThrow();
  });

  it("defaults status to todo when not backlog", async () => {
    const createdTask = { id: "t1", title: "Task", status: "todo" };
    mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

    const fd = mockFormData({
      title: "Task",
      priority: "p3",
    });

    await createTask(fd);
    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.status).toBe("todo");
  });

  it("sets status to backlog when requested", async () => {
    const createdTask = { id: "t1", title: "Task", status: "backlog" };
    mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

    const fd = mockFormData({
      title: "Task",
      priority: "p3",
      status: "backlog",
    });

    await createTask(fd);
    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.status).toBe("backlog");
  });

  it("propagates Supabase insert error", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const fd = mockFormData({ title: "Test", priority: "p3" });
    const result = await createTask(fd);
    expect(result.error).toBe("DB error");
  });

  // --- K1: Time Estimation ---

  it("creates task with estimated_minutes (S1)", async () => {
    const createdTask = { id: "t1", title: "Task", estimated_minutes: 30 };
    mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

    const fd = mockFormData({
      title: "Task",
      priority: "p3",
      estimated_minutes: "30",
    });

    await createTask(fd);
    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.estimated_minutes).toBe(30);
  });

  it("creates task without estimated_minutes — stores null (S4)", async () => {
    const createdTask = { id: "t1", title: "Task" };
    mockSupabase.single.mockResolvedValue({ data: createdTask, error: null });

    const fd = mockFormData({ title: "Task", priority: "p3" });
    await createTask(fd);
    const insertCall = mockSupabase.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertCall.estimated_minutes).toBeNull();
  });
});

// ===========================================================================
// updateTask
// ===========================================================================

describe("updateTask", () => {
  const taskId = "550e8400-e29b-41d4-a716-4466554400aa";

  beforeEach(() => {
    // Reset gamification mocks
    mockCompleteTask.mockResolvedValue(undefined as any);
    mockCheckAndAward.mockResolvedValue([]);
  });

  it("changes task status", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "in_progress", previous_status: null },
        error: null,
      });

    const fd = mockFormData({ status: "in_progress" });
    const result = await updateTask(taskId, fd);

    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.status).toBe("in_progress");
  });

  it("changes priority and updates xp_reward", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, priority: "p1", xp_reward: 50 },
        error: null,
      });

    const fd = mockFormData({ priority: "p1" });
    await updateTask(taskId, fd);

    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall.priority).toBe("p1");
    expect(updateCall.xp_reward).toBe(50);
  });

  it("saves previous_status when moving to backlog (D7a)", async () => {
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

  it("clears previous_status when moving out of backlog (D7a)", async () => {
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

  it("does not modify previous_status when status stays same", async () => {
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
    expect(updateCall).not.toHaveProperty("previous_status");
  });

  it("awards XP when task is completed (status → done)", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p2" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "done", priority: "p2" },
        error: null,
      });

    const fd = mockFormData({ status: "done" });
    const result = await updateTask(taskId, fd);

    expect(result.error).toBeUndefined();
    expect(mockCompleteTask).toHaveBeenCalledWith("test-user-id", "p2");
    expect(mockCheckAndAward).toHaveBeenCalledWith("test-user-id");
  });

  it("does not award XP when already done", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "done", priority: "p2" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "done", priority: "p2" },
        error: null,
      });

    const fd = mockFormData({ status: "done" });
    await updateTask(taskId, fd);

    expect(mockCompleteTask).not.toHaveBeenCalled();
  });

  it("handles gamification failure gracefully", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3" },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "done", priority: "p3" },
        error: null,
      });

    mockCompleteTask.mockRejectedValue(new Error("Gamification crash"));

    const fd = mockFormData({ status: "done" });
    const result = await updateTask(taskId, fd);

    // Gamification failure should NOT block the task update
    expect(result.error).toBeUndefined();
    expect(result.data).toBeDefined();
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const fd = mockFormData({ status: "todo" });
    const result = await updateTask(taskId, fd);
    expect(result.error).toBe("Not authenticated");
  });

  // --- K1: Time Estimation — completion auto-capture ---

  it("auto-captures actual_minutes on completion → done (S2)", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3", estimated_minutes: 45, actual_minutes: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "done" },
        error: null,
      });

    const fd = mockFormData({ status: "done" });
    const result = await updateTask(taskId, fd);

    expect(result.error).toBeUndefined();
    expect(mockCompleteTask).toHaveBeenCalledWith("test-user-id", "p3");
    expect(mockCheckAndAward).toHaveBeenCalledWith("test-user-id");

    const updateCalls = mockSupabase.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const actualUpdateCall = updateCalls[1][0] as Record<string, unknown>;
    expect(actualUpdateCall.actual_minutes).toBe(45);
  });

  it("auto-captures actual_minutes on completion → missed (S3) — no XP", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "todo", priority: "p3", estimated_minutes: 60, actual_minutes: null },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "missed" },
        error: null,
      });

    const fd = mockFormData({ status: "missed" });
    const result = await updateTask(taskId, fd);

    expect(result.error).toBeUndefined();
    expect(mockCompleteTask).not.toHaveBeenCalled();
    expect(mockCheckAndAward).not.toHaveBeenCalled();

    const updateCalls = mockSupabase.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThanOrEqual(2);
    const actualUpdateCall = updateCalls[1][0] as Record<string, unknown>;
    expect(actualUpdateCall.actual_minutes).toBe(60);
  });

  it("does not auto-capture actual_minutes when already completed", async () => {
    mockSupabase.single
      .mockResolvedValueOnce({
        data: { status: "done", priority: "p3", estimated_minutes: 30, actual_minutes: 30 },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { id: taskId, status: "done" },
        error: null,
      });

    const fd = mockFormData({ status: "done" });
    await updateTask(taskId, fd);

    // Only one update call (no actual_minutes auto-update on already-done)
    expect(mockSupabase.update.mock.calls.length).toBe(1);
  });
});

// ===========================================================================
// deleteTask
// ===========================================================================

describe("deleteTask", () => {
  it("soft-deletes by setting deleted_at", async () => {
    mockSupabase.error = null;

    const taskId = "550e8400-e29b-41d4-a716-4466554400bb";
    const result = await deleteTask(taskId);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify update was called with deleted_at
    const updateCall = mockSupabase.update.mock.calls[0][0] as Record<string, unknown>;
    expect(updateCall).toHaveProperty("deleted_at");
    expect(typeof updateCall.deleted_at).toBe("string");

    // Verify filtering by id and user_id
    expect(mockSupabase.eq).toHaveBeenCalledWith("id", taskId);
    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "test-user-id");

    // Verify revalidation
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/tasks", "layout");
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await deleteTask("550e8400-e29b-41d4-a716-4466554400cc");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("propagates Supabase error", async () => {
    mockSupabase.error = { message: "DB constraint violation" };

    const result = await deleteTask("550e8400-e29b-41d4-a716-4466554400dd");
    expect(result.success).toBe(false);
    expect(result.error).toBe("DB constraint violation");
  });
});

// ===========================================================================
// reorderTasks
// ===========================================================================

describe("reorderTasks", () => {
  it("validates UUIDs and calls RPC", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const taskIds = [
      "550e8400-e29b-41d4-a716-446655440001",
      "550e8400-e29b-41d4-a716-446655440002",
    ];

    const result = await reorderTasks(taskIds);
    expect(result.success).toBe(true);

    expect(mockSupabase.rpc).toHaveBeenCalledWith("reorder_tasks", {
      p_task_ids: taskIds,
    });
  });

  it("rejects empty array", async () => {
    const result = await reorderTasks([]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid task IDs");
  });

  it("rejects non-UUID values", async () => {
    const result = await reorderTasks(["not-a-uuid"]);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid task IDs");
  });

  it("returns error when not authenticated", async () => {
    const validUuids = ["550e8400-e29b-41d4-a716-446655440001"];
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await reorderTasks(validUuids);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Not authenticated");
  });

  it("handles RPC error", async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: "RPC failed" },
    });

    const taskIds = ["550e8400-e29b-41d4-a716-446655440001"];
    const result = await reorderTasks(taskIds);
    expect(result.success).toBe(false);
    expect(result.error).toBe("RPC failed");
  });

  it("calls revalidatePath on success", async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: null });

    const taskIds = ["550e8400-e29b-41d4-a716-446655440001"];
    await reorderTasks(taskIds);

    expect(revalidatePath).toHaveBeenCalledWith("/tasks", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/kanban", "layout");
  });
});

// ===========================================================================
// getTasks
// ===========================================================================

describe("getTasks", () => {
  it("returns filtered tasks ordered by sort_order", async () => {
    const tasks = [
      { id: "t1", title: "Task 1", sort_order: 0 },
      { id: "t2", title: "Task 2", sort_order: 1 },
    ];
    mockSupabase.data = tasks;
    mockSupabase.error = null;

    const result = await getTasks();

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(tasks);

    // Verify soft-delete filter
    expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);

    // Verify default order is sort_order
    expect(mockSupabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("returns tasks ordered by created_at when requested", async () => {
    const tasks = [{ id: "t1", title: "Task 1" }];
    mockSupabase.data = tasks;
    mockSupabase.error = null;

    await getTasks("created_at");

    // Should only order by created_at, not sort_order
    const orderCalls = mockSupabase.order.mock.calls;
    const hasSortOrderCall = orderCalls.some(
      (call: any[]) => call[0] === "sort_order",
    );
    expect(hasSortOrderCall).toBe(false);
  });

  it("returns empty array for no tasks", async () => {
    mockSupabase.data = [];
    mockSupabase.error = null;

    const result = await getTasks();
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual([]);
  });

  it("filters out soft-deleted tasks", async () => {
    mockSupabase.data = [];
    mockSupabase.error = null;

    await getTasks();
    expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getTasks();
    expect(result.error).toBe("Not authenticated");
    expect(result.data).toBeUndefined();
  });

  it("propagates Supabase query error", async () => {
    mockSupabase.data = null;
    mockSupabase.error = { message: "Query failed" };

    const result = await getTasks();
    expect(result.error).toBe("Query failed");
  });
});

// ===========================================================================
// getTaskById
// ===========================================================================

describe("getTaskById", () => {
  const taskId = "550e8400-e29b-41d4-a716-4466554400ee";

  it("returns single task", async () => {
    const task = { id: taskId, title: "My Task", status: "todo" };
    mockSupabase.single.mockResolvedValue({ data: task, error: null });

    const result = await getTaskById(taskId);

    expect(result.error).toBeUndefined();
    expect(result.data).toEqual(task);
  });

  it("returns error when task not found", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "No rows found" },
    });

    const result = await getTaskById(taskId);
    expect(result.error).toBe("No rows found");
    expect(result.data).toBeUndefined();
  });

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getTaskById(taskId);
    expect(result.error).toBe("Not authenticated");
  });

  it("filters by user_id and soft-delete", async () => {
    const task = { id: taskId, title: "Task" };
    mockSupabase.single.mockResolvedValue({ data: task, error: null });

    await getTaskById(taskId);

    expect(mockSupabase.eq).toHaveBeenCalledWith("user_id", "test-user-id");
    expect(mockSupabase.is).toHaveBeenCalledWith("deleted_at", null);
  });
});
