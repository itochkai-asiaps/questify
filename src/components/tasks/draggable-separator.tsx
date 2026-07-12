"use client";

import { Minus, Plus } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";

interface DraggableSeparatorProps {
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export default function DraggableSeparator({ onMoveUp, onMoveDown }: DraggableSeparatorProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: "backlog-separator",
    data: { type: "separator" },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 py-3 select-none ${isDragging ? "opacity-50" : ""}`}
      role="separator"
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground shrink-0">Backlog</span>
      <div className="h-px flex-1 bg-border" />

      {/* +/- buttons — always visible */}
      <div className="flex items-center gap-0 shrink-0">
        <button
          type="button"
          aria-label="Move separator up (add to backlog)"
          onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }}
          className="flex size-5 items-center justify-center rounded-sm text-muted-foreground/50 hover:bg-muted hover:text-foreground active:scale-90 transition-transform"
        >
          <Plus className="size-3" />
        </button>
        <button
          type="button"
          aria-label="Move separator down (remove from backlog)"
          onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }}
          className="flex size-5 items-center justify-center rounded-sm text-muted-foreground/50 hover:bg-muted hover:text-foreground active:scale-90 transition-transform"
        >
          <Minus className="size-3" />
        </button>
      </div>

      {/* Desktop: drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="hidden sm:flex items-center shrink-0 cursor-grab active:cursor-grabbing"
        aria-label="Drag to move backlog boundary"
      >
        <div className="flex flex-col gap-px">
          <div className="h-0.5 w-3 rounded-full bg-muted-foreground/30" />
          <div className="h-0.5 w-3 rounded-full bg-muted-foreground/30" />
          <div className="h-0.5 w-3 rounded-full bg-muted-foreground/30" />
        </div>
      </div>
    </div>
  );
}

export function DraggableSeparatorOverlay() {
  return (
    <div className="flex items-center gap-3 py-3 opacity-80">
      <div className="h-px flex-1 bg-primary" />
      <span className="text-xs font-medium text-primary">Backlog</span>
      <div className="h-px flex-1 bg-primary" />
    </div>
  );
}
