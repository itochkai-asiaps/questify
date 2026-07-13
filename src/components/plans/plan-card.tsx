"use client";

import { motion } from "framer-motion";
import { ListChecks, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanProgressBar } from "@/components/plans/plan-progress-bar";
import type { Plan, PlanItem } from "@/types/plan";

interface PlanCardProps {
  plan: Plan;
  onSelect: (id: string) => void;
  onDelete: (id: string, title: string) => void;
}

function computeProgress(items: PlanItem[]) {
  const total = items.length;
  const completed = items.filter((i) => i.completed).length;
  return { total, completed };
}

export function PlanCard({ plan, onSelect, onDelete }: PlanCardProps) {
  const { id, title, description, color, items } = plan;
  const { total, completed } = computeProgress(items ?? []);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="group relative cursor-pointer h-full"
      onClick={() => onSelect(id)}
    >
      {/* Left accent bar */}
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-xl dark:brightness-75"
        style={{ backgroundColor: color }}
      />

      <Card className="pl-4 h-full">
        <CardHeader className="gap-1.5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-1 text-base">{title}</CardTitle>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id, title);
              }}
              aria-label={`Delete plan: ${title}`}
            >
              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
          {description && <CardDescription className="line-clamp-2">{description}</CardDescription>}
        </CardHeader>

        <CardContent className="space-y-2.5 pb-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListChecks className="size-3.5" />
            <span>
              {completed}/{total} completed
            </span>
          </div>

          <PlanProgressBar completed={completed} total={total} color={color} />
        </CardContent>
      </Card>
    </motion.div>
  );
}
