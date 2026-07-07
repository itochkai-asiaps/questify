"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { createWellbeingEntry, getTodaysLatestEntry } from "@/lib/actions/wellbeing";
import { getMoodLabel, type WellbeingEntry } from "@/types/wellbeing";

export function WellbeingHeart() {
  const heartRef = useRef<HTMLDivElement>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null); // 0-100 during hover
  const [savedPct, setSavedPct] = useState<number | null>(null); // last saved level
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [latestEntry, setLatestEntry] = useState<WellbeingEntry | null>(null);

  // Post-save note input
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);
  const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);

  const fetchLatest = useCallback(async () => {
    const result = await getTodaysLatestEntry();
    if (result.data) {
      setLatestEntry(result.data);
      setSavedPct(result.data.mood_score);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLatest(); }, [fetchLatest]);

  // Cleanup timer on unmount
  useEffect(() => () => { if (noteTimerRef.current) clearTimeout(noteTimerRef.current); }, []);

  const displayPct = hoverPct ?? savedPct ?? 0;

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = heartRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // Y: 0 at top (100%) → 1 at bottom (0%)
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    setHoverPct(Math.round(y * 20) * 5); // snap to 5% zones
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverPct(null);
  }, []);

  const handleClick = useCallback(async () => {
    const pct = hoverPct ?? savedPct;
    if (pct === null || saving) return;
    setSaving(true);
    const result = await createWellbeingEntry(pct, note || undefined);
    if (result.data) {
      setLatestEntry(result.data as WellbeingEntry);
      setSavedPct(pct);
      setHoverPct(null);
      // Show note input for 5 seconds (timer pauses while focused)
      setNote("");
      setNoteSaved(false);
      setShowNote(true);
      if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
      noteTimerRef.current = setTimeout(() => setShowNote(false), 5000);
      setTimeout(() => noteRef.current?.focus(), 50);
    }
    setSaving(false);
  }, [hoverPct, savedPct, saving, note]);

  const handleNoteSubmit = useCallback(async () => {
    if (!note.trim() || !latestEntry) return;
    await createWellbeingEntry(latestEntry.mood_score, note.trim());
    setNoteSaved(true);
    setNote("");
    // Clear timer, hide after showing "Saved" briefly
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => { setShowNote(false); setNoteSaved(false); }, 1500);
  }, [note, latestEntry]);

  const startNoteTimer = useCallback(() => {
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    noteTimerRef.current = setTimeout(() => setShowNote(false), 5000);
  }, []);

  const pauseNoteTimer = useCallback(() => {
    if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
  }, []);

  const isProd = typeof window !== "undefined" && process.env.NEXT_PUBLIC_APP_ENV === "production";

  // HP-bar gradient: yellow (top / 100%) → red (bottom / 0%)
  const fillColor1 = isProd ? "#dc2626" : "#ef4444"; // bottom = low
  const fillColor2 = isProd ? "#fbbf24" : "#fde047"; // top = full
  const emptyColor = isProd ? "#7f1d1d22" : "#fde04722";

  // Heart shape path
  const heartPath = "M50 85 C30 70, 5 55, 5 35 C5 20, 20 8, 35 12 C42 14, 48 19, 50 25 C52 19, 58 14, 65 12 C80 8, 95 20, 95 35 C95 55, 70 70, 50 85Z";

  const latestMood = latestEntry ? getMoodLabel(latestEntry.mood_score) : null;

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {/* Interactive HP heart */}
      <div
        ref={heartRef}
        className="relative cursor-pointer select-none"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <svg
          className="size-36 sm:size-44"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hpGrad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={fillColor1} />
              <stop offset="100%" stopColor={fillColor2} />
            </linearGradient>
            {/* Clip from bottom: show only up to displayPct% */}
            <clipPath id="hpClip">
              <rect x="0" y={100 - displayPct} width="100" height={displayPct} />
            </clipPath>
          </defs>

          {/* Empty heart (background) */}
          <path
            d={heartPath}
            fill={emptyColor}
            stroke={isProd ? "#7f1d1d66" : "#a1620766"}
            strokeWidth="1.5"
            opacity={0.3}
          />

          {/* Filled portion */}
          <path
            d={heartPath}
            fill="url(#hpGrad)"
            clipPath="url(#hpClip)"
          />

          {/* Outline on top */}
          <path
            d={heartPath}
            fill="none"
            stroke={isProd ? "#7f1d1d" : "#991b1b"}
            strokeWidth="1.8"
          />
        </svg>

        {/* Saving indicator */}
        {saving && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white drop-shadow-md" />
          </div>
        )}

        {/* Hover tooltip */}
        {hoverPct !== null && !saving && (
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 translate-x-full rounded-md bg-popover px-2 py-1 text-xs font-medium shadow">
            {hoverPct}%
          </div>
        )}
      </div>

      {/* Label */}
      {loading ? (
        <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />
      ) : latestMood ? (
        <span className="mt-2 text-sm font-medium text-muted-foreground">
          {latestMood.emoji} {latestMood.label}
        </span>
      ) : (
        <span className="mt-2 text-xs text-muted-foreground">Click to set mood</span>
      )}

      {/* Note input (5s after save, pauses while typing) */}
      <AnimatePresence>
        {showNote && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 w-full max-w-[220px] overflow-hidden"
          >
            {noteSaved ? (
              <p className="text-center text-xs text-green-600 dark:text-green-400 font-medium">
                ✓ Saved
              </p>
            ) : (
              <div className="flex items-center gap-1.5">
                <input
                  ref={noteRef}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleNoteSubmit(); }}
                  onFocus={pauseNoteTimer}
                  onBlur={startNoteTimer}
                  placeholder="Add a note..."
                  maxLength={500}
                  className="h-7 flex-1 rounded-md border border-border bg-transparent px-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
