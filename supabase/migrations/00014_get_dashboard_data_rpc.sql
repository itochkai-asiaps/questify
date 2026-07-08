-- Migration 00014: get_dashboard_data RPC — replaces 4 queries with 1 for dashboard performance (E0)
-- Idempotent: safe to run multiple times

-- Step 1: RPC function
CREATE OR REPLACE FUNCTION public.get_dashboard_data(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'stats', (
      SELECT jsonb_build_object(
        'total_xp', total_xp,
        'current_streak', current_streak,
        'tasks_completed', tasks_completed
      )
      FROM user_stats WHERE user_id = p_user_id
    ),
    'tasks', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', id,
          'title', title,
          'status', status,
          'priority', priority,
          'due_date', due_date
        )
        ORDER BY sort_order ASC, created_at DESC
      ), '[]'::jsonb)
      FROM tasks
      WHERE user_id = p_user_id AND deleted_at IS NULL
    ),
    'plans', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'title', p.title,
          'total', COALESCE(pi_stats.total, 0),
          'completed', COALESCE(pi_stats.completed, 0),
          'progress', CASE
            WHEN COALESCE(pi_stats.total, 0) > 0
            THEN ROUND((COALESCE(pi_stats.completed, 0)::numeric / pi_stats.total) * 100)
            ELSE 0
          END
        )
        ORDER BY p.created_at DESC
      ), '[]'::jsonb)
      FROM plans p
      LEFT JOIN (
        SELECT plan_id,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE completed) AS completed
        FROM plan_items
        GROUP BY plan_id
      ) pi_stats ON pi_stats.plan_id = p.id
      WHERE p.user_id = p_user_id
    ),
    'achievements', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'slug', a.slug,
          'title', a.title,
          'description', a.description,
          'icon_url', a.icon_url,
          'xp_reward', a.xp_reward,
          'unlocked', CASE WHEN ua.id IS NOT NULL THEN true ELSE false END,
          'unlocked_at', ua.unlocked_at
        )
        ORDER BY a.slug
      ), '[]'::jsonb)
      FROM achievements a
      LEFT JOIN user_achievements ua
        ON ua.achievement_id = a.id AND ua.user_id = p_user_id
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Step 2: Index for plans ORDER BY (makes plans sub-query an index scan)
CREATE INDEX IF NOT EXISTS idx_plans_user_created_at
  ON plans(user_id, created_at DESC);

-- Step 3: Covering index for tasks filter + ORDER BY
CREATE INDEX IF NOT EXISTS idx_tasks_user_sort_order_created
  ON tasks(user_id, sort_order, created_at)
  WHERE deleted_at IS NULL;
