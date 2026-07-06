"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Flame,
  Trophy,
  Target,
  CheckCircle2,
  TrendingUp,
  Star,
  Lock,
  ListTodo,
  BookOpen,
  Zap,
  Calendar,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import {
  getAchievements,
  getOrCreateUserStats,
} from "@/lib/gamification/engine";
import type { AchievementWithStatus, UserStatsRow } from "@/lib/gamification/engine";
import {
  getLevel,
  xpForLevel,
  xpToNextLevel,
  getStreakMultiplier,
} from "@/lib/gamification/levels";
import { getTasks } from "@/lib/actions/tasks";
import { getPlans } from "@/lib/actions/plans";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskItem = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
};

type PlanItem = {
  id: string;
  title: string;
  total: number;
  completed: number;
  progress: number;
};

type DashboardData = {
  stats: UserStatsRow;
  tasks: TaskItem[];
  plans: PlanItem[];
  achievements: AchievementWithStatus[];
};

// ---------------------------------------------------------------------------
// Animated Number
// ---------------------------------------------------------------------------

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: "easeOut",
    });
    return controls.stop;
  }, [value, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}

// ---------------------------------------------------------------------------
// Priority Badge Config
// ---------------------------------------------------------------------------

const priorityConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  p1: { label: "P1", variant: "destructive" },
  p2: { label: "P2", variant: "default" },
  p3: { label: "P3", variant: "secondary" },
  p4: { label: "P4", variant: "outline" },
};

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  todo: { label: "Todo", variant: "outline" },
  in_progress: { label: "In Progress", variant: "default" },
  done: { label: "Done", variant: "secondary" },
};

// ---------------------------------------------------------------------------
// Loading Skeletons
// ---------------------------------------------------------------------------

function DashboardSkeleton() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 py-6">
      {/* XP Bar skeleton */}
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-full rounded-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Skeleton className="size-10 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-2 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Heart placeholder */}
      <div className="flex justify-center py-8">
        <Skeleton className="size-48" />
      </div>

      {/* Achievements skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-40 shrink-0 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error State
// ---------------------------------------------------------------------------

function DashboardError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-4 px-4 py-6 pt-20">
      <div className="rounded-full bg-destructive/10 p-4">
        <RefreshCw className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Unable to load dashboard
      </h2>
      <p className="text-sm text-muted-foreground">
        Something went wrong while fetching your data. Please try again.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// XP Progress Bar
// ---------------------------------------------------------------------------

function XpProgressBar({ stats }: { stats: UserStatsRow }) {
  const level = getLevel(stats.totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpToNextLevel(level);
  const xpIntoLevel = stats.totalXp - currentLevelXp;
  const progressPercent =
    nextLevelXp > 0 ? Math.min((xpIntoLevel / nextLevelXp) * 100, 100) : 100;
  const maxLevel = level >= 50;
  const nextLevel = level + 1;

  return (
    <Card>
      <CardContent className="py-6">
        <div className="flex items-center gap-4">
          {/* Level badge */}
          <div className="relative flex size-12 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 opacity-20" />
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-500/20">
              <span className="text-sm font-bold text-white tabular-nums">
                {level}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-baseline justify-between">
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-foreground">
                  Level {level}
                </span>
                {!maxLevel && (
                  <span className="text-xs text-muted-foreground">
                    → {nextLevel}
                  </span>
                )}
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {maxLevel ? (
                  <span className="flex items-center gap-1 text-amber-500">
                    <Trophy className="size-3" />
                    MAX
                  </span>
                ) : (
                  <>
                    <AnimatedNumber value={xpIntoLevel} /> / {nextLevelXp} XP
                  </>
                )}
              </span>
            </div>

            {/* Progress bar */}
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
              />
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-amber-500" />
              <span>
                Total: <AnimatedNumber value={stats.totalXp} /> XP
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Streak Counter
// ---------------------------------------------------------------------------

function StreakCounter({ streak }: { streak: number }) {
  const multiplier = getStreakMultiplier(streak);
  const multiplierLabel =
    multiplier === 2.0 ? "x2.0" : multiplier === 1.5 ? "x1.5" : "x1.0";

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-red-500/20">
          <Flame className="size-5 text-orange-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold tabular-nums text-foreground">
              <AnimatedNumber value={streak} />
            </span>
            <span className="text-xs text-muted-foreground">day streak</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={multiplier > 1 ? "default" : "secondary"}>
              {multiplierLabel} XP
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  colorClass: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            colorClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold tabular-nums text-foreground">
            <AnimatedNumber value={value} />
          </p>
          <p className="truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Today's Tasks
// ---------------------------------------------------------------------------

function TodaysTasks({ tasks }: { tasks: TaskItem[] }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const todaysTasks = tasks.filter((t) => {
    if (t.status === "done") return false;
    if (!t.due_date) return true; // tasks without due date are always shown
    return t.due_date.slice(0, 10) <= todayStr;
  });

  const displayTasks = todaysTasks.slice(0, 5);

  if (displayTasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            Today&apos;s Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-green-500/50" />
            All clear! No tasks due today.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListTodo className="size-4 text-muted-foreground" />
          Today&apos;s Tasks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayTasks.map((task, i) => {
          const priority = priorityConfig[task.priority] ?? priorityConfig.p3;
          const status = statusConfig[task.status] ?? statusConfig.todo;

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/tasks/${task.id}`}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "size-2 shrink-0 rounded-full",
                    task.status === "done"
                      ? "bg-green-500"
                      : task.status === "in_progress"
                        ? "bg-blue-500"
                        : "bg-muted-foreground/30",
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {task.title}
                </span>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={priority.variant}>{priority.label}</Badge>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Latest Achievements
// ---------------------------------------------------------------------------

function LatestAchievements({
  achievements,
}: {
  achievements: AchievementWithStatus[];
}) {
  if (achievements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-muted-foreground" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No achievements yet. Start completing tasks!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4 text-muted-foreground" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {achievements.map((ach, i) => (
            <motion.div
              key={ach.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "relative flex min-w-[130px] max-w-[160px] shrink-0 flex-col items-center gap-2 rounded-xl border p-4 text-center",
                ach.unlocked
                  ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(251,191,36,0.15)]"
                  : "border-border bg-muted/30 opacity-50 grayscale",
              )}
            >
              {ach.unlocked ? (
                <Star className="size-8 text-amber-500" />
              ) : (
                <Lock className="size-8 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  ach.unlocked ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {ach.title}
              </span>
              {ach.unlocked && (
                <Badge variant="secondary" className="text-[10px]">
                  +{ach.xpReward} XP
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Heart Animation (preserved from original)
// ---------------------------------------------------------------------------

function HeartAnimation() {
  const isProd = process.env.NEXT_PUBLIC_APP_ENV === "production";
  // Prod: red gradient; default/staging: yellow
  const stop1 = isProd ? "#ef4444" : "#fde047";
  const stop2 = isProd ? "#dc2626" : "#eab308";
  const stop3 = isProd ? "#991b1b" : "#a16207";
  const stroke = isProd ? "#7f1d1d" : "#991b1b";

  return (
    <div className="flex items-center justify-center py-10">
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg
          className="size-40 sm:size-48"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="heartGrad" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor={stop1} />
              <stop offset="50%" stopColor={stop2} />
              <stop offset="100%" stopColor={stop3} />
            </radialGradient>
          </defs>
          <path
            d="M50 85 C30 70, 5 55, 5 35 C5 20, 20 8, 35 12 C42 14, 48 19, 50 25 C52 19, 58 14, 65 12 C80 8, 95 20, 95 35 C95 55, 70 70, 50 85Z"
            fill="url(#heartGrad)"
            stroke={stroke}
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedUserId = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [statsResult, tasksResult, plansResult, achievementsResult] =
        await Promise.all([
          getOrCreateUserStats(user.id),
          getTasks(),
          getPlans(),
          getAchievements(user.id),
        ]);

      if (tasksResult.error) throw new Error(tasksResult.error);
      if (plansResult.error) throw new Error(plansResult.error);

      const tasks = (tasksResult.data ?? []) as TaskItem[];
      const plans = (plansResult.data ?? []) as PlanItem[];
      const achievements = achievementsResult;

      setData({ stats: statsResult, tasks, plans, achievements });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [user, authLoading, router]);

  // Fetch data when user is ready — skip if session just refreshed (same user)
  useEffect(() => {
    if (user && !authLoading) {
      // Only re-fetch when user ID actually changes, not on tab-focus session refresh
      if (lastFetchedUserId.current === user.id && data !== null) return;
      lastFetchedUserId.current = user.id;
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, fetchData]);

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardError onRetry={fetchData} />;
  }

  if (!data) {
    return null;
  }

  const { stats, tasks, plans, achievements } = data;

  // Compute plan stats
  const plansCompleted = plans.filter((p) => p.progress >= 100).length;
  const plansInProgress = plans.filter(
    (p) => p.progress > 0 && p.progress < 100,
  ).length;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:space-y-6 px-4 sm:px-6 py-6">
      {/* Sections ABOVE the heart */}
      {/* XP Progress Bar */}
      <XpProgressBar stats={stats} />

      {/* Streak + Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StreakCounter streak={stats.currentStreak} />
        <StatCard
          icon={CheckCircle2}
          label="Tasks Completed"
          value={stats.tasksCompleted}
          colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Total XP"
          value={stats.totalXp}
          colorClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Plan stats row */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon={Target}
          label="Plans Completed"
          value={plansCompleted}
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={BookOpen}
          label="Plans in Progress"
          value={plansInProgress}
          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Today's Tasks */}
      <TodaysTasks tasks={tasks} />

      {/* Heart Animation */}
      <HeartAnimation />

      {/* Sections BELOW the heart */}
      {/* Latest Achievements */}
      <LatestAchievements achievements={achievements} />
    </div>
  );
}
