import { z } from "zod";

export const PlanItemSchema = z.object({
  id: z.string().uuid(),
  plan_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  completed: z.boolean().default(false),
  position: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const PlanSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  color: z.string().default("#6366f1"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
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
      }),
    )
    .default([]),
});

export const UpdatePlanInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  color: z.string().optional(),
});

export type PlanItem = z.infer<typeof PlanItemSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type CreatePlanInput = z.infer<typeof CreatePlanInputSchema>;
export type UpdatePlanInput = z.infer<typeof UpdatePlanInputSchema>;
