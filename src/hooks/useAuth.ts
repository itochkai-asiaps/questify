import { create } from "zustand";

interface AuthState {
  session: unknown | null;
  user: unknown | null;
  isLoading: boolean;
  setSession: (session: unknown | null) => void;
  setUser: (user: unknown | null) => void;
  setLoading: (isLoading: boolean) => void;
  signOut: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ session: null, user: null }),
}));
