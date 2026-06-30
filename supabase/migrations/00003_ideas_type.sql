-- Migration 00003: add type column to ideas

ALTER TABLE public.ideas
ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'idea'
CHECK (type IN ('idea', 'problem'));

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_ideas_type ON public.ideas(type);
