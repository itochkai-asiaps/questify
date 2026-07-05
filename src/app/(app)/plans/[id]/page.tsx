"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlanProgressBar } from "@/components/plans/plan-progress-bar";
import {
  addPlanItem,
  deletePlanItem,
  getPlanById,
  togglePlanItem,
  updatePlan,
} from "@/lib/actions/plans";
import { convertPlanItemToTask } from "@/lib/actions/conversions";
import type { Plan, PlanItem } from "@/types/plan";
import { toast } from "sonner";

const checklistItemVariants = {
  initial: { opacity: 0, x: -12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
};

const checkboxVariants = {
  unchecked: { scale: 1 },
  checked: {
    scale: [1, 1.3, 1],
    transition: { duration: 0.25 },
  },
};

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const planId = params.id;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");

  // Add item form
  const [newItemTitle, setNewItemTitle] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);

  // Toggling items (track loading item IDs)
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());

  const loadPlan = useCallback(async () => {
    if (!planId) return;
    setIsLoading(true);
    setError(null);
    const result = await getPlanById(planId);
    if (result.error) {
      setError(result.error);
    } else {
      const data = result.data as Plan;
      setPlan(data);
      setItems((data.items ?? []) as PlanItem[]);
      setEditTitle(data.title);
    }
    setIsLoading(false);
  }, [planId]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  // Recompute progress from items
  const completed = items.filter((i) => i.completed).length;
  const total = items.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const planColor = plan?.color ?? "#6366f1";

  // Toggle a checklist item (optimistic)
  const handleToggle = useCallback(
    async (itemId: string) => {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, completed: !item.completed } : item,
        ),
      );
      setTogglingItems((prev) => new Set(prev).add(itemId));

      const result = await togglePlanItem(itemId);
      if (result.error) {
        // Revert on failure
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, completed: !item.completed }
              : item,
          ),
        );
      }
      setTogglingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    },
    [],
  );

  // Delete an item (optimistic)
  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      // Optimistic removal
      setItems((prev) => prev.filter((item) => item.id !== itemId));

      const result = await deletePlanItem(itemId);
      if (result.error) {
        // Revert on failure — reload
        loadPlan();
      }
    },
    [loadPlan],
  );

  // Add a new item
  const handleAddItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newItemTitle.trim() || !planId) return;

      setIsAddingItem(true);
      const formData = new FormData();
      formData.set("title", newItemTitle.trim());

      const result = await addPlanItem(planId, formData);
      if (result.error) {
        setError(result.error);
      } else {
        setNewItemTitle("");
        loadPlan();
      }
      setIsAddingItem(false);
    },
    [newItemTitle, planId, loadPlan],
  );

  // Save inline title edit
  const handleSaveTitle = useCallback(async () => {
    if (!planId || !editTitle.trim() || editTitle.trim() === plan?.title) {
      setIsEditingTitle(false);
      setEditTitle(plan?.title ?? "");
      return;
    }

    const formData = new FormData();
    formData.set("title", editTitle.trim());

    const result = await updatePlan(planId, formData);
    if (result.error) {
      setError(result.error);
      setEditTitle(plan?.title ?? "");
    } else {
      setPlan((prev) => (prev ? { ...prev, title: editTitle.trim() } : prev));
    }
    setIsEditingTitle(false);
  }, [planId, editTitle, plan]);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="mb-6 h-6 w-16 animate-pulse rounded bg-muted" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-2.5 animate-pulse rounded-full bg-muted" />
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-center text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="container mx-auto max-w-2xl p-6">
      {/* Back button */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.push("/plans")}>
          <ArrowLeft className="size-4" />
          Back to Plans
        </Button>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {/* Color indicator */}
          <div
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: planColor }}
          />

          {/* Editable title */}
          {isEditingTitle ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                    setEditTitle(plan.title);
                  }
                }}
                autoFocus
                className="text-2xl font-bold h-auto py-1"
              />
              <Button size="icon-sm" onClick={handleSaveTitle}>
                <Check className="size-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {plan.title}
              </h1>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setIsEditingTitle(true);
                  setEditTitle(plan.title);
                }}
                aria-label="Edit title"
              >
                <Pencil className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>

        {plan.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {plan.description}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <PlanProgressBar
          completed={completed}
          total={total}
          color={planColor}
          className="mb-1.5"
        />
        <p className="text-xs text-muted-foreground">
          {completed} of {total} steps completed ({percentage}%)
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1.5">
        <AnimatePresence initial={false}>
          {items.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-8 text-center text-sm text-muted-foreground"
            >
              No steps yet. Add your first step below.
            </motion.p>
          )}

          {items
            .sort((a, b) => a.position - b.position)
            .map((item) => (
              <motion.div
                key={item.id}
                variants={checklistItemVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/50"
              >
                {/* Checkbox */}
                <motion.button
                  type="button"
                  variants={checkboxVariants}
                  animate={item.completed ? "checked" : "unchecked"}
                  onClick={() => handleToggle(item.id)}
                  disabled={togglingItems.has(item.id)}
                  className={`flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    item.completed
                      ? "border-transparent text-white"
                      : "border-muted-foreground/30 text-transparent hover:border-muted-foreground/50"
                  }`}
                  style={
                    item.completed
                      ? { backgroundColor: planColor, borderColor: planColor }
                      : undefined
                  }
                  aria-label={
                    item.completed ? "Mark incomplete" : "Mark complete"
                  }
                >
                  <Check className="size-3" />
                </motion.button>

                {/* Title */}
                <span
                  className={`flex-1 text-sm ${
                    item.completed
                      ? "text-muted-foreground line-through"
                      : ""
                  }`}
                >
                  {item.title}
                </span>

                {/* Convert to task (incomplete items only) */}
                {!item.completed && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="opacity-0 group-hover:opacity-100 text-[10px] font-bold"
                    onClick={async () => {
                      const r = await convertPlanItemToTask(item.id);
                      if (r.error) toast.error(r.error);
                      else { toast.success("Converted to Task"); setItems((p) => p.filter((i) => i.id !== item.id)); }
                    }}
                    aria-label="Convert to task"
                  >
                    →T
                  </Button>
                )}

                {/* Delete button */}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 group-hover:opacity-100"
                  onClick={() => handleDeleteItem(item.id)}
                  aria-label={`Delete step: ${item.title}`}
                >
                  <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* Add item form */}
      <form
        onSubmit={handleAddItem}
        className="mt-4 flex items-center gap-2"
      >
        <Input
          placeholder="Add a step..."
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          disabled={isAddingItem}
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={isAddingItem || !newItemTitle.trim()}
          style={{ backgroundColor: planColor, borderColor: planColor }}
        >
          {isAddingItem ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Plus className="size-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
