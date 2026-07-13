import { z } from "zod/v4";

// ─── Schema Definitions ────────────────────────────────────────

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_VERSION: z.string().default("dev"),
});

// ─── Merged (for full-check in instrumentation) ────────────────

export const envSchema = z.object({
  ...serverSchema.shape,
  ...clientSchema.shape,
});

// ─── Types ─────────────────────────────────────────────────────

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;
export type Env = z.infer<typeof envSchema>;
