import { z } from "zod/v4";

export const PlanItemSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  completed: z.boolean().default(false),
  estimated_minutes: z.number().int().nonnegative().nullable().optional(),
  actual_minutes: z.number().int().nonnegative().nullable().optional(),
  position: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().default("#6366f1"),
  estimated_minutes: z.number().int().nonnegative().nullable().optional(),
  actual_minutes: z.number().int().nonnegative().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  items: z.array(PlanItemSchema).default([]),
});

export const CreatePlanInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  color: z.string().default("#6366f1"),
  items: z
    .array(
      z.object({
        title: z.string().min(1).max(500),
        estimated_minutes: z.number().int().nonnegative().optional(),
      }),
    )
    .default([]),
});

export const UpdatePlanInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
  estimated_minutes: z.number().int().nonnegative().nullable().optional(),
  actual_minutes: z.number().int().nonnegative().nullable().optional(),
});

export type PlanItem = z.infer<typeof PlanItemSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;
