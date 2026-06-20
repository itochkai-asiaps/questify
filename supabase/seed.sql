-- Questify: Achievement Seed Data
-- Inserts 7 base achievements idempotently

INSERT INTO achievements (id, slug, title, description, icon_url, xp_reward, criteria_json)
VALUES
  (
    gen_random_uuid(),
    'first_task',
    'First Task',
    'Complete your first task',
    '',
    10,
    '{}'
  ),
  (
    gen_random_uuid(),
    'getting_started',
    'Getting Started',
    'Complete 10 tasks',
    '',
    50,
    '{}'
  ),
  (
    gen_random_uuid(),
    'hard_worker',
    'Hard Worker',
    'Complete 50 tasks',
    '',
    200,
    '{}'
  ),
  (
    gen_random_uuid(),
    'week_warrior',
    'Week Warrior',
    'Maintain a 7-day streak',
    '',
    100,
    '{}'
  ),
  (
    gen_random_uuid(),
    'monthly_master',
    'Monthly Master',
    'Maintain a 30-day streak',
    '',
    500,
    '{}'
  ),
  (
    gen_random_uuid(),
    'perfect_day',
    'Perfect Day',
    'Complete 10 tasks in a single day',
    '',
    150,
    '{}'
  ),
  (
    gen_random_uuid(),
    'planner',
    'Planner',
    'Complete 5 plans',
    '',
    100,
    '{}'
  )
ON CONFLICT (slug) DO NOTHING;
