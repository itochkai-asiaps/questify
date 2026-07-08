/// <reference types="vitest/globals" />

// ---------------------------------------------------------------------------
// Global test setup — mocks for Supabase, Next.js, and environment
// Applied via vitest.config.ts → setupFiles
// ---------------------------------------------------------------------------

import { vi } from "vitest";

// ---------------------------------------------------------------------------
// Environment variables required by Supabase client
// ---------------------------------------------------------------------------

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ.6257dc51ef27a22cce4b14d51db309b26a1aa4ff39b6a6758b27ad66b4e8846f";

// ---------------------------------------------------------------------------
// next/headers — mock cookies()
// ---------------------------------------------------------------------------

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
    delete: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// next/cache — mock revalidatePath / revalidateTag
// ---------------------------------------------------------------------------

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// ---------------------------------------------------------------------------
// @supabase/ssr — mock createServerClient
// ---------------------------------------------------------------------------

const mockSupabase = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: "test-user-id", email: "test@example.com" } },
      error: null,
    }),
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: "mock-token" } },
      error: null,
    }),
  },
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lt: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn().mockReturnThis(),
  rpc: vi.fn().mockReturnThis(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn().mockReturnValue(mockSupabase),
  createBrowserClient: vi.fn().mockReturnValue(mockSupabase),
}));

// ---------------------------------------------------------------------------
// Reset all mocks between tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Reset auth mock to default (authenticated user)
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: "test-user-id", email: "test@example.com" } },
    error: null,
  });
  // Reset query chain to return empty array by default
  const emptyResult = { data: [], error: null };
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.upsert.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
  mockSupabase.neq.mockReturnValue(mockSupabase);
  mockSupabase.gt.mockReturnValue(mockSupabase);
  mockSupabase.lt.mockReturnValue(mockSupabase);
  mockSupabase.in.mockReturnValue(mockSupabase);
  mockSupabase.order.mockReturnValue(mockSupabase);
  mockSupabase.limit.mockReturnValue(mockSupabase);
  mockSupabase.single.mockResolvedValue(emptyResult);
  mockSupabase.maybeSingle.mockResolvedValue(emptyResult);
  mockSupabase.rpc.mockResolvedValue(emptyResult);
});
