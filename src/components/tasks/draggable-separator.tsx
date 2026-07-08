"use client";

import { useDraggable } from "@dnd-kit/core";

export default function DraggableSeparator() {
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
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 py-3 cursor-grab active:cursor-grabbing select-none ${isDragging ? "opacity-50" : ""}`}
      role="separator"
      aria-label="Drag to move backlog boundary"
    >
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium text-muted-foreground">Backlog</span>
      <div className="h-px flex-1 bg-border" />
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
