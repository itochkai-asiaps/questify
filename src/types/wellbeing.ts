import { z } from "zod/v4";

export interface MoodLabel {
  emoji: string;
  label: string;
  min: number;
  max: number;
}

export const MOOD_LABELS: MoodLabel[] = [
  { emoji: "😞", label: "Awful", min: 0, max: 20 },
  { emoji: "😐", label: "Meh", min: 21, max: 40 },
  { emoji: "🙂", label: "Okay", min: 41, max: 60 },
  { emoji: "😊", label: "Good", min: 61, max: 80 },
  { emoji: "😄", label: "Great", min: 81, max: 100 },
];

export function getMoodLabel(score: number): MoodLabel {
  return MOOD_LABELS.find((m) => score >= m.min && score <= m.max) ?? MOOD_LABELS[2]!;
}

export const WellbeingEntrySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  mood_score: z.number().int().min(0).max(100),
  note: z.string().nullable().optional(),
  created_at: z.string().datetime({ offset: true }),
});

export const CreateWellbeingEntrySchema = z.object({
  mood_score: z.number().int().min(0).max(100, "Score must be 0-100"),
  note: z.string().max(500).optional(),
});

export type WellbeingEntry = z.infer<typeof WellbeingEntrySchema>;
export type CreateWellbeingEntryInput = z.infer<typeof CreateWellbeingEntrySchema>;
