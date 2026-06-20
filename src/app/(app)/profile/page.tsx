"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  Star,
  Trophy,
  Lock,
  Settings,
  Pencil,
  Sun,
  Moon,
  CheckCircle2,
  TrendingUp,
  Target,
  BookOpen,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { getAchievements } from "@/lib/gamification/engine";
import {
  type AchievementWithStatus,
  type UserStatsRow,
  getOrCreateUserStats,
} from "@/lib/gamification/engine";
import {
  getLevel,
  xpForLevel,
  xpToNextLevel,
} from "@/lib/gamification/levels";
import { getTasks } from "@/lib/actions/tasks";
import { getPlans } from "@/lib/actions/plans";
import { updateProfile, getProfile } from "@/lib/actions/profile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TaskItem = {
  id: string;
  status: string;
};

type PlanItem = {
  id: string;
  progress: number;
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
// Theme Toggle
// ---------------------------------------------------------------------------

function useTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }, []);

  return { isDark, toggle };
}

// ---------------------------------------------------------------------------
// Avatar Initial Color
// ---------------------------------------------------------------------------

function avatarColor(name: string): string {
  const colors = [
    "bg-gradient-to-br from-rose-400 to-pink-500",
    "bg-gradient-to-br from-violet-400 to-purple-500",
    "bg-gradient-to-br from-sky-400 to-blue-500",
    "bg-gradient-to-br from-emerald-400 to-green-500",
    "bg-gradient-to-br from-amber-400 to-orange-500",
    "bg-gradient-to-br from-cyan-400 to-teal-500",
    "bg-gradient-to-br from-fuchsia-400 to-pink-500",
    "bg-gradient-to-br from-indigo-400 to-violet-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// ---------------------------------------------------------------------------
// Loading Skeleton
// ---------------------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header skeleton */}
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Skeleton className="size-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </CardContent>
      </Card>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievements skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
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

function ProfileError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="container mx-auto flex max-w-4xl flex-col items-center justify-center gap-4 p-6 pt-20">
      <div className="rounded-full bg-destructive/10 p-4">
        <RefreshCw className="size-8 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">
        Unable to load profile
      </h2>
      <p className="text-sm text-muted-foreground">
        Something went wrong while fetching your profile data.
      </p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 size-4" />
        Retry
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card (Profile)
// ---------------------------------------------------------------------------

function ProfileStatCard({
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
// XpProgressMini (Profile)
// ---------------------------------------------------------------------------

function XpProgressMini({ stats }: { stats: UserStatsRow }) {
  const level = getLevel(stats.totalXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpToNextLevel(level);
  const xpIntoLevel = stats.totalXp - currentLevelXp;
  const progressPercent =
    nextLevelXp > 0 ? Math.min((xpIntoLevel / nextLevelXp) * 100, 100) : 100;
  const maxLevel = level >= 50;

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 text-amber-500">
          <TrendingUp className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-bold tabular-nums text-foreground">
              <AnimatedNumber value={stats.totalXp} />
            </span>
            <span className="text-xs text-muted-foreground">
              {maxLevel ? "MAX" : `Level ${level}`}
            </span>
          </div>
          <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit Profile Dialog
// ---------------------------------------------------------------------------

function EditProfileDialog({
  open,
  onOpenChange,
  currentName,
  userId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentName: string;
  userId: string;
  onSaved: (newName: string) => void;
}) {
  const [displayName, setDisplayName] = useState(currentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync when dialog opens
  useEffect(() => {
    if (open) {
      setDisplayName(currentName);
      setError(null);
    }
  }, [open, currentName]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError("Display name is required");
      return;
    }

    setSaving(true);
    setError(null);

    const result = await updateProfile(userId, {
      displayName: displayName.trim(),
    });

    if (result.error) {
      setError(result.error);
    } else {
      onSaved(displayName.trim());
      onOpenChange(false);
    }

    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your display name. This will be shown across Questify.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-foreground"
          >
            Display Name
          </label>
          <Input
            id="display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Enter your display name"
            maxLength={100}
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
            }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Achievement Card
// ---------------------------------------------------------------------------

function AchievementCard({ ach, index }: { ach: AchievementWithStatus; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        "relative flex items-center gap-4 rounded-xl border p-4",
        ach.unlocked
          ? "border-amber-500/30 bg-amber-500/5 shadow-[0_0_15px_rgba(251,191,36,0.1)]"
          : "border-border bg-muted/20 opacity-50 grayscale",
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          ach.unlocked
            ? "bg-amber-500/10 text-amber-500"
            : "bg-muted text-muted-foreground",
        )}
      >
        {ach.unlocked ? (
          <Star className="size-5" />
        ) : (
          <Lock className="size-5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium",
            ach.unlocked ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {ach.title}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {ach.description}
        </p>
        {ach.unlocked && ach.unlockedAt && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
          </p>
        )}
      </div>
      {ach.unlocked && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          +{ach.xpReward} XP
        </Badge>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Profile Page
// ---------------------------------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [stats, setStats] = useState<UserStatsRow | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [plansCompleted, setPlansCompleted] = useState(0);
  const [plansInProgress, setPlansInProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const [profileResult, statsResult, achievementsResult, tasksResult, plansResult] =
        await Promise.all([
          getProfile(user.id),
          getOrCreateUserStats(user.id),
          getAchievements(user.id),
          getTasks(),
          getPlans(),
        ]);

      // Resolve display name
      const profileData = profileResult.data as { display_name?: string } | undefined;
      const profileName = profileData?.display_name;
      const metaName =
        (user.user_metadata?.display_name as string) ??
        (user.user_metadata?.full_name as string);
      const emailName = user.email?.split("@")[0] ?? "User";

      setDisplayName(profileName || metaName || emailName);

      // Stats
      setStats(statsResult);

      // Achievements
      setAchievements(achievementsResult);

      // Task/Plan counts
      const tasks = (tasksResult.data ?? []) as TaskItem[];
      const plans = (plansResult.data ?? []) as PlanItem[];

      setTasksCompleted(tasks.filter((t) => t.status === "done").length);
      setPlansCompleted(plans.filter((p) => p.progress >= 100).length);
      setPlansInProgress(
        plans.filter((p) => p.progress > 0 && p.progress < 100).length,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load profile",
      );
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

  // Fetch data
  useEffect(() => {
    if (user && !authLoading) {
      fetchProfile();
    }
  }, [user, authLoading, fetchProfile]);

  if (authLoading || !user) {
    return null;
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error) {
    return <ProfileError onRetry={fetchProfile} />;
  }

  const email = user.email ?? "";
  const initial = (displayName || email).charAt(0).toUpperCase();

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg",
                avatarColor(displayName || email),
              )}
            >
              {initial}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground">
                {displayName}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{email}</p>
              {stats && (
                <div className="mt-1 flex items-center gap-1">
                  <Badge variant="secondary" className="text-[10px]">
                    Level {getLevel(stats.totalXp)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {stats.totalXp} XP
                  </Badge>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-2 size-4" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        currentName={displayName}
        userId={user.id}
        onSaved={(newName) => setDisplayName(newName)}
      />

      {/* Stats Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats && <XpProgressMini stats={stats} />}
        <ProfileStatCard
          icon={CheckCircle2}
          label="Tasks Completed"
          value={tasksCompleted}
          colorClass="bg-green-500/10 text-green-600 dark:text-green-400"
        />
        <ProfileStatCard
          icon={Target}
          label="Plans Completed"
          value={plansCompleted}
          colorClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
        <ProfileStatCard
          icon={BookOpen}
          label="Plans in Progress"
          value={plansInProgress}
          colorClass="bg-purple-500/10 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Achievements Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4 text-muted-foreground" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No achievements yet. Start completing tasks to earn badges!
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((ach, i) => (
                <AchievementCard key={ach.slug} ach={ach} index={i} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-4 text-muted-foreground" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                Notification preferences
              </p>
              <p className="text-xs text-muted-foreground">
                Coming soon — you&apos;ll be able to customize push and email
                notifications.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Soon
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
