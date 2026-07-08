"use server";

import { requireUser } from "@/lib/auth/requireUser";
import { revalidatePath } from "next/cache";
import { CreateTaskInputSchema } from "@/types/task";

const ROADMAP_TASKS = [
  // Block A — done
  { title: "A1: Сердце — красное на проде, жёлтое на стейджинге", status: "done", priority: "p4" },
  { title: "A2: Отладить быстрое создание задач", status: "done", priority: "p4" },
  { title: "A3: Auto-distribute — инфо-заглушка", status: "done", priority: "p4" },
  { title: "A4: Быстрое создание идей", status: "done", priority: "p4" },
  { title: "A5: Убрать онбординг", status: "done", priority: "p4" },
  { title: "A6: Тёмная тема в профиле", status: "done", priority: "p4" },
  // Block B — done
  { title: "B1: completeTask в updateTask — XP за задачи", status: "done", priority: "p3" },
  { title: "B2: awardXp в togglePlanItem — XP за планы", status: "done", priority: "p3" },
  { title: "B3: Ачивки — сид, checkAndAwardAchievements", status: "done", priority: "p3" },
  // Block C — in progress
  { title: "C0: Тип идеи — idea/problem, Telegram-префиксы, цвета", status: "done", priority: "p3" },
  { title: "C1: Идея → конвертировать в задачу", status: "in_progress", priority: "p2" },
  { title: "C2: Идея → конвертировать в план", status: "in_progress", priority: "p2" },
  { title: "C3: Элемент плана → конвертировать в задачу", status: "in_progress", priority: "p2" },
  // Block D — todo
  { title: "D1: Кастомные столбцы Kanban", status: "todo", priority: "p2" },
  { title: "D2: Быстрое создание в первом столбце Kanban", status: "todo", priority: "p2" },
  { title: "D3: Backlog — новый статус, скрываемый столбец", status: "todo", priority: "p2" },
  // Block E — todo
  { title: "E1: Дашборд как центр управления", status: "todo", priority: "p1" },
  // Block F — todo
  { title: "F1: Вкладка «Прогресс» — скиллбук / дерево технологий", status: "todo", priority: "p1" },
  { title: "F2: Вкладка «Время» — трекинг + AI-агент", status: "todo", priority: "p1" },
  // Block G — todo
  { title: "G1: Форма Request Access на лендинге", status: "todo", priority: "p2" },
  { title: "G2: Страница /invites", status: "todo", priority: "p2" },
  { title: "G3: Регистрация только с инвайт-токеном", status: "todo", priority: "p2" },
  { title: "G4: Telegram-уведомление о новых запросах", status: "todo", priority: "p2" },
  { title: "G5: DDoS-защита — per-email, global, Nginx", status: "todo", priority: "p2" },
  { title: "G6: Команда /approve из бота (фаза 2)", status: "todo", priority: "p2" },
  // Block H — todo
  { title: "H1: GitHub Secret SUPABASE_ACCESS_TOKEN", status: "todo", priority: "p2" },
  { title: "H2: Авто-миграции supabase db push в CI/CD", status: "todo", priority: "p2" },
  { title: "H3: Резерв: psql на VPS", status: "todo", priority: "p2" },
  { title: "H4: Резервное копирование БД", status: "todo", priority: "p2" },
  // Pending tasks from HANDOFF
  { title: "#1 GitHub PAT — Personal Access Token для CI/CD", status: "todo", priority: "p1" },
  { title: "#2 DeepSeek API-ключ — для OMA-агентов", status: "todo", priority: "p1" },
];

export async function seedRoadmap(): Promise<{ count: number; error?: string }> {
  const { supabase, user } = await requireUser();
  if (!user) return { count: 0, error: "Not authenticated" };

  for (const task of ROADMAP_TASKS) {
    const validated = CreateTaskInputSchema.parse({
      title: task.title,
      priority: task.priority,
    });

    await supabase.from("tasks").insert({
      user_id: user.id,
      title: validated.title,
      status: task.status,
      priority: validated.priority,
      xp_reward: 0,
    });
  }

  revalidatePath("/kanban", "layout");
  revalidatePath("/tasks", "layout");
  return { count: ROADMAP_TASKS.length };
}
