-- Migration 00013: Add previous_status column for D7a
-- Idempotent: safe to run multiple times
-- D7a: when a task is dragged to backlog, its current status is saved here.
-- When dragged back, the previous status is restored.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS previous_status TEXT;
