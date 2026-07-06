-- Fix: update_streak now always increments tasks_completed
-- Previously tasks_completed was never incremented, breaking all task-count achievements.

CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_date DATE;
  v_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Always increment the task counter (called once per completed task)
  UPDATE user_stats
  SET tasks_completed = tasks_completed + 1, updated_at = now()
  WHERE user_id = p_user_id;

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
    -- Already completed today, no change to streak
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
