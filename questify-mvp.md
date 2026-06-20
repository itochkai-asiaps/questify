# questify-mvp — Work Plan

## TL;DR (For humans)

**Что получится:** Геймифицированный веб-трекер задач с авторизацией, Kanban-доской, матрицей Эйзенхауэра, **планами с пошаговыми чеклистами**, системой опыта (XP/уровни/стрики), дашбордом прогресса. PWA — работает в браузере на телефоне и компьютере.

**Почему так:** Next.js 16 + Supabase дают скорость без компромиссов. Server Actions заменяют API роуты. Zustand — лёгкий state. shadcn/ui — готовые компоненты. @dnd-kit — drag & drop. Framer Motion — анимации геймификации.

**Что НЕ будет:** AI-чатбот, iOS приложение, Pomodoro, календарь, автоматизация, плагины — это Фаза 2/3.

**Effort:** Large (9 волн, ~22 задач)
**Risk:** Medium
**Стек:** Next.js 16 + Supabase + Zustand + shadcn/ui + @dnd-kit + Framer Motion + Vitest + Playwright

---

## Scope

### Must have

1. **Auth**: email/password + Google OAuth (Supabase Auth) + middleware-защита + онбординг
2. **Task CRUD**: title, description, priority (P1–P4), dueDate, tags, status, subtasks
3. **Kanban Board**: drag & drop (To Do → In Progress → Done)
4. **Eisenhower Matrix**: 4 квадранта, авто-распределение, drag-to-prioritize
5. **Plans**: создание структурированных планов с шагами + чеклист выполнения + прогресс-бар
6. **Gamification**: XP, уровни 1–50, daily streak, ачивки, анимации level-up
7. **Dashboard**: сводка прогресса, XP bar, уровень, streak
8. **Profile**: статистика, достижения, настройки, theme toggle
9. **PWA**: manifest + service worker, mobile-first responsive
10. **Тесты**: Vitest (unit) + Playwright (e2e)

### Must NOT have

1. ❌ AI чатбот
2. ❌ iOS/Android нативные приложения
3. ❌ Pomodoro таймер
4. ❌ Календарь / time blocking
5. ❌ Автоматизация (recurring tasks)
6. ❌ Плагины / модульная система
7. ❌ Социальные фичи (лидерборды, команды)
8. ❌ Микротранзакции / донат
9. ❌ Оффлайн-режим (кроме базового PWA cache)
10. ❌ Интеграции с внешними сервисами

---

## Пошаговый план выполнения (9 волн)

### Волна 1: Фундамент
**Цель:** Проект запускается, база готова, CI работает.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 1 | Scaffold Next.js 16 + shadcn/ui + Zustand + Framer Motion + @dnd-kit | Весь проект | `npm run dev` стартует, `npm run build` зелёный |
| 2 | Supabase проект + миграции (profiles, tasks, subtasks, achievements, user_achievements, user_stats, **plans, plan_items**) | `supabase/migrations/` | `supabase db push` проходит, все таблицы созданы |
| 3 | CI/CD (GitHub Actions: lint + type-check + test + build + Vercel preview) | `.github/workflows/` | Push → CI зелёный |
| Seed | Seed-данные (ачивки + уровни 1–50) | `supabase/seed.sql` | `supabase db seed` → 6 ачивок в БД |

### Волна 2: Авторизация
**Цель:** Пользователь может зарегистрироваться, войти, получить доступ к приложению.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 4 | Auth UI + логика: /login, /register, middleware, Supabase client/server, Google OAuth | `src/app/(auth)/`, `src/middleware.ts`, `src/lib/supabase/`, `src/hooks/useAuth.ts` | Регистрация → логин → /dashboard; без сессии → редирект на /login |
| 5 | Онбординг для новых пользователей (welcome → имя → первая задача) | `src/app/onboarding/` | Новый юзер → онбординг → после завершения не показывается |
| 6 | E2E тесты auth (Playwright): регистрация, логин, logout, защита роутов | `tests/e2e/auth.spec.ts` | `npx playwright test tests/e2e/auth.spec.ts` — всё зелёное |

### Волна 3: Задачи (CRUD)
**Цель:** Полноценное управление задачами — создание, редактирование, удаление, просмотр.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 7 | Server Actions + Zod-валидация: createTask, updateTask, deleteTask, getTasks | `src/lib/actions/tasks.ts`, `src/types/task.ts` | CRUD работает, soft-delete, RLS фильтрует чужие |
| 8 | Task UI: /tasks (list), /tasks/new, /tasks/[id] (edit) + TaskCard, TaskForm, фильтры | `src/app/tasks/`, `src/components/tasks/` | Создать → список → редактировать → удалить |
| 9 | Unit + integration тесты для Task модуля | `tests/unit/tasks/` | `npx vitest run tests/unit/tasks/` — coverage > 80% |

### Волна 4: Kanban Board
**Цель:** Drag & drop доска с тремя колонками.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 10 | KanbanBoard + KanbanColumn + KanbanCard, @dnd-kit drag & drop, смена статуса | `src/app/kanban/`, `src/components/kanban/` | Перетащил задачу → статус в БД обновился |
| 11 | E2E тесты Kanban (drag & drop, синхронизация статуса) | `tests/e2e/kanban.spec.ts` | Все тесты зелёные |

### Волна 5: Eisenhower Matrix
**Цель:** Матрица приоритетов с авто-распределением.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 12 | MatrixView + 4 квадранта, авто-распределение P1→Do First…P4→Eliminate, drag-to-prioritize, mobile responsive | `src/app/matrix/`, `src/components/matrix/` | P1 в Do First, drag меняет priority, на 375px вертикально |
| 13 | Тесты Matrix (логика распределения + e2e drag) | `tests/unit/matrix-logic.test.ts`, `tests/e2e/matrix.spec.ts` | Все тесты зелёные |

### Волна 6: Планы (Plans) 🆕
**Цель:** Пользователь создаёт структурированные планы с пошаговыми чеклистами и отслеживает прогресс.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 14 | Server Actions для Plans: createPlan, updatePlan, deletePlan, addPlanItem, togglePlanItem, getPlans, getPlanById | `src/lib/actions/plans.ts`, `src/types/plan.ts` | CRUD планов + toggle item → completed меняется |
| 15 | Plans UI: /plans (список), /plans/[id] (детальный экран с чеклистом) + PlanCard, PlanForm, PlanProgressBar | `src/app/plans/`, `src/components/plans/` | Создать план → добавить шаги → галочки → прогресс-бар обновляется |
| 16 | Интеграция с геймификацией: XP за выполнение шагов плана (+5XP за шаг, +25XP за завершение плана) | `src/lib/gamification/engine.ts` | Завершил шаг → +5XP; весь план → +25XP + ачивка «Planner» |
| 17 | Тесты Plans (unit + e2e) | `tests/unit/plans/`, `tests/e2e/plans.spec.ts` | Все тесты зелёные |

### Волна 7: Геймификация
**Цель:** XP, уровни, стрики, ачивки — игровая механика работает.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 18 | Gamification Engine: calculateXp, getLevel, checkStreak, checkAchievements + DB функции + LevelUpModal + XpToast | `src/lib/gamification/`, `supabase/migrations/` | P1→+50XP, уровень растёт, streak x1.5, ачивки разблокируются |
| 19 | Тесты Gamification (unit + e2e) | `tests/unit/gamification/`, `tests/e2e/gamification.spec.ts` | Coverage > 90%, все тесты зелёные |

### Волна 8: Dashboard + Profile
**Цель:** Сводка прогресса и личный кабинет.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 20 | Dashboard: XP bar, streak fire, today's tasks, статистика, последние ачивки | `src/app/dashboard/` | Все виджеты отображают актуальные данные |
| 21 | Profile: avatar, имя, статистика, сетка достижений, настройки, theme toggle | `src/app/profile/`, `src/lib/actions/profile.ts` | Изменить имя → сохранено; ачивки locked/unlocked; тема переключается |

### Волна 9: PWA + Финал
**Цель:** Приложение работает как PWA, все тесты зелёные.

| # | Задача | Файлы | Критерий готовности |
|---|--------|-------|-------------------|
| 22 | PWA: manifest, service worker, mobile polish (touch targets > 48px, safe areas) | `src/app/manifest.ts`, `public/sw.js` | Lighthouse PWA > 90, работает на 320px |
| 23 | Финальный прогон: `npm run test` + `npm run lint` + `npm run build` → всё зелёное | — | Все тесты зелёные, сборка без ошибок |

---

## Dependency matrix

| # | Задача | Зависит от | Блокирует | Параллельно с |
|---|--------|-----------|-----------|--------------|
| 1 | Scaffold | — | 2–23 | — |
| 2 | Supabase + DB | 1 | 4–23 | 3 |
| 3 | CI/CD | 1 | — | 2 |
| 4 | Auth UI | 2 | 5–23 | — |
| 5 | Онбординг | 4 | — | 6 |
| 6 | Auth e2e тесты | 4 | — | 5, 9 |
| 7 | Task CRUD backend | 2 | 8–23 | 4 |
| 8 | Task UI | 7 | 10–23 | — |
| 9 | Task тесты | 8 | — | 6 |
| 10 | Kanban | 8 | 11 | — |
| 11 | Kanban тесты | 10 | — | 13 |
| 12 | Matrix | 8 | 13 | — |
| 13 | Matrix тесты | 12 | — | 11 |
| 14 | Plans backend | 8 | 15–17 | 12 |
| 15 | Plans UI | 14 | 16–17 | — |
| 16 | Plans + Gamification | 14, 15 | — | 17 |
| 17 | Plans тесты | 15 | — | 16 |
| 18 | Gamification Engine | 8 | 19–21 | 14 |
| 19 | Gamification тесты | 18 | — | 17 |
| 20 | Dashboard | 18 | 21–22 | — |
| 21 | Profile | 18 | 22 | 20 |
| 22 | PWA + Polish | 21 | 23 | — |
| 23 | Final tests | 22 | — | — |

---

## DB Schema (дополнение — таблицы Plans)

```sql
-- Планы
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',  -- indigo-500
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Шаги плана
CREATE TABLE plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own plans" ON plans
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own plan items" ON plan_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM plans WHERE plans.id = plan_items.plan_id AND plans.user_id = auth.uid())
  );
```

---

## Маршруты приложения (навигация)

| Путь | Экран | Назначение |
|------|-------|-----------|
| `/login` | Auth | Вход (email + Google) |
| `/register` | Auth | Регистрация |
| `/onboarding` | Онбординг | Welcome wizard для новых |
| `/dashboard` | Дашборд | XP, streak, задачи на сегодня |
| `/tasks` | Список задач | CRUD задач, фильтры |
| `/tasks/new` | Новая задача | Форма создания |
| `/tasks/[id]` | Редактирование | Форма редактирования |
| `/kanban` | Kanban-доска | Drag & drop по статусам |
| `/matrix` | Матрица Эйзенхауэра | 4 квадранта, drag-to-prioritize |
| `/plans` | **Список планов** 🆕 | Все планы пользователя |
| `/plans/new` | **Новый план** 🆕 | Форма создания |
| `/plans/[id]` | **Экран плана** 🆕 | Чеклист шагов + прогресс-бар |
| `/profile` | Профиль | Статистика, ачивки, настройки |

---

## Gamification: XP-таблица

| Действие | XP |
|----------|-----|
| Завершить P1 задачу | 50 XP |
| Завершить P2 задачу | 30 XP |
| Завершить P3 задачу | 15 XP |
| Завершить P4 задачу | 5 XP |
| Завершить сабтаск | ⅓ XP родительской задачи |
| Завершить шаг плана | 5 XP |
| Завершить весь план | 25 XP |
| Бонус за daily streak | +10 XP/день |
| Streak > 7 дней | множитель ×1.5 |
| Streak > 30 дней | множитель ×2.0 |

**Уровни:** формула `n² × 25`, где n — уровень. Потолок: level 50 = 62,500 XP.

**Ачивки:**
- First Task (1 задача)
- Getting Started (10 задач)
- Hard Worker (50 задач)
- Week Warrior (7-day streak)
- Monthly Master (30-day streak)
- Perfect Day (10 задач за день)
- Planner (5 завершённых планов) 🆕

---

## Verification strategy

- **TDD** для ключевых модулей (gamification, auth, plans)
- **Tests-after** для UI
- **Vitest** — unit + integration
- **Playwright** — e2e
- **Evidence:** `.omo/evidence/task-<N>-questify-mvp.<ext>`

---

## Commit strategy

| Тип | Когда |
|-----|-------|
| `feat(scope)` | Новая фича |
| `test(scope)` | Тесты |
| `ci` | CI/CD |
| `fix(scope)` | Багфикс |
| `refactor(scope)` | Рефакторинг |
| `chore` | Инфраструктура |

Формат: `type(scope): описание`. Пример: `feat(plans): add plans CRUD with step checklist and progress tracking`

---

## Success criteria (финальная проверка)

1. ✅ Пользователь регистрируется и входит (email + Google)
2. ✅ Создаёт, редактирует, удаляет задачи
3. ✅ Переключается между List, Kanban и Matrix view
4. ✅ Kanban: drag & drop, статус синхронизирован
5. ✅ Matrix: 4 квадранта, авто-распределение, drag меняет priority
6. ✅ **Plans: создаёт план → добавляет шаги → отмечает галочки → прогресс-бар** 🆕
7. ✅ **Plans: завершение шагов/планов даёт XP и ачивку «Planner»** 🆕
8. ✅ XP начисляется за задачи/планы, уровень растёт
9. ✅ Streak отслеживается, множитель работает
10. ✅ Ачивки разблокируются
11. ✅ Dashboard показывает XP bar, streak, статистику
12. ✅ Profile показывает достижения и статистику
13. ✅ PWA: добавляется на home screen, Lighthouse > 90
14. ✅ Все тесты зелёные

---

## Final verification wave

> Запускается параллельно после ВСЕХ задач. Все должны APPROVE. Показать результаты пользователю и ждать явного «ок».

- [ ] F1. Plan compliance — всё из Scope IN реализовано, ничего из Scope OUT не добавлено
- [ ] F2. Code quality — `npm run lint`, `npm run type-check`, `npm run build`
- [ ] F3. E2E QA — Playwright полный прогон + Lighthouse audit
- [ ] F4. Scope fidelity — сверить продукт с документом Scope
