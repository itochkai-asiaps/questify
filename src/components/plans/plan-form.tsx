"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlan, updatePlan } from "@/lib/actions/plans";

const PLAN_COLORS = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#10b981", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#a855f7", label: "Purple" },
] as const;

interface PlanItem {
  title: string;
  estimated_minutes?: number;
}

interface PlanFormProps {
  mode: "create" | "edit";
  planId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    color?: string;
    items?: PlanItem[];
  };
}

export function PlanForm({ mode, planId, defaultValues }: PlanFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(defaultValues?.title ?? "");
  const [description, setDescription] = useState(
    defaultValues?.description ?? "",
  );
  const [color, setColor] = useState(
    defaultValues?.color ?? PLAN_COLORS[0].value,
  );
  const [items, setItems] = useState<PlanItem[]>(defaultValues?.items ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { title: "", estimated_minutes: undefined }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, title: string) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, title } : item)));
  }, []);

  const updateItemEstimated = useCallback((index: number, value: string) => {
    const num = value === "" ? undefined : parseInt(value, 10);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, estimated_minutes: num && num > 0 ? num : undefined } : item,
      ),
    );
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      const formData = new FormData();
      formData.set("title", title.trim());
      if (description.trim()) {
        formData.set("description", description.trim());
      }
      formData.set("color", color);

      let result: { data?: unknown; error?: string };

      if (mode === "create") {
        formData.set(
          "items",
          JSON.stringify(
            items
              .filter((i) => i.title.trim())
              .map((i) => ({
                title: i.title.trim(),
                estimated_minutes: i.estimated_minutes ?? undefined,
              })),
          ),
        );
        result = await createPlan(formData);
      } else {
        if (!planId) {
          setError("Plan ID is required for edit mode");
          setIsSubmitting(false);
          return;
        }
        result = await updatePlan(planId, formData);
      }

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      router.push("/plans");
    },
    [title, description, color, items, mode, planId, router],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="plan-title">
          Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="plan-title"
          placeholder="e.g., Launch MVP, Learn Spanish, Renovate kitchen"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="plan-description">Description</Label>
        <Input
          id="plan-description"
          placeholder="What is this plan about?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex gap-2.5">
          {PLAN_COLORS.map((c) => {
            const isSelected = color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                className={`relative flex size-8 items-center justify-center rounded-full transition-all hover:scale-110 ${
                  isSelected ? "scale-110 ring-2 ring-offset-1 ring-offset-background" : ""
                }`}
                style={{
                  backgroundColor: c.value,
                  ...(isSelected ? { "--tw-ring-color": c.value } : {}),
                } as React.CSSProperties}
                aria-label={c.label}
              >
                {isSelected && <Check className="size-3.5 text-white" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Items (create mode only) */}
      {mode === "create" && (
        <div className="space-y-3">
          <Label>Initial Steps</Label>

          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2"
              >
                <Input
                  placeholder={`Step ${index + 1}`}
                  value={item.title}
                  onChange={(e) => updateItem(index, e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="min"
                  value={item.estimated_minutes?.toString() ?? ""}
                  onChange={(e) => updateItemEstimated(index, e.target.value)}
                  className="w-16 text-center"
                  aria-label={`Estimated minutes for step ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove step ${index + 1}`}
                >
                  <X className="size-4 text-muted-foreground" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="w-full"
          >
            <Plus className="size-4" />
            Add step
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isSubmitting || !title.trim()}
        className="w-full dark:brightness-75"
        style={{ backgroundColor: color, borderColor: color }}
      >
        {isSubmitting ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : mode === "create" ? (
          "Create Plan"
        ) : (
          "Save Changes"
        )}
      </Button>
    </form>
  );
}
