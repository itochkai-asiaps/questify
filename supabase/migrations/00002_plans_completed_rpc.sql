-- Migration 00002: plans_completed RPC + achievements seed

-- RPC: atomically increment plans_completed
CREATE OR REPLACE FUNCTION public.increment_plans_completed(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.user_stats
  SET plans_completed = COALESCE(plans_completed, 0) + 1
  WHERE user_id = p_user_id;
END;
$$;

-- Seed achievements
INSERT INTO public.achievements (slug, title, description, icon_url, xp_reward, criteria_json)
VALUES
  ('first_task', 'First Task', 'Complete your first task', '🏆', 25, '{"tasks_completed": 1}'),
  ('getting_started', 'Getting Started', 'Complete 10 tasks', '⭐', 50, '{"tasks_completed": 10}'),
  ('hard_worker', 'Hard Worker', 'Complete 50 tasks', '🔨', 100, '{"tasks_completed": 50}'),
  ('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '📅', 75, '{"longest_streak": 7}'),
  ('monthly_master', 'Monthly Master', 'Maintain a 30-day streak', '🎖️', 200, '{"longest_streak": 30}'),
  ('perfect_day', 'Perfect Day', 'Complete 10 tasks in a single day', '☀️', 50, '{"tasks_completed_today": 10}'),
  ('planner', 'Planner', 'Complete 5 plans', '📋', 100, '{"plans_completed": 5}')
ON CONFLICT (slug) DO NOTHING;
