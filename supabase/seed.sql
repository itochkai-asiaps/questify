-- Questify: Seed Data
-- Achievements and level constants

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================

INSERT INTO achievements (slug, title, description, icon_url, xp_reward, criteria_json) VALUES
('first_task', 'First Task', 'Complete your first task', '/achievements/first-task.svg', 25, '{"tasks_completed": 1}'),
('getting_started', 'Getting Started', 'Complete 10 tasks', '/achievements/getting-started.svg', 50, '{"tasks_completed": 10}'),
('hard_worker', 'Hard Worker', 'Complete 50 tasks', '/achievements/hard-worker.svg', 100, '{"tasks_completed": 50}'),
('week_warrior', 'Week Warrior', 'Maintain a 7-day streak', '/achievements/week-warrior.svg', 75, '{"streak": 7}'),
('monthly_master', 'Monthly Master', 'Maintain a 30-day streak', '/achievements/monthly-master.svg', 200, '{"streak": 30}'),
('perfect_day', 'Perfect Day', 'Complete 10 tasks in a single day', '/achievements/perfect-day.svg', 150, '{"tasks_in_day": 10}'),
('planner', 'Planner', 'Complete 5 plans', '/achievements/planner.svg', 100, '{"plans_completed": 5}')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- LEVEL CONSTANTS (reference only - computed via formula)
-- ============================================================
-- Level formula: n² × 25
-- Level  1: 0 XP
-- Level  2: 75 XP
-- Level  3: 200 XP
-- Level  4: 375 XP
-- Level  5: 600 XP
-- Level 10: 2,500 XP
-- Level 20: 10,000 XP
-- Level 30: 22,500 XP
-- Level 40: 40,000 XP
-- Level 50: 62,500 XP (max)
