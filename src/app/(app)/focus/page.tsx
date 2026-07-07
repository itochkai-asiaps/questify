"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Play, Pause, Square, Target } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFocusTask } from "@/lib/actions/focus";

const DEFAULT_DURATION = 25 * 60; // 25 minutes in seconds

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FocusPage() {
  const router = useRouter();
  const [focusTask, setFocusTask] = useState<{
    task_id: string;
    task_title?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer state
  const [duration, setDuration] = useState(DEFAULT_DURATION);
  const [remaining, setRemaining] = useState(DEFAULT_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchFocus = useCallback(async () => {
    const result = await getFocusTask();
    if (result.data) {
      setFocusTask(result.data);
    } else {
      // No focus task — redirect back
      router.replace("/dashboard");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    fetchFocus();
  }, [fetchFocus]);

  // Timer logic
  useEffect(() => {
    if (isRunning && !isPaused && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, isPaused, remaining]);

  const startTimer = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeTimer = useCallback(() => {
    setIsPaused(false);
  }, []);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setRemaining(duration);
    setIsComplete(false);
  }, [duration]);

  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;

  // Redirect if no focus task after loading
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>

        {/* Focus task */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="size-4 text-primary" />
              Focus Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-medium">
              {focusTask?.task_title ?? "Your task"}
            </p>
          </CardContent>
        </Card>

        {/* Timer */}
        <div className="flex flex-col items-center gap-6">
          {/* Timer display */}
          <div className="relative flex items-center justify-center">
            {/* Background circle */}
            <svg className="size-56 sm:size-64 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                className="text-muted/20"
                strokeWidth="4"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                className="text-primary transition-all duration-1000"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-4xl sm:text-5xl font-bold tabular-nums tracking-tight">
                {formatTime(remaining)}
              </span>
              {isComplete && (
                <span className="mt-2 text-sm font-medium text-green-500">
                  Session complete!
                </span>
              )}
            </div>
          </div>

          {/* Duration selector (only when not running) */}
          {!isRunning && (
            <div className="flex gap-2">
              {[15, 25, 45, 60].map((mins) => {
                const secs = mins * 60;
                return (
                  <Button
                    key={mins}
                    variant={duration === secs ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setDuration(secs);
                      setRemaining(secs);
                    }}
                  >
                    {mins}m
                  </Button>
                );
              })}
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {!isRunning ? (
              <Button size="lg" onClick={startTimer} className="gap-2 min-w-[140px]">
                <Play className="size-4" />
                {isComplete ? "Restart" : "Start"}
              </Button>
            ) : (
              <>
                {isPaused ? (
                  <Button size="lg" onClick={resumeTimer} className="gap-2 min-w-[120px]">
                    <Play className="size-4" />
                    Resume
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" onClick={pauseTimer} className="gap-2 min-w-[120px]">
                    <Pause className="size-4" />
                    Pause
                  </Button>
                )}
                <Button size="lg" variant="ghost" onClick={stopTimer} className="gap-2">
                  <Square className="size-4" />
                  Stop
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
