"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardList,
  Compass,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { completeOnboarding } from "@/lib/actions/onboarding";
import { TaskPriority } from "@/types/task";

const AVATAR_COLORS = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#a855f7", label: "Purple" },
];

const GOAL_CARDS = [
  {
    id: "organize",
    title: "Stay organized",
    description: "Keep track of tasks and never miss a deadline",
    icon: ClipboardList,
  },
  {
    id: "habit",
    title: "Build a habit",
    description: "Create daily routines and track your streaks",
    icon: Trophy,
  },
  {
    id: "project",
    title: "Complete a project",
    description: "Break down big goals into manageable steps",
    icon: Compass,
  },
];

const PRIORITY_OPTIONS = [
  { value: TaskPriority.P1, label: "Urgent", color: "text-red-500" },
  { value: TaskPriority.P2, label: "High", color: "text-orange-500" },
  { value: TaskPriority.P3, label: "Medium", color: "text-yellow-500" },
  { value: TaskPriority.P4, label: "Low", color: "text-green-500" },
];

const STEP_LABELS = ["Welcome", "Goal", "Task", "Summary"];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0].value);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(TaskPriority.P3);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const completed = localStorage.getItem("onboarding_completed");
    if (completed === "true") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  const goToStep = useCallback(
    (nextStep: number) => {
      setDirection(nextStep > step ? 1 : -1);
      setStep(nextStep);
    },
    [step],
  );

  const canProceedFromStep = useCallback(() => {
    switch (step) {
      case 0:
        return displayName.trim().length > 0;
      case 1:
        return selectedGoal !== null;
      case 2:
        return true;
      default:
        return true;
    }
  }, [step, displayName, selectedGoal]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    const result = await completeOnboarding({
      displayName: displayName.trim(),
      avatarColor,
      goal: selectedGoal ?? undefined,
      taskTitle: taskTitle.trim() || undefined,
      taskPriority: taskTitle.trim() ? taskPriority : undefined,
    });

    if (result.error) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    localStorage.setItem("onboarding_completed", "true");
    router.replace("/dashboard");
  }, [displayName, avatarColor, selectedGoal, taskTitle, taskPriority, router]);

  if (isLoading || !user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Get Started with Questify</CardTitle>
          <CardDescription>
            Set up your profile in just a few steps
          </CardDescription>

          {/* Progress indicator */}
          <div className="mt-6 flex items-center justify-center gap-2">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => i < step && goToStep(i)}
                  disabled={i >= step}
                  className={`flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                    i === step
                      ? "bg-primary text-primary-foreground"
                      : i < step
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                  } ${i < step ? "cursor-pointer" : "cursor-default"}`}
                >
                  {i < step ? (
                    <Check className="size-4" />
                  ) : (
                    i + 1
                  )}
                </button>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className={`h-0.5 w-8 rounded transition-colors ${
                      i < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: "easeInOut" }}
            >
              {/* Step 1: Welcome — display name + avatar color */}
              {step === 0 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <Sparkles className="size-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Welcome! Let&apos;s personalize your experience.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Avatar Color</Label>
                    <div className="flex gap-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setAvatarColor(color.value)}
                          className={`size-9 rounded-full ring-2 ring-offset-2 transition-all hover:scale-110 ${
                            avatarColor === color.value
                              ? "ring-primary scale-110"
                              : "ring-transparent"
                          }`}
                          style={{ backgroundColor: color.value }}
                          aria-label={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Choose first goal */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <Target className="size-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      What brings you to Questify?
                    </p>
                  </div>

                  <div className="grid gap-3">
                    {GOAL_CARDS.map((goal) => {
                      const Icon = goal.icon;
                      const isSelected = selectedGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          type="button"
                          onClick={() => setSelectedGoal(goal.id)}
                          className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all hover:bg-accent ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-border"
                          }`}
                        >
                          <div
                            className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="size-5" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{goal.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {goal.description}
                            </p>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className="size-5 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Create first task */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <ClipboardList className="size-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Create your first task to get started.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taskTitle">Task Title</Label>
                    <Input
                      id="taskTitle"
                      placeholder="e.g., Set up my workspace"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional — you can skip this and add tasks later.
                    </p>
                  </div>

                  {taskTitle.trim() && (
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <div className="flex gap-2">
                        {PRIORITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setTaskPriority(opt.value)}
                            className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm font-medium transition-all ${
                              taskPriority === opt.value
                                ? "border-primary bg-primary/5 ring-1 ring-primary"
                                : "border-border hover:bg-accent"
                            }`}
                          >
                            <span className={opt.color}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Summary */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                      <CheckCircle2 className="size-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Here&apos;s a summary of your setup.
                    </p>
                  </div>

                  <div className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Display Name
                      </span>
                      <span className="text-sm font-medium">
                        {displayName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Avatar Color
                      </span>
                      <div className="flex items-center gap-2">
                        <div
                          className="size-4 rounded-full"
                          style={{ backgroundColor: avatarColor }}
                        />
                        <span className="text-sm capitalize">
                          {AVATAR_COLORS.find((c) => c.value === avatarColor)
                            ?.label ?? ""}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Goal
                      </span>
                      <Badge variant="secondary">
                        {GOAL_CARDS.find((g) => g.id === selectedGoal)
                          ?.title ?? "Not set"}
                      </Badge>
                    </div>
                    {taskTitle.trim() && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          First Task
                        </span>
                        <span className="text-sm font-medium">
                          {taskTitle}
                        </span>
                      </div>
                    )}
                  </div>

                  {error && (
                    <p className="text-center text-sm text-destructive">
                      {error}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="mt-8 flex items-center justify-between">
            <div>
              {step > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => goToStep(step - 1)}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              )}
            </div>

            <div>
              {step < STEP_LABELS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => goToStep(step + 1)}
                  disabled={!canProceedFromStep()}
                >
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Let&apos;s go!
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
