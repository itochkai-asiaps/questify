"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Lightbulb, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { createIdea, deleteIdea, getIdeas, toggleIdeaType } from "@/lib/actions/ideas";
import { convertIdeaToTask, convertIdeaToPlan } from "@/lib/actions/conversions";
import { toast } from "sonner";

type Idea = {
  id: string;
  title: string;
  description: string | null;
  source: "web" | "telegram";
  type: "idea" | "problem";
  created_at: string;
};

const TYPE_BADGE: Record<string, { label: string; variant: "secondary" | "outline" | "destructive"; className: string }> = {
  idea: { label: "Idea", variant: "outline", className: "" },
  problem: { label: "Problem", variant: "secondary", className: "bg-orange-500/15 text-orange-700 border-orange-500/20 dark:bg-purple-500/25 dark:text-purple-200 dark:border-purple-400/30" },
};

const sourceBadge = (source: string) =>
  source === "telegram"
    ? { label: "Telegram", variant: "secondary" as const }
    : { label: "Web", variant: "outline" as const };

export default function IdeasPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick create
  const [quickTitle, setQuickTitle] = useState("");
  const [quickType, setQuickType] = useState<"idea" | "problem">("idea");
  const [quickAdding, setQuickAdding] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const quickTitleRef = useRef(quickTitle);
  quickTitleRef.current = quickTitle;

  const loadIdeas = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getIdeas();
    if (result.error) {
      setError(result.error);
    } else {
      setIdeas((result.data ?? []) as Idea[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    loadIdeas();
  }, [user, authLoading, loadIdeas]);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      setIsSubmitting(true);
      await createIdea(formData);
      setIsSubmitting(false);
      loadIdeas();
    },
    [loadIdeas],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      await deleteIdea(id);
      setDeletingId(null);
      loadIdeas();
    },
    [loadIdeas],
  );

  const handleQuickCreate = useCallback(async () => {
    const title = quickTitleRef.current.trim();
    if (!title || quickAdding) return;

    setQuickAdding(true);
    setQuickError(null);
    const formData = new FormData();
    formData.set("title", title);
    formData.set("source", "web");
    formData.set("type", quickType);
    const result = await createIdea(formData);

    if (result.error) {
      setQuickError(result.error);
    } else {
      setQuickTitle("");
      if (result.data) {
        setIdeas((prev) => [result.data as Idea, ...prev]);
      }
    }
    setQuickAdding(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAdding]);

  if (authLoading || !user) return null;

  return (
    <div className="container mx-auto max-w-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading tracking-tight">Ideas</h1>
          <p className="text-muted-foreground mt-1">
            Quick capture. Decompose later into plans and tasks.
          </p>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button>
                <Plus className="size-4" />
                New Idea
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Idea</DialogTitle>
              <DialogDescription>
                Capture a thought quickly. You can decompose it into a plan later.
              </DialogDescription>
            </DialogHeader>

            <form
              action={handleSubmit}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>Type</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5",
                      "focus:ring-2 focus:ring-ring"
                    )}
                    onClick={(e) => {
                      const form = (e.target as HTMLElement).closest("form");
                      const hidden = form?.querySelector<HTMLInputElement>('input[name="type"]');
                      if (hidden) { hidden.value = "idea"; }
                    }}
                  >
                    <Lightbulb className="size-3.5" /> Idea
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      "flex-1 gap-1.5",
                      "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
                    )}
                    onClick={(e) => {
                      const form = (e.target as HTMLElement).closest("form");
                      const hidden = form?.querySelector<HTMLInputElement>('input[name="type"]');
                      if (hidden) { hidden.value = "problem"; }
                    }}
                  >
                    <AlertTriangle className="size-3.5" /> Problem
                  </Button>
                </div>
                <input type="hidden" name="type" value="idea" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="What's your idea?"
                  required
                  maxLength={500}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="Add some details..."
                  maxLength={5000}
                />
              </div>

              <DialogFooter>
                <DialogClose
                  render={
                    <Button variant="outline" disabled={isSubmitting} />
                  }
                >
                  Cancel
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Idea"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick create */}
      {!loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Quick add idea by name..."
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickCreate();
                  }
                }}
                disabled={quickAdding}
                className="pl-8"
              />
            </div>
            <Button
              variant={quickType === "idea" ? "default" : "outline"}
              size="icon-sm"
              onClick={() => { setQuickType("idea"); handleQuickCreate(); }}
              disabled={!quickTitle.trim() || quickAdding}
              className="shrink-0 gap-1"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant={quickType === "problem" ? "default" : "outline"}
              size="icon-sm"
              onClick={() => { setQuickType("problem"); handleQuickCreate(); }}
              disabled={!quickTitle.trim() || quickAdding}
              className={cn(
                "shrink-0 gap-1",
                quickType === "problem" && "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20"
              )}
            >
              <AlertTriangle className="size-3.5" />
            </Button>
          </div>
          {quickError && (
            <p className="text-xs text-destructive">{quickError}</p>
          )}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center gap-4 py-8">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" onClick={loadIdeas}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : ideas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Lightbulb className="size-12 text-muted-foreground/40" />
            <div className="text-center space-y-1">
              <p className="text-lg font-medium">No ideas yet</p>
              <p className="text-sm text-muted-foreground">
                Capture your thoughts before they disappear. Use the button above or send them via Telegram bot.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {ideas.map((idea) => (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.2 }}
              >
                <Card className={cn(
                  "group hover:ring-1 hover:ring-primary/20 transition-shadow",
                  idea.type === "problem" && "border-orange-500/20 bg-orange-500/10 dark:border-purple-400/30 dark:bg-purple-500/15"
                )}>
                  <CardHeader className="pb-2 relative">
                    {/* Mobile dropdown — top-right corner, hidden on desktop */}
                    <div className="absolute top-3 right-3 md:hidden z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="More actions"><MoreHorizontal className="size-4" /></Button>} />
                        <DropdownMenuContent align="end" sideOffset={4}>
                          <DropdownMenuItem
                            onClick={async () => {
                              const r = await convertIdeaToTask(idea.id);
                              if (r.error) toast.error(r.error);
                              else { toast.success("Converted to Task"); setIdeas((p) => p.filter((i) => i.id !== idea.id)); }
                            }}
                          >
                            →T Convert to Task
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const r = await convertIdeaToPlan(idea.id);
                              if (r.error) toast.error(r.error);
                              else { toast.success("Converted to Plan"); setIdeas((p) => p.filter((i) => i.id !== idea.id)); }
                            }}
                          >
                            →P Convert to Plan
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const result = await toggleIdeaType(idea.id);
                              if (!result.error) {
                                setIdeas((prev) =>
                                  prev.map((i) =>
                                    i.id === idea.id
                                      ? { ...i, type: i.type === "idea" ? "problem" : "idea" as "idea" | "problem" }
                                      : i,
                                  ),
                                );
                              }
                            }}
                          >
                            {idea.type === "idea" ? (
                              <AlertTriangle className="size-3.5 text-orange-500" />
                            ) : (
                              <Lightbulb className="size-3.5 text-yellow-500" />
                            )}
                            Toggle to {idea.type === "idea" ? "Problem" : "Idea"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(idea.id)}
                            disabled={deletingId === idea.id}
                          >
                            {deletingId === idea.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-col gap-2">
                      <CardTitle className="text-base line-clamp-3">{idea.title}</CardTitle>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Desktop: action buttons row — hidden on mobile */}
                        <div className="hidden md:flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={async () => {
                              const r = await convertIdeaToTask(idea.id);
                              if (r.error) toast.error(r.error);
                              else { toast.success("Converted to Task"); setIdeas((p) => p.filter((i) => i.id !== idea.id)); }
                            }}
                            aria-label="Convert to task"
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity text-[10px] font-bold px-1"
                          >
                            →T
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={async () => {
                              const r = await convertIdeaToPlan(idea.id);
                              if (r.error) toast.error(r.error);
                              else { toast.success("Converted to Plan"); setIdeas((p) => p.filter((i) => i.id !== idea.id)); }
                            }}
                            aria-label="Convert to plan"
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity text-[10px] font-bold px-1"
                          >
                            →P
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={async () => {
                              const result = await toggleIdeaType(idea.id);
                              if (!result.error) {
                                setIdeas((prev) =>
                                  prev.map((i) =>
                                    i.id === idea.id
                                      ? { ...i, type: i.type === "idea" ? "problem" : "idea" as "idea" | "problem" }
                                      : i,
                                  ),
                                );
                              }
                            }}
                            aria-label="Toggle type"
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                          >
                            {idea.type === "idea" ? (
                              <AlertTriangle className="size-3.5 text-orange-500" />
                            ) : (
                              <Lightbulb className="size-3.5 text-yellow-500" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(idea.id)}
                            disabled={deletingId === idea.id}
                            aria-label="Delete idea"
                            className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
                          >
                            {deletingId === idea.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                            )}
                          </Button>
                        </div>

                        {/* Tags — always visible */}
                        <Badge variant={TYPE_BADGE[idea.type].variant} className={TYPE_BADGE[idea.type].className}>
                          {TYPE_BADGE[idea.type].label}
                        </Badge>
                        <Badge variant={sourceBadge(idea.source).variant}>
                          {sourceBadge(idea.source).label}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  {idea.description && (
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {idea.description}
                      </p>
                    </CardContent>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
