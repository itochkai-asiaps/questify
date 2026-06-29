"use client";

import { useEffect, useRef } from "react";
import { create } from "zustand";
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

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
}));

export function useAuth() {
  const { user, session, isLoading, setUser, setSession, setLoading } =
    useAuthStore();

  // Track user identity to skip spurious updates on TOKEN_REFRESHED
  const lastUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Initial session — always set
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      const initialUser = initialSession?.user ?? null;
      setUser(initialUser);
      lastUserId.current = initialUser?.id ?? null;
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      const newUser = currentSession?.user ?? null;
      const newUserId = newUser?.id ?? null;
      // Only propagate user change if identity actually changed
      // (prevents re-renders on TOKEN_REFRESHED — e.g. tab focus)
      if (newUserId !== lastUserId.current) {
        lastUserId.current = newUserId;
        setUser(newUser);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession, setUser, setLoading]);

  return {
    user,
    session,
    isLoading,
    signOut: serverSignOut,
  };
}
