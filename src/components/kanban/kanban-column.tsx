"use client";

import { useState, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { Plus, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  isFirst: boolean;
  isLast: boolean;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isFirst,
  isLast,
  onRename,
  onDelete,
  onMoveLeft,
  onMoveRight,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column", title } });
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const inputRef = useRef<HTMLInputElement>(null);
  const taskIds = tasks.map((t) => t.id);

  const handleSave = () => {
    const t = editTitle.trim();
    if (t) { onRename(id, t); setEditing(false); }
  };

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border bg-card/60 md:flex-1 md:min-w-0">
      {/* Column header — rename, count, reorder, delete */}
      <div className="flex items-center gap-1 border-b border-border px-3 py-2">
        {editing ? (
          <>
            <Input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
              className="h-7 text-sm flex-1"
              autoFocus
            />
            <Button size="icon-xs" variant="ghost" onClick={handleSave}><Check className="size-3" /></Button>
            <Button size="icon-xs" variant="ghost" onClick={() => setEditing(false)}><X className="size-3" /></Button>
          </>
        ) : (
          <>
            <h3
              className="flex-1 text-sm font-semibold cursor-pointer px-1 py-0.5 rounded hover:text-primary"
              onClick={() => { setEditTitle(title); setEditing(true); }}
            >
              {title}
            </h3>
            <span className="text-[11px] text-muted-foreground tabular-nums mr-1">{tasks.length}</span>
            {!isFirst && (
              <Button size="icon-xs" variant="ghost" onClick={() => onMoveLeft(id)}>
                <ChevronLeft className="size-3.5" />
              </Button>
            )}
            {!isLast && (
              <Button size="icon-xs" variant="ghost" onClick={() => onMoveRight(id)}>
                <ChevronRight className="size-3.5" />
              </Button>
            )}
            <Button size="icon-xs" variant="ghost" onClick={() => onDelete(id)}>
              <Trash2 className="size-3 text-muted-foreground hover:text-destructive" />
            </Button>
          </>
        )}
      </div>

      <Link href="/tasks/new" className="block border-b border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
        <Plus className="inline size-3 mr-1" />Add task
      </Link>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={cn("flex min-h-[80px] flex-col gap-2 overflow-y-auto p-3", isOver && "bg-primary/5")}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <KanbanCard key={task.id} task={task} />)
          ) : (
            <p className="py-4 text-center text-xs text-muted-foreground">Drop tasks here</p>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
