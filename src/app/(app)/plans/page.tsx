"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ClipboardList, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlanCard } from "@/components/plans/plan-card";
import { deletePlan, getPlans } from "@/lib/actions/plans";
import type { Plan } from "@/types/plan";

// Server-augmented Plan with computed progress fields
type PlanWithProgress = Plan & {
  completed: number;
  total: number;
  progress: number;
};

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanWithProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadPlans = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getPlans();
    if (result.error) {
      setError(result.error);
    } else {
      setPlans((result.data ?? []) as PlanWithProgress[]);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSelect = useCallback(
    (id: string) => {
      router.push(`/plans/${id}`);
    },
    [router],
  );

  const handleDeleteRequest = useCallback((id: string, title: string) => {
    setDeleteTarget({ id, title });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    // Optimistic removal
    setPlans((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    setDeleteTarget(null);

    const result = await deletePlan(deleteTarget.id);
    if (result.error) {
      setError(result.error);
      // Refetch to restore correct state
      loadPlans();
    }
    setIsDeleting(false);
  }, [deleteTarget, loadPlans]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  // Filter: hide completed plans unless toggle is on
  const visiblePlans = showCompleted ? plans : plans.filter((p) => p.total > 0 && p.progress < 100);

  const completedCount = plans.filter((p) => p.total > 0 && p.progress >= 100).length;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Break down your goals into actionable steps.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <Button
              variant={showCompleted ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowCompleted((v) => !v)}
            >
              {showCompleted ? "Hide completed" : `Show completed (${completedCount})`}
            </Button>
          )}
          <Button onClick={() => router.push("/plans/new")} size="lg">
            <Plus className="size-4" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && visiblePlans.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
            <ClipboardList className="size-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">
            {plans.length === 0 ? "No plans yet!" : "All plans completed!"}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {plans.length === 0
              ? "Create your first plan to start breaking down your goals into manageable steps."
              : `You have ${completedCount} completed plan${completedCount > 1 ? "s" : ""}. Toggle "Show completed" to see them.`}
          </p>
          <Button onClick={() => router.push("/plans/new")} className="mt-6" size="lg">
            <Plus className="size-4" />
            Create your first plan
          </Button>
        </motion.div>
      )}

      {/* Plan grid */}
      {!isLoading && visiblePlans.length > 0 && (
        <motion.div layout className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visiblePlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={handleSelect}
                onDelete={handleDeleteRequest}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FAB for mobile */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Button onClick={() => router.push("/plans/new")} size="icon-lg" className="shadow-lg">
          <Plus className="size-5" />
        </Button>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) handleDeleteCancel();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This action cannot
              be undone and all steps will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting || !deleteTarget}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
