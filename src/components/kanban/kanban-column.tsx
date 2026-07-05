"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Task } from "@/types/task";

import { KanbanCard } from "./kanban-card";

const DEFAULT_CONFIG = { color: "border-l-muted", bgHover: "" };

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: Task[];
}

export function KanbanColumn({ id, title, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "column", title },
  });

  const taskIds = tasks.map((t) => t.id);

  return (
    <div
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-xl border border-border bg-card/60 md:w-full",
      )}
    >
      {/* Column header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-border px-4 py-3",
          DEFAULT_CONFIG.color,
          "border-l-4",
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">{title}</h3>
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
            {tasks.length}
          </span>
        </div>

        <Link href="/tasks/new">
          <Button variant="ghost" size="icon-xs" aria-label={`Add task to ${title}`}>
            <Plus className="size-3.5" />
          </Button>
        </Link>
      </div>

      {/* Card list */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[200px] flex-col gap-2 overflow-y-auto p-3 transition-colors",
          isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-b-xl",
        )}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.length > 0 ? (
            tasks.map((task) => <KanbanCard key={task.id} task={task} />)
          ) : (
            <div
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 px-4 py-8 text-center",
                isOver && "border-primary/40 bg-primary/5",
              )}
            >
              <p className="text-xs text-muted-foreground">
                {isOver ? "Release to drop" : "Drop tasks here"}
              </p>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}
