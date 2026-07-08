import { z } from "zod";

export enum TaskStatus {
  Backlog = "backlog",
  Todo = "todo",
  InProgress = "in_progress",
  Done = "done",
}

export enum TaskPriority {
  P1 = "p1",
  P2 = "p2",
  P3 = "p3",
  P4 = "p4",
}

export const TaskSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  due_date: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).default([]),
  position: z.number().int().nonnegative().default(0),
  sort_order: z.number().int().nonnegative().default(0),
  xp_reward: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const CreateTaskInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.P3),
  due_date: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
});

export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  due_date: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
  kanban_column_id: z.string().uuid().nullable().optional(),
  position: z.number().int().nonnegative().optional(),
  sort_order: z.number().int().nonnegative().optional(),
});

export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>;
