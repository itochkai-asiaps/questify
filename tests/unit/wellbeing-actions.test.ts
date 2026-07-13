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
  createWellbeingEntry,
  getTodaysLatestEntry,
  getWellbeingHistory,
} from "@/lib/actions/wellbeing";
import type { WellbeingEntry } from "@/types/wellbeing";

// ---------------------------------------------------------------------------
// Typed mock references
// ---------------------------------------------------------------------------

const mockRequireUser = vi.mocked(requireUser);

/** Valid UUID that passes <tt>WellbeingEntrySchema</tt> (3rd group starts 1-8, 4th 89abAB). */
const TEST_USER_ID = "550e8400-e29b-41d4-a716-446655440000";

const mockSupabase = {
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  // Properties accessed directly when the chain is awaited without
  // .single()/.maybeSingle() (count query and history query)
  count: 0,
  data: [] as unknown[],
  error: null as { message: string } | null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wire up the fluent Supabase chain: every chaining method returns mockSupabase. */
function setupChain() {
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.gte.mockReturnValue(mockSupabase);
  mockSupabase.lte.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
}

/** Build a minimal valid WellbeingEntry for mock data. */
function makeEntry(overrides: Partial<WellbeingEntry> = {}): WellbeingEntry {
  return {
    id: "550e8400-e29b-41d4-a716-446655440001",
    user_id: TEST_USER_ID,
    mood_score: 75,
    note: "Feeling good",
    created_at: "2026-07-08T10:00:00.000Z",
    ...overrides,
  };
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

  // Reset fallback properties (used by count/history chains)
  mockSupabase.count = 0;
  mockSupabase.data = [];
  mockSupabase.error = null;

  // Default: single() / maybeSingle() resolve to null data (no error)
  mockSupabase.single.mockResolvedValue({ data: null, error: null });
  mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
});

// ===========================================================================
// createWellbeingEntry
// ===========================================================================

describe("createWellbeingEntry", () => {
  // -- Successful creation ---------------------------------------------------

  it("creates an entry and returns parsed data", async () => {
    const entry = makeEntry();
    mockSupabase.single.mockResolvedValue({ data: entry, error: null });

    const result = await createWellbeingEntry(75, "Feeling good");

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(entry);
  });

  it("calls revalidatePath for /dashboard layout on success", async () => {
    const entry = makeEntry();
    mockSupabase.single.mockResolvedValue({ data: entry, error: null });

    await createWellbeingEntry(75);

    expect(revalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
  });

  it("passes note as null when omitted", async () => {
    const entry = makeEntry({ note: null });
    mockSupabase.single.mockResolvedValue({ data: entry, error: null });

    await createWellbeingEntry(80);

    const insertCall = mockSupabase.insert.mock.calls[0]?.[0] as
      Record<string, unknown> | undefined;
    expect(insertCall).toBeDefined();
    expect(insertCall?.note).toBeNull();
  });

  // -- Zod validation --------------------------------------------------------

  it("rejects mood score below 0", async () => {
    const result = await createWellbeingEntry(-1);

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/too small/i);
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("rejects mood score above 100", async () => {
    const result = await createWellbeingEntry(101);

    expect(result.error).toBeDefined();
    expect(result.error).toContain("Score must be 0-100");
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("rejects non-integer mood score", async () => {
    const result = await createWellbeingEntry(50.5);

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/int/i);
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("rejects note longer than 500 characters", async () => {
    const longNote = "x".repeat(501);

    const result = await createWellbeingEntry(50, longNote);

    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/500|too big/i);
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("accepts edge score of 0", async () => {
    const entry = makeEntry({ mood_score: 0 });
    mockSupabase.single.mockResolvedValue({ data: entry, error: null });

    const result = await createWellbeingEntry(0);

    expect(result.error).toBeUndefined();
    expect(("data" in result ? result.data : undefined)?.mood_score).toBe(0);
  });

  it("accepts edge score of 100", async () => {
    const entry = makeEntry({ mood_score: 100 });
    mockSupabase.single.mockResolvedValue({ data: entry, error: null });

    const result = await createWellbeingEntry(100);

    expect(result.error).toBeUndefined();
    expect(("data" in result ? result.data : undefined)?.mood_score).toBe(100);
  });

  // -- Auth -----------------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await createWellbeingEntry(50);

    expect(result.error).toBe("Not authenticated");
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  // -- Daily cap -------------------------------------------------------------

  it("rejects when daily limit of 48 is reached", async () => {
    mockSupabase.count = 48;

    const result = await createWellbeingEntry(50);

    expect(result.error).toBe("Limit reached: 48 entries per day");
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  // -- Error propagation ----------------------------------------------------

  it("returns error on count query failure", async () => {
    mockSupabase.error = { message: "Connection lost" };

    const result = await createWellbeingEntry(50);

    expect(result.error).toBe("Connection lost");
    expect(mockSupabase.insert).not.toHaveBeenCalled();
  });

  it("returns error on insert failure", async () => {
    mockSupabase.single.mockResolvedValue({
      data: null,
      error: { message: "Duplicate entry" },
    });

    const result = await createWellbeingEntry(50);

    expect(result.error).toBe("Duplicate entry");
  });
});

// ===========================================================================
// getTodaysLatestEntry
// ===========================================================================

describe("getTodaysLatestEntry", () => {
  // -- Successful retrieval --------------------------------------------------

  it("returns latest entry for today", async () => {
    const entry = makeEntry({ mood_score: 85, note: "Great day!" });
    mockSupabase.maybeSingle.mockResolvedValue({ data: entry, error: null });

    const result = await getTodaysLatestEntry();

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(entry);
  });

  it("returns null when no entry exists for today", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await getTodaysLatestEntry();

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toBeNull();
  });

  it("queries with descending order and limit 1", async () => {
    // Provide valid input for Zod parse; we only verify the query shape
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    await getTodaysLatestEntry();

    expect(mockSupabase.select).toHaveBeenCalledWith("*");
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(mockSupabase.limit).toHaveBeenCalledWith(1);
    expect(mockSupabase.maybeSingle).toHaveBeenCalled();
  });

  // -- Auth -----------------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getTodaysLatestEntry();

    expect(result.error).toBe("Not authenticated");
  });

  // -- Error propagation ----------------------------------------------------

  it("returns error on Supabase failure", async () => {
    mockSupabase.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "Timeout" },
    });

    const result = await getTodaysLatestEntry();

    expect(result.error).toBe("Timeout");
  });
});

// ===========================================================================
// getWellbeingHistory
// ===========================================================================

describe("getWellbeingHistory", () => {
  // -- Successful retrieval --------------------------------------------------

  it("returns entries for requested number of days", async () => {
    const entries: WellbeingEntry[] = [
      makeEntry(),
      makeEntry({ id: "550e8400-e29b-41d4-a716-446655440002", mood_score: 60 }),
    ];
    mockSupabase.data = entries;

    const result = await getWellbeingHistory(14);

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(entries);
    expect("data" in result ? result.data : undefined).toHaveLength(2);
  });

  it("defaults to 7 days when no argument provided", async () => {
    const entries: WellbeingEntry[] = [makeEntry()];
    mockSupabase.data = entries;

    const result = await getWellbeingHistory();

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual(entries);
  });

  it("returns empty array when no entries found", async () => {
    mockSupabase.data = [];

    const result = await getWellbeingHistory(7);

    expect(result.error).toBeUndefined();
    expect("data" in result ? result.data : undefined).toEqual([]);
  });

  it("queries with ascending order", async () => {
    mockSupabase.data = [makeEntry()];

    await getWellbeingHistory(7);

    expect(mockSupabase.select).toHaveBeenCalledWith("*");
    expect(mockSupabase.order).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  // -- Auth -----------------------------------------------------------------

  it("returns error when not authenticated", async () => {
    mockRequireUser.mockResolvedValue({ supabase: mockSupabase as any, user: null });

    const result = await getWellbeingHistory();

    expect(result.error).toBe("Not authenticated");
  });

  // -- Error propagation ----------------------------------------------------

  it("returns error on Supabase failure", async () => {
    mockSupabase.error = { message: "Connection refused" };

    const result = await getWellbeingHistory(7);

    expect(result.error).toBe("Connection refused");
  });
});
