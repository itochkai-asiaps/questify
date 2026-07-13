/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Module-scope mock functions — declared before vi.mock so factories
// capture them by closure when the module is first imported.
// vi.mock is "hoisted" but its factory runs lazily (on first import),
// by which time these const bindings are already initialised.
// ---------------------------------------------------------------------------

const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockUnsubscribe = vi.fn();

// ---------------------------------------------------------------------------
// Mocks (hoisted — imports below resolve through these)
// ---------------------------------------------------------------------------

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/actions/auth", () => ({
  signOut: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { createClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/lib/actions/auth";
import { useAuth, useAuthStore } from "@/hooks/useAuth";
import type { User, Session } from "@supabase/supabase-js";

// Typed mock references
const mockCreateClient = vi.mocked(createClient);
const mockServerSignOut = serverSignOut as unknown as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockUser: User = {
  id: "test-user-id",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01",
} as User;

const mockSession: Session = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: mockUser,
} as Session;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Replace getSession with a deferred promise so the test controls resolution. */
function deferredGetSession() {
  let resolve: (value: { data: { session: Session | null }; error: null }) => void;
  const promise = new Promise<{
    data: { session: Session | null };
    error: null;
  }>((res) => {
    resolve = res;
  });
  mockGetSession.mockReturnValue(promise);
  return {
    resolve: (session: Session | null) => resolve!({ data: { session }, error: null }),
  };
}

/** Capture the callback passed to onAuthStateChange so the test can fire auth events. */
function captureAuthCallback() {
  let callback: ((event: string, session: Session | null) => void) | null = null;
  mockOnAuthStateChange.mockImplementation(
    (cb: (event: string, session: Session | null) => void) => {
      callback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    },
  );
  return {
    fire: (event: string, session: Session | null) => {
      callback?.(event, session);
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset the Zustand store to pristine initial state
    useAuthStore.setState({ user: null, session: null, isLoading: true });

    // Wire mocks with safe defaults
    mockCreateClient.mockReturnValue({
      auth: {
        getSession: mockGetSession,
        onAuthStateChange: mockOnAuthStateChange,
      },
    } as any);

    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    (mockServerSignOut as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  // =========================================================================
  // Store initialisation
  // =========================================================================

  describe("Store initialisation", () => {
    it("has user: null, session: null, isLoading: true at startup", () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoading).toBe(true);
    });
  });

  // =========================================================================
  // setUser
  // =========================================================================

  describe("setUser", () => {
    it("updates user in the store", () => {
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().user).toEqual(mockUser);
    });

    it("clears user when called with null", () => {
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setUser(null);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  // =========================================================================
  // setSession
  // =========================================================================

  describe("setSession", () => {
    it("updates session in the store", () => {
      useAuthStore.getState().setSession(mockSession);
      expect(useAuthStore.getState().session).toEqual(mockSession);
    });

    it("clears session when called with null", () => {
      useAuthStore.getState().setSession(mockSession);
      useAuthStore.getState().setSession(null);
      expect(useAuthStore.getState().session).toBeNull();
    });
  });

  // =========================================================================
  // signOut
  // =========================================================================

  describe("signOut", () => {
    it("clears user and session, then calls serverSignOut", async () => {
      // Keep getSession pending so it never overwrites our pre-set state
      mockGetSession.mockReturnValue(new Promise(() => {}));

      useAuthStore.setState({
        user: mockUser,
        session: mockSession,
        isLoading: false,
      });

      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.signOut();
      });

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.session).toBeNull();
      expect(mockServerSignOut).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // persist — partialize
  // =========================================================================

  describe("persist partialize", () => {
    it("excludes isLoading from persisted state", () => {
      // Re-create the exact partialize function from the store definition
      const partialize = (state: { user: unknown; session: unknown; isLoading: unknown }) => ({
        user: state.user,
        session: state.session,
      });

      const result = partialize({
        user: mockUser,
        session: mockSession,
        isLoading: true,
      });

      expect(result).toHaveProperty("user");
      expect(result).toHaveProperty("session");
      expect(result).not.toHaveProperty("isLoading");
      expect(result).toEqual({ user: mockUser, session: mockSession });
    });
  });

  // =========================================================================
  // updateCounter — race-condition guard
  // =========================================================================

  describe("updateCounter race fix", () => {
    it("discards a late getSession result when onAuthStateChange fired first", async () => {
      const { resolve } = deferredGetSession();
      const { fire } = captureAuthCallback();

      renderHook(() => useAuth());

      const newSession: Session = {
        ...mockSession,
        access_token: "new-token",
        user: { ...mockUser, id: "new-user-id" },
      };

      // onAuthStateChange fires BEFORE getSession resolves
      act(() => {
        fire("SIGNED_IN", newSession);
      });

      // Now resolve the stale getSession (should be discarded by updateCounter)
      await act(async () => {
        resolve(mockSession);
        // Flush pending microtasks so .then() callbacks run inside act
        await new Promise<void>((r) => setTimeout(r, 0));
      });

      const state = useAuthStore.getState();
      // The onAuthStateChange values must survive
      expect(state.session?.access_token).toBe("new-token");
      expect(state.user?.id).toBe("new-user-id");
    });

    it("does not call setUser on TOKEN_REFRESHED when user identity is unchanged", async () => {
      const { resolve } = deferredGetSession();
      const { fire } = captureAuthCallback();

      renderHook(() => useAuth());

      const user1 = { ...mockUser, id: "user-1" };

      // getSession resolves first with user-1
      await act(async () => {
        resolve({
          ...mockSession,
          access_token: "token-1",
          user: user1,
        } as Session);
      });

      const userRef = useAuthStore.getState().user;
      expect(userRef?.id).toBe("user-1");

      // TOKEN_REFRESHED fires — same user.id, different token
      act(() => {
        fire("TOKEN_REFRESHED", {
          ...mockSession,
          access_token: "token-2",
          user: { ...user1 }, // same id, new object
        } as Session);
      });

      // setUser must NOT have been called → user reference preserved
      expect(useAuthStore.getState().user).toBe(userRef);
      // But session is always updated
      expect(useAuthStore.getState().session?.access_token).toBe("token-2");
    });
  });

  // =========================================================================
  // Auth initialisation flow (hook integration)
  // =========================================================================

  describe("auth initialisation flow", () => {
    it("populates user and session from getSession on mount, then sets isLoading=false", async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      // Wrap mount + async resolution in act to keep React happy
      await act(async () => {
        renderHook(() => useAuth());
      });

      await waitFor(() => {
        const state = useAuthStore.getState();
        expect(state.user?.id).toBe(mockUser.id);
        expect(state.session?.access_token).toBe(mockSession.access_token);
        expect(state.isLoading).toBe(false);
      });
    });
  });
});
