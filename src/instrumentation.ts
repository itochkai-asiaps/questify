/**
 * Next.js 16 Instrumentation Hook
 *
 * Validates environment variables at startup.
 * Logs errors but does NOT throw — failing fast on env is too aggressive
 * for staging/prod where a subset of vars may be intentionally absent.
 */
export async function register() {
  // Only validate in Node.js runtime (skip Edge, skip test)
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV === "test") return;

  try {
    const { envSchema } = await import("@/lib/env");
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      // Only log names of missing SERVER vars — never log values
      console.error("[env] Invalid environment variables:");
      for (const issue of result.error.issues) {
        const name = String(issue.path[0] ?? "unknown");
        if (!name.startsWith("NEXT_PUBLIC_")) {
          console.error(`  - ${name}: ${issue.message}`);
        }
      }
    } else {
      console.info("[env] All environment variables validated");
    }
  } catch (err) {
    console.error("[env] Failed to validate env vars:", err);
  }
}
