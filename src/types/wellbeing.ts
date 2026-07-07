import { z } from "zod";

export const MOOD_LABELS: Record<number, { emoji: string; label: string }> = {
  1: { emoji: "😞", label: "Bad" },
  2: { emoji: "😐", label: "Meh" },
  3: { emoji: "🙂", label: "Okay" },
  4: { emoji: "😊", label: "Good" },
  5: { emoji: "😄", label: "Great" },
};

export const WellbeingEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mood_score: z.number().int().min(1).max(5),
  note: z.string().nullable().optional(),
  created_at: z.string().datetime(),
});

export const CreateWellbeingEntrySchema = z.object({
  mood_score: z.number().int().min(1).max(5, "Score must be 1-5"),
  note: z.string().max(500).optional(),
});

export type WellbeingEntry = z.infer<typeof WellbeingEntrySchema>;
export type CreateWellbeingEntryInput = z.infer<typeof CreateWellbeingEntrySchema>;
