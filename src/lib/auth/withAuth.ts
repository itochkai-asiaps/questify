import { requireUser } from "@/lib/auth/requireUser";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthContext {
  supabase: SupabaseClient;
  user: { id: string };
}

/**
 * Wraps a Server Action function with auth check.
 * Eliminates the 35× duplicated requireUser() + if (!user) pattern.
 *
 * Usage:
 *   export const createTask = withAuth(async ({ supabase, user }, formData: FormData) => {
 *     // user is guaranteed non-null here
 *   });
 */
export function withAuth<TArgs extends unknown[], TReturn>(
  fn: (ctx: AuthContext, ...args: TArgs) => Promise<TReturn>,
): (...args: TArgs) => Promise<TReturn | { error: string }> {
  return async (...args: TArgs): Promise<TReturn | { error: string }> => {
    const { supabase, user } = await requireUser();
    if (!user) return { error: "Not authenticated" };
    return fn({ supabase, user: { id: user.id } }, ...args);
  };
}
