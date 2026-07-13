import { TaskPriority, TaskStatus } from "@/types/task";

/**
 * Shared priority badge configuration.
 * Keys are string values matching TaskPriority enum ("p1", "p2", "p3", "p4").
 */
export const PRIORITY_CONFIG: Record<
  string,
  { label: string; variant: "destructive" | "secondary" | "outline" | "ghost" }
> = {
  [TaskPriority.P1]: { label: "P1", variant: "destructive" },
  [TaskPriority.P2]: { label: "P2", variant: "secondary" },
  [TaskPriority.P3]: { label: "P3", variant: "outline" },
  [TaskPriority.P4]: { label: "P4", variant: "ghost" },
};

/**
 * Shared status badge configuration.
 * Keys are string values matching TaskStatus enum.
 */
export const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  [TaskStatus.Backlog]: { label: "Backlog", variant: "outline" },
  [TaskStatus.Todo]: { label: "Todo", variant: "secondary" },
  [TaskStatus.InProgress]: { label: "In Progress", variant: "default" },
  [TaskStatus.Done]: { label: "Done", variant: "outline" },
  [TaskStatus.Missed]: { label: "Missed", variant: "outline" },
};
