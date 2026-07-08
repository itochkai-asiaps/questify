"use client";

import { useCallback, useEffect, useRef } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { signOut as serverSignOut } from "@/lib/actions/auth";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: "questify-auth",
      partialize: (state) => ({ user: state.user, session: state.session }),
    }
  )
);

export function useAuth() {
  const { user, session, isLoading, setUser, setSession, setLoading } =
    useAuthStore();

  // Track user identity to skip spurious updates on TOKEN_REFRESHED
  const lastUserId = useRef<string | null>(null);
  // Monotonic counter to prevent race between getSession and onAuthStateChange
  const updateCounter = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    // Initial session — always set
    const myInit = ++updateCounter.current;
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      // Bail if a newer update (e.g. onAuthStateChange) already fired
      if (myInit !== updateCounter.current) return;
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);
      lastUserId.current = initialUser?.id ?? null;
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      const myEvent = ++updateCounter.current;
      setSession(currentSession);
      const newUser = currentSession?.user ?? null;
      const newUserId = newUser?.id ?? null;
      // Only propagate user change if identity actually changed
      // (prevents re-renders on TOKEN_REFRESHED — e.g. tab focus)
      if (newUserId !== lastUserId.current) {
        lastUserId.current = newUserId;
        setUser(newUser);
      }
      // Bail if a newer event arrived while processing (rare but safe)
      if (myEvent !== updateCounter.current) return;
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setLoading]);

  const signOut = useCallback(async () => {
    setUser(null);
    setSession(null);
    await serverSignOut();
  }, [setUser, setSession]);

  return {
    user,
    session,
    isLoading,
    signOut,
  };
}
