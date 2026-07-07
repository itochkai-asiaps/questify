"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createWellbeingEntry, getTodaysLatestEntry } from "@/lib/actions/wellbeing";
import { MOOD_LABELS, type WellbeingEntry } from "@/types/wellbeing";

export function WellbeingHeart() {
  const [open, setOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [latestEntry, setLatestEntry] = useState<WellbeingEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLatest = useCallback(async () => {
    const result = await getTodaysLatestEntry();
    if (result.data) setLatestEntry(result.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const handleSave = useCallback(async () => {
    if (selectedMood === null || saving) return;
    setSaving(true);
    const result = await createWellbeingEntry(selectedMood, note || undefined);
    if (result.data) {
      setLatestEntry(result.data as WellbeingEntry);
      setOpen(false);
      setNote("");
      setSelectedMood(null);
    }
    setSaving(false);
  }, [selectedMood, note, saving]);

  const openDialog = useCallback(() => {
    setSelectedMood(null); // always fresh — no prefill
    setNote("");
    setOpen(true);
  }, []);

  const isProd = typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "production";

  // Color based on today's latest mood
  const heartColor = latestEntry
    ? (() => {
        const s = latestEntry.mood_score;
        if (s <= 2) return isProd ? "#ef4444" : "#fde047";
        if (s === 3) return isProd ? "#f97316" : "#eab308";
        return isProd ? "#22c55e" : "#22c55e";
      })()
    : isProd
      ? "#ef4444"
      : "#fde047";

  const heartColor2 = latestEntry
    ? (() => {
        const s = latestEntry.mood_score;
        if (s <= 2) return isProd ? "#dc2626" : "#eab308";
        if (s === 3) return isProd ? "#ea580c" : "#a16207";
        return isProd ? "#16a34a" : "#16a34a";
      })()
    : isProd
      ? "#dc2626"
      : "#eab308";

  const latestMood = latestEntry ? MOOD_LABELS[latestEntry.mood_score] : null;

  return (
    <>
      <div className="flex flex-col items-center justify-center py-4">
        <button
          type="button"
          onClick={openDialog}
          className="group relative flex flex-col items-center gap-2"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <svg
              className="size-32 sm:size-40 cursor-pointer transition-transform group-hover:scale-110"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <radialGradient id="heartGrad2" cx="50%" cy="30%" r="70%">
                  <stop offset="0%" stopColor={heartColor} />
                  <stop offset="50%" stopColor={heartColor2} />
                  <stop offset="100%" stopColor={isProd ? "#991b1b" : "#a16207"} />
                </radialGradient>
              </defs>
              <path
                d="M50 85 C30 70, 5 55, 5 35 C5 20, 20 8, 35 12 C42 14, 48 19, 50 25 C52 19, 58 14, 65 12 C80 8, 95 20, 95 35 C95 55, 70 70, 50 85Z"
                fill="url(#heartGrad2)"
                stroke={isProd ? "#7f1d1d" : "#991b1b"}
                strokeWidth="1.5"
              />
            </svg>
          </motion.div>
          {latestMood && (
            <span className="text-sm font-medium text-muted-foreground">
              {latestMood.emoji} {latestMood.label}
            </span>
          )}
          {!latestMood && !loading && (
            <span className="text-xs text-muted-foreground">How are you today?</span>
          )}
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How are you feeling?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mood selector */}
            <div className="flex justify-center gap-3">
              {Object.entries(MOOD_LABELS).map(([score, { emoji, label }]) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setSelectedMood(Number(score))}
                  className={`flex flex-col items-center gap-1 rounded-xl p-3 transition-all ${
                    selectedMood === Number(score)
                      ? "scale-110 bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
            {/* Optional note */}
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note (optional)..."
              className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              maxLength={500}
            />
            <Button
              onClick={handleSave}
              disabled={selectedMood === null || saving}
              className="w-full"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
