-- Questify: Initial Database Schema
-- Migration 00001: Core tables, RLS policies, gamification functions

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 2000),
  priority TEXT NOT NULL DEFAULT 'p3' CHECK (priority IN ('p1', 'p2', 'p3', 'p4')),
  due_date TIMESTAMPTZ,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  position INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX idx_tasks_user_not_deleted ON tasks(user_id) WHERE deleted_at IS NULL;

-- Subtasks
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) >= 1),
  completed BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_subtasks_task_id ON subtasks(task_id);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  criteria_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User Achievements (junction)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- User Stats (gamification)
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 50),
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  plans_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Plans
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 2000),
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plans_user_id ON plans(user_id);

-- Plan Items (checklist steps)
CREATE TABLE IF NOT EXISTS plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  completed BOOLEAN DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_plan_items_plan_id ON plan_items(plan_id);

-- Ideas (inbox for quick capture, telegram bot)
CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  description TEXT CHECK (char_length(description) <= 5000),
  source TEXT NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'telegram')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ideas_user_id ON ideas(user_id);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);

-- Telegram Chat ↔ User mapping
CREATE TABLE IF NOT EXISTS telegram_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  chat_id BIGINT NOT NULL UNIQUE,
  linked_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_telegram_chats_chat_id ON telegram_chats(chat_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own profile
CREATE POLICY "Users see own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Tasks: users see own non-deleted tasks
CREATE POLICY "Users see own tasks" ON tasks
  FOR ALL USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Subtasks: users see subtasks of own tasks
CREATE POLICY "Users see own subtasks" ON subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()
        AND tasks.deleted_at IS NULL
    )
  );

-- Achievements: everyone can read
CREATE POLICY "Everyone can read achievements" ON achievements
  FOR SELECT USING (true);

-- User Achievements: users see own
CREATE POLICY "Users see own achievements" ON user_achievements
  FOR ALL USING (auth.uid() = user_id);

-- User Stats: users see own
CREATE POLICY "Users see own stats" ON user_stats
  FOR ALL USING (auth.uid() = user_id);

-- Ideas: users see own
CREATE POLICY "Users see own ideas" ON ideas
  FOR ALL USING (auth.uid() = user_id);

-- Plans: users see own plans
CREATE POLICY "Users see own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);

-- Plan Items: users see items of own plans
CREATE POLICY "Users see own plan items" ON plan_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_items.plan_id
        AND plans.user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1))
  );
  INSERT INTO public.user_stats (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_plan_items_updated_at
  BEFORE UPDATE ON plan_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_user_stats_updated_at
  BEFORE UPDATE ON user_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Gamification: increment XP
CREATE OR REPLACE FUNCTION public.increment_xp(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS void AS $$
BEGIN
  UPDATE user_stats
  SET
    total_xp = total_xp + p_amount,
    updated_at = now()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gamification: check and apply level up
CREATE OR REPLACE FUNCTION public.check_level_up(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_xp INTEGER;
  v_current_level INTEGER;
  v_new_level INTEGER;
BEGIN
  SELECT total_xp, level INTO v_total_xp, v_current_level
  FROM user_stats WHERE user_id = p_user_id;

  -- Level formula: level = floor(sqrt(xp / 25)) + 1, capped at 50
  v_new_level := LEAST(FLOOR(SQRT(GREATEST(v_total_xp, 0) / 25.0))::INTEGER + 1, 50);

  IF v_new_level > v_current_level THEN
    UPDATE user_stats SET level = v_new_level, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN v_new_level;
  END IF;

  RETURN v_current_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gamification: update daily streak
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_date DATE;
  v_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_completed_date, current_streak
  INTO v_last_date, v_streak
  FROM user_stats WHERE user_id = p_user_id;

  IF v_last_date IS NULL THEN
    -- First ever completion
    UPDATE user_stats
    SET current_streak = 1, longest_streak = 1, last_completed_date = v_today, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN 1;
  ELSIF v_last_date = v_today THEN
    -- Already completed today, no change
    RETURN v_streak;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_streak := v_streak + 1;
    UPDATE user_stats
    SET
      current_streak = v_streak,
      longest_streak = GREATEST(longest_streak, v_streak),
      last_completed_date = v_today,
      updated_at = now()
    WHERE user_id = p_user_id;
    RETURN v_streak;
  ELSE
    -- Streak broken
    UPDATE user_stats
    SET current_streak = 1, last_completed_date = v_today, updated_at = now()
    WHERE user_id = p_user_id;
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
