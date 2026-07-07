"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getWellbeingHistory } from "@/lib/actions/wellbeing";
import { MOOD_LABELS, type WellbeingEntry } from "@/types/wellbeing";

export function MoodChart() {
  const [history, setHistory] = useState<WellbeingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    const result = await getWellbeingHistory(7);
    if (result.data) setHistory(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return null; // Don't show chart if no data yet
  }

  // Build 7-day array with gaps filled
  const days: { date: string; label: string; score: number | null }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const entry = history.find((e) => e.created_at.split("T")[0] === dateStr);
    days.push({
      date: dateStr,
      label: dayNames[d.getDay()]!,
      score: entry ? entry.mood_score : null,
    });
  }

  const scores = days.filter((d) => d.score !== null).map((d) => d.score!);
  const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  // Trend: compare first half vs second half of available scores
  let trend: "up" | "down" | "flat" = "flat";
  if (scores.length >= 2) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    if (secondHalf > firstHalf + 0.3) trend = "up";
    else if (secondHalf < firstHalf - 0.3) trend = "down";
  }

  const maxY = 5;
  const chartHeight = 120;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          Mood · Last 7 Days
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Chart */}
        <div className="relative" style={{ height: chartHeight }}>
          {/* Y-axis labels */}
          <div className="absolute inset-y-0 left-0 flex w-6 flex-col justify-between text-[10px] text-muted-foreground">
            <span>5</span>
            <span>3</span>
            <span>1</span>
          </div>
          {/* Grid lines */}
          {[1, 2, 3, 4, 5].map((y) => (
            <div
              key={y}
              className="absolute left-6 right-0 border-t border-border/50"
              style={{ top: `${((maxY - y) / (maxY - 1)) * 100}%` }}
            />
          ))}
          {/* Data points + line */}
          <svg
            className="absolute inset-0 left-6"
            viewBox={`0 0 ${(days.length - 1) * 48} ${chartHeight}`}
            preserveAspectRatio="none"
          >
            {/* Connecting lines */}
            {days.map((day, i) => {
              if (day.score === null || i === 0) return null;
              const prev = days[i - 1];
              if (prev?.score === null) return null;
              const x1 = (i - 1) * 48;
              const x2 = i * 48;
              const y1 = ((maxY - prev.score) / (maxY - 1)) * chartHeight;
              const y2 = ((maxY - day.score) / (maxY - 1)) * chartHeight;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  className="text-primary/40"
                  strokeWidth="2"
                />
              );
            })}
            {/* Data points */}
            {days.map((day, i) =>
              day.score !== null ? (
                <circle
                  key={i}
                  cx={i * 48}
                  cy={((maxY - day.score) / (maxY - 1)) * chartHeight}
                  r="4"
                  className="fill-primary stroke-background"
                  strokeWidth="2"
                />
              ) : null,
            )}
          </svg>
          {/* X-axis labels */}
          <div className="absolute bottom-0 left-6 right-0 flex justify-between">
            {days.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[10px] text-muted-foreground">{day.label}</span>
                {day.score !== null && (
                  <span className="text-xs">{MOOD_LABELS[day.score]?.emoji}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-10 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Avg: {avg.toFixed(1)}/5
          </span>
          <span className="flex items-center gap-1">
            Trend:{" "}
            {trend === "up" ? (
              <><TrendingUp className="size-3 text-green-500" /> Up</>
            ) : trend === "down" ? (
              <><TrendingDown className="size-3 text-red-500" /> Down</>
            ) : (
              <><Minus className="size-3" /> Stable</>
            )}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
