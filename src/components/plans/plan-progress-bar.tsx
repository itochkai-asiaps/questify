"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface PlanProgressBarProps {
  completed: number;
  total: number;
  color?: string;
  className?: string;
}

export function PlanProgressBar({
  completed,
  total,
  color = "#6366f1",
  className,
}: PlanProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const [animatedWidth, setAnimatedWidth] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimatedWidth(percentage), 50);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full dark:brightness-75"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${animatedWidth}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {percentage > 15 && (
        <span className="shrink-0 text-xs font-medium tabular-nums" style={{ color }}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
