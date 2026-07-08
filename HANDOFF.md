# HANDOFF — Questify MVP (перенос на другую машину)

## Подготовка

```bash
git clone https://github.com/itochkai-asiaps/questify.git
cd questify
git checkout staging
npm install
```

## Локальный запуск
```bash
npx next dev
```
Или батник: `Questify Dev.bat` (лежит на рабочем столе)

## Сервера

| | Staging | Production |
|---|---|---|
| IP | 195.63.160.68 | 87.199.197.190 |
| URL | v881545.hosted-by-vdsina.com | v869487.hosted-by-vdsina.com |
| Папка | /opt/questify-staging | /opt/questify |
| PM2 | questify-staging (порт 3000) | questify (порт 3000) |
| Supabase | irmihumjlbckwygtnvfi | zkifblsbwfllfmlndxjt |
| Бот | @questify_stage_bot | @questify_test_2_bot |

SSH-ключ: `C:\Users\user\.ssh\questify-deploy`

## Ветки
- `staging` — разработка (все изменения сюда)
- `master` — прод (мерж только по «мержи в прод»)

## Деплой
- Пуш в staging → GitHub Actions → деплой на VPS2
- Пуш в master → GitHub Actions → деплой на VPS1 (approval gate)
- Версия: `S v0.2-bN` (в углу на стейджинге, клик — копирует)

## Статус

| Блок | Статус |
|---|---|
| A — Быстрые фиксы | ✅ done |
| B — Геймификация | ✅ done |
| C — Связать сущности | ✅ done |
| D — Kanban-апгрейд | ✅ D1-D6 done (D2 инлайн, D3 Backlog, D5 разделитель, D6 drag-to-reorder) |
| E — Дашборд-центр | ✅ E1-E4 done (быстрые действия, HP-бар сердце, график 0-100, /focus) |
| F — Крупные фичи | ⬜ |
| G — Инвайт-система | ⬜ |
| H — Инфраструктура | ✅ done |
| I — На подумать | ⬜ |
| J — Геймификация 2.0 | ⬜ Boss-битвы, дерево навыков |
| K — Аналитика | ⬜ Heatmap, теги, оценка времени |
| L — Интеграции | ⬜ Telegram-создание, Google Calendar |
| M — AI (post-MVP) | ⬜ Декомпозиция, приоритизация, рефлексия |
| N — Комментарии | ⬜ |
| O — Тематические флоу | ⬜ Sci-Fi dev-flow (+O2e аналитика), Fantasy, фидбек |
| P — Тестовое покрытие | 🟡 P0 done (setupFiles), P1-P7 pending |
| Z — Неразвитые идеи | ⬜ Квесты, вебхуки, Pomodoro, S3 |

## Тесты
- Unit: 59/59 ✅ (`npx vitest run`)
- E2E: 18/18 ✅ (`npx playwright test`)

## Текущие задачи
- ✅ #1: GitHub PAT — создан, добавлен в Secrets
- ✅ #2: DeepSeek API-ключ — получен, настроен для OMA-агентов
- ✅ Рефакторинг — Stages 1-4 done (9 CRITICAL + 6 MAJOR + 4 MINOR fixes)
- 🟡 D7: Draggable Backlog/Todo разделитель с сохранением previous_status
- 🟡 E0: Быстродействие дашборда (RPC get_dashboard_data, < 500ms)

## Последние изменения (сессия 2026-07-08)

### Воркфлоу и процесс (OMO-апгрейд)
- ✅ AGENTS.md: полный конвейер `ulw → metis → hyperplan → momus → prometheus → /start-work`
- ✅ AGENTS.md: Context7, /ralph-loop, /remove-ai-slops, /debugging в 3-fix-stop
- ✅ AGENTS.md: HANDOFF → анализ стиля работы с блоком «Рекомендации по процессу»
- ✅ roadmap.md: 3 режима сессии (☕ 30мин / 🔧 1-2ч / ⚡ 3+ч марафон)
- ✅ roadmap.md: старт/финиш ритуалы, таблица частотности агентов, антипаттерны
- ✅ roadmap.md: O2e — тема «Оптимизация работы» в Sci-Fi dev-флоу
- ✅ roadmap.md: еженедельный аудит процесса (статистика + внешние рекомендации)
- ✅ roadmap.md: Block P (тестовое покрытие P0-P7)

### Инфраструктура тестов
- ✅ vitest.config.ts: `setupFiles: ["./tests/unit/setup.ts"]`
- ✅ tests/unit/setup.ts: глобальные моки `@supabase/ssr`, `next/headers`, `next/cache` (59/59 ✅)

### Кастомные скиллы OMO
- ✅ `supabase-migration` — правила идемпотентных миграций (IF NOT EXISTS, DO $$, RLS)
- ✅ `questify-deploy` — commit → push staging workflow, pre-commit checklist

### Важные решения
- Режим сессии — под окно возможностей (короткая/нормальная/марафон)
- hyperplan/momus — только марафон, не каждая сессия (дорого для пет-проекта)
- Финиш сессии ОБЯЗАТЕЛЕН: HANDOFF + commit + push (через 3 дня теряется контекст)
- Еженедельный аудит: git-статистика + librarian (новые фичи OMO, модели, скиллы)
- Коммит `c1aa545` — все изменения воркфлоу

### Рекомендации по процессу (анализ сессии)

> Сессия: 2026-07-08. Характер: чистый воркфлоу (документация + инфраструктура), 0 строк production-кода.

| Метрика | Значение |
|---|---|
| Коммитов | 1 (c1aa545) |
| fix:feat | N/A (нет production-изменений) |
| Гейты пройдены | Lefthook (type-check + lint), vitest 59/59 |
| Пропущено | Ничего |

**Рекомендация на следующую сессию:** начать с P1 (engine.ts тесты) — setupFiles готов, моки работают, можно сразу в TDD. Промпт: `"ulw deep: напиши тесты для lib/gamification/engine.ts — awardXp, completeTask с моком Supabase"`

### Рефакторинг Stage 1-3 (сессия 2026-07-08, часть 3)

#### Stage 1 — Архитектурный аудит (oracle)
- ✅ 5 областей проверено: Server Actions, типы/Zod, RLS, Zustand, revalidatePath
- ✅ 9 CRITICAL + 14 MAJOR + 12 MINOR проблем выявлено

#### Stage 2 — CRITICAL-фиксы
- ✅ `telegram_chats` RLS (миграция 00011)
- ✅ `getProfile` auth-проверка (profile.ts)
- ✅ Zod-валидация Telegram-идей (ideas.ts + route.ts)
- ✅ tags FormData→Zod fix (tasks.ts + types/task.ts)
- ✅ Zod-импорты стандартизированы (zod/v4)
- ✅ console.error в silent catches (tasks.ts + plans.ts)
- ✅ Double XP race guards (tasks.ts + plans.ts)
- ✅ Zod-валидация конверсий (conversions.ts)

#### Stage 3 — MAJOR-фиксы
- ✅ `requireUser()` helper — убрано 25+ дубликатов auth-check (src/lib/auth/requireUser.ts + 10 action-файлов)
- ✅ `revalidatePath("layout")` во всех action-файлах
- ✅ kanban-columns.ts — error handling + Zod + auth checks
- ✅ XP_REWARDS дедупликация (tasks.ts → levels.ts)
- ✅ Achievement XP divergence задокументирован (engine.ts)
- ✅ Stale closure fix — kanban/page.tsx (refs вместо closure)
- ✅ Stale closure fix — tasks/page.tsx (refs + error logging)

#### Важные решения
- `requireUser()` возвращает `{ supabase, user }` где user = null если не auth — callers проверяют `if (!user)`
- kanban-columns теперь возвращает `{ data?, error? }` вместо null/void
- XP_REWARDS теперь единый источник в levels.ts (импортируется tasks, plans, conversions)
- Stale closures в D&D: refs + useCallback с пустыми deps

#### Stage 4 — MINOR-фиксы
- ✅ `as`-касты → Zod.parse() на query results (focus, wellbeing, kanban-columns, engine, seed)
- ✅ `WITH CHECK` в RLS-политиках (миграция 00012, 11 таблиц)
- ✅ Zustand persist middleware — сессия переживает refresh
- ✅ lastUserId race fix — updateCounter вместо ref-сравнения
- ✅ signOut wrapper — очистка client state перед serverSignOut
- ✅ Dark-theme план-цвета — `brightness-75` на цветных элементах

### Блок D — D6, ревью, тулинг (сессия 2026-07-08, часть 2)

#### D6 завершён
- ✅ D6: drag-to-reorder — вертикальный D&D в Tasks (два SortableContext) и Kanban (кастомный collisionDetection). Два поля: `sort_order` (Tasks), `position` (Kanban). Миграция 00010 (нормализация + RPC + индексы)
- ✅ `/review-work` по D6 — 4/5 агентов, QA упал (управление dev-сервером). 2 CRITICAL + 3 MAJOR найдено
- ✅ Все CRITICAL исправлены: collisionDetection (`droppableData` → `droppableContainer.data.current.type`), `kanban_column_id` в TaskSchema (`as Record<string,unknown>` удалены), SECURITY DEFINER → INVOKER
- ✅ Zod-валидация UUID array в reorderTasks, revalidatePath /kanban

#### Тулинг
- ✅ Lefthook pre-commit: параллельный `lint` + `type-check` (~4 сек), блокирует при ошибке
- ✅ Playwright visual snapshots: auth.setup (storageState) + dashboard baseline
- ✅ Lefthook + ESLint/Prettier оставлены (Biome не нужен — 50-100 файлов)
- ✅ Storybook/Ladle/Lovable/Cursor/Claude Code — отложены (оверкилл для текущей стадии)

#### Процесс (новые правила)
- ✅ AGENTS.md: AGENT WORKFLOW — hyperplan (сложные фичи), visual-engineering (вёрстка), /visual-qa (гейт), /review-work (закрытие блока)
- ✅ Правило 3-fix-stop: 3 fix-коммита → стоп + root cause analysis
- ✅ Статистика коммитов в роадмапе (223 всего, fix:feat = 2.9:1)
- ✅ План рефакторинга: `.omo/plans/refactoring.md` — 4 этапа (архитектура → D → E → A-C)
- ✅ Конфиг OMO: `visual-engineering` + `artistry` → GPT-4o (rate limit GPT-4.1)

#### Важные решения (эта сессия)
- Миграции 0006-0009 на стейджинге ✅ (проверено через GitHub API)
- `position` и `sort_order` уже были в БД (00001), просто не использовались → миграция только нормализует
- Старый `kanban_column_id` отсутствовал в TaskSchema — типобезопасность восстановлена
- GPT-4.1 rate limit (30K TPM) → переключены на GPT-4o для визуальных агентов
- hyperplan: работает, но требует `team_mode: enabled` в конфиге
- `/review-work`: QA agent нестабилен при управлении dev-сервером → ручной QA надёжнее
- ESLint + Prettier оставлены как есть (миграция на Biome — экономия 3 сек, не стоит усилий)

#### Следующая сессия
- 🔴 **Приоритет #1**: рефакторинг по `.omo/plans/refactoring.md` (архитектура → блоки)
- После рефакторинга: D7 или E0

## Миграции

| # | Название | Staging | Prod |
|---|---|---|---|
| 0002 | RPC + ачивки | ✅ | ✅ |
| 0003 | type колонка ideas | ✅ | ✅ |
| 0004 | kanban_columns | ✅ | ✅ |
| 0005 | fix tasks_completed | ✅ | ✅ |
| 0006 | backlog_status | ✅ | ⬜ |
| 0007 | wellbeing_entries | ✅ | ⬜ |
| 0008 | focus_tasks | ✅ | ⬜ |
| 0009 | mood_score_0_100 | ✅ | ⬜ |
| 0010 | normalize_task_ordering | ⏳ | ⬜ |
| 0011 | telegram_chats_rls | ⬜ | ⬜ |
| 0012 | with_check_rls | ⬜ | ⬜ |
| 0012 | with_check_rls | ⬜ | ⬜ |

## Планы и требования
- `.omo/plans/roadmap.md`
- `.omo/plans/tests.md`
- `.omo/plans/invite-only.md`
- `.omo/requirements/README.md`
- `.omo/requirements/block-c-connect-entities.md`

## Ключевые файлы
- `AGENTS.md` — обновлённый agent workflow (ulw, metis→momus→prometheus, гейты)
- `.omo/plans/roadmap.md` — 3 режима сессии, Block P (тесты), еженедельный аудит
- `tests/unit/setup.ts` — глобальные моки Supabase + Next.js для TDD
- `vitest.config.ts` — setupFiles → ./tests/unit/setup.ts
- `~/.config/opencode/skills/supabase-migration/SKILL.md` — правила миграций
- `~/.config/opencode/skills/questify-deploy/SKILL.md` — commit/push workflow
- `src/hooks/useAuth.ts` — lastUserId ref (не дёргает setUser при TOKEN_REFRESHED)
- `src/lib/actions/tasks.ts` — updateTask вызывает completeTask
- `src/lib/actions/plans.ts` — togglePlanItem вызывает awardXp
- `src/lib/gamification/engine.ts` — awardXp, completeTask, achievements
- `src/lib/gamification/levels.ts` — XP_REWARDS, уровни, xpForPriority
- `src/lib/auth/requireUser.ts` — единый auth-хелпер (замена 25+ дубликатов)
- `supabase/migrations/00011_telegram_chats_rls.sql` — RLS для telegram_chats
- `HANDOFF.md` — этот файл в корне проекта
