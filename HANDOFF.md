# HANDOFF — Questify MVP (перенос на другую машину)

## ⛔ Sisyphus — правила коммита (сессионный оверрайд GATE)

- **Staging**: коммит → немедленный push. Без вопроса. Без подтверждения. Всегда.
- **Master (прод)**: коммит и push — **только с явного подтверждения пользователя**. Спросить перед любым действием с master.
- **Финиш сессии**: сказать /stop-continuation перед закрытием сессии — иначе OH-MY-OPENCODE запустит автодобор отложенных задач.

## 💸 DeepSeek API — пиковые часы (с 15 июля 2026)

DeepSeek вводит **двойной тариф** в «горячее время» Китая. Все OMO-агенты работают через DeepSeek → агенты в пике стоят ×2.

| Пик          | UTC           | Москва (UTC+3) |
| ------------ | ------------- | -------------- |
| Утро (Китай) | 1:00–4:00 AM  | 4:00–7:00      |
| День (Китай) | 6:00–10:00 AM | 9:00–13:00     |

**Рекомендация на сессию:**

- ⚠️ **9:00–13:00 МСК — двойной тариф.** В это время: ручные правки, рефакторинг, тесты, UI. Избегать тяжёлых агентов (oracle, plan, hyperplan).
- ✅ **13:00–9:00 МСК — обычный тариф.** Агенты, explore- swarm, делегирование.
- 🎯 **Идеальное окно для тяжёлых сессий**: 13:00–4:00 МСК (вечер/ночь).

## Последние изменения (сессия 2026-07-13)

### Инструменты разработки — аудит и установка (#1–9)

- ✅ **Prettier** + eslint-config-prettier: `.prettierrc`, `eslint.config.mjs` (flat config)
- ✅ **.editorconfig**: root config (lf, utf-8, 2 spaces)
- ✅ **Lefthook**: sequential pre-commit (Prettier → Gitleaks → Lint → Type-check)
- ✅ **codegraph**: `.gitignore` готов, ожидает `codegraph init` (OpenCode-bundled CLI)
- ✅ **Gitleaks** v8.30.1: `.gitleaks.toml`, pre-commit secret scanning
- ✅ **Env validation**: `src/lib/env.ts` (Zod v4 server/client split) + `src/instrumentation.ts`
- ✅ **Knip**: `knip.config.ts` (Next.js App Router exceptions)
- ✅ **Bundle analyzer**: `next.config.ts` (ANALYZE=true), `@next/bundle-analyzer`
- ✅ **Lighthouse CI**: `lighthouserc.js`, `deploy-staging.yml` (soft fail, runs after deploy)

### LSP-серверы

- ✅ Установлены: `typescript`, `eslint`, `yaml-ls` (через npm global)
- ⬜ `codegraph init` — CLI не найден (требуется OpenCode session)

### AGENTS.md

- ✅ Planning #0: проверка инструментов (LSP + MCP) перед разработкой
- ✅ VALIDATION RULES: pre-commit checklist + agent rules

## Tooling Status (added 2026-07-13)

| Tool                  | Status        | Config                   | Notes                                               |
| --------------------- | ------------- | ------------------------ | --------------------------------------------------- |
| ESLint 9              | ✅ Configured | `eslint.config.mjs`      | core-web-vitals + typescript + prettier             |
| Prettier              | ✅ Installed  | `.prettierrc`            | Sequential pre-commit                               |
| .editorconfig         | ✅ Created    | `.editorconfig`          | Root config                                         |
| Lefthook              | ✅ Updated    | `lefthook.yml`           | Sequential: Prettier → Gitleaks → Lint → Type-check |
| codegraph             | ⬜ Pending    | `.gitignore`             | CLI needs OpenCode session to run                   |
| Gitleaks              | ✅ Installed  | `.gitleaks.toml`         | v8.30.1, pre-commit                                 |
| Zod env validation    | ✅ Created    | `src/lib/env.ts`         | Server/client separated                             |
| instrumentation.ts    | ✅ Created    | `src/instrumentation.ts` | Startup env validation                              |
| Knip                  | ✅ Installed  | `knip.config.ts`         | Dead code detection                                 |
| @next/bundle-analyzer | ✅ Installed  | `next.config.ts`         | `ANALYZE=true npm run build`                        |
| Lighthouse CI         | ✅ Added      | `lighthouserc.js`        | deploy-staging.yml (soft fail)                      |

### K1 — Оценка времени + missed статус

- ✅ **Миграция 00015**: `estimated_minutes` + `actual_minutes` на tasks, plan_items, plans, ideas + CHECK `tasks.status` расширен до `'missed'`
- ✅ **Enum**: `TaskStatus.Missed = "missed"`
- ✅ **Zod**: поля времени во всех схемах (TaskSchema, CreateTaskInputSchema, UpdateTaskInputSchema, PlanItemSchema, PlanSchema, createIdeaSchema, addPlanItemSchema)
- ✅ **Actions**: `createTask` — estimated; `updateTask` — auto-capture actual_minutes при done|missed (fallback = estimated); XP только для done
- ✅ **Actions**: `createPlan`/`addPlanItem` — estimated; `togglePlanItem` — auto-capture actual
- ✅ **Actions**: `createIdea` — estimated
- ✅ **UI**: `task-form.tsx` — estimated_minutes input + missed в статусах
- ✅ **UI**: `plan-form.tsx` + `plans/[id]/page.tsx` — estimated_minutes на шагах
- ✅ **Тесты**: 285/285 ✅ (S1-S6: create с estimated, complete→done, complete→missed, auto-capture)

### Процесс

- ✅ **HANDOFF**: DeepSeek peak hours (двойной тариф с 15 июля)

### Коммиты сессии

```
19b58b0 feat: K1 — time estimation (estimated_minutes + actual_minutes) + missed status
```

### Метрики

| Метрика         | Значение                                                   |
| --------------- | ---------------------------------------------------------- |
| Коммитов        | 1 (планируется)                                            |
| fix:feat        | 0:1 (feat: K1)                                             |
| Гейты           | vitest 285/285 ✅, tsc --noEmit ✅                         |
| Файлов изменено | 11 (миграция, 2 types, 3 actions, 3 UI, 1 test, 1 HANDOFF) |

### Рекомендация на следующую сессию

1. 🔴 **Аудит всей системы** — LSP + tsc --noEmit + eslint. Проверить все файлы на type safety, мёртвый код, отклонения от конвенций.
2. 🔴 **Дизайн-аудит** — `design-consultant` + `visual-qa`. Скриншоты всех экранов, сверка на консистентность (+/- кнопки, чекбоксы, статус-бейджи различаются от экрана к экрану).
3. 🟡 **Дизайн-система** — унифицировать повторяющиеся элементы в `components/ui/`: badge статусов, +/- controls, checkbox-list, drag-handle. Создать `DESIGN.md` с правилами.
4. 🟡 **Применить миграцию 00015** на стейджинг (`supabase db push`).
5. ⬜ K2 — Кастомные теги или Ручное QA по тест-плану

## Последние изменения (сессия 2026-07-12)

### Багфиксы (8 шт.)

- ✅ **Wellbeing**: `datetime()` → `datetime({ offset: true })` — Zod принимал только `Z`-суффикс, Supabase отдаёт `+00:00`
- ✅ **Сердце**: календарный день UTC вместо 24h sliding window — сброс в 00:00
- ✅ **Сердце**: «?» в пустом состоянии, скрывается при заполнении
- ✅ **График настроения**: smooth bezier trend line + CSS-точки (вместо SVG-эллипсов)
- ✅ **Tasks +/-**: debounce + sync sort_order с сервером после каждого перемещения
- ✅ **Tasks +/-**: кнопки крупнее (size-6), визуальная полоса `bg-muted/30` вне карточки
- ✅ **Kanban mobile**: D&D отключён на мобиле, стрелки ← → для перемещения между колонками
- ✅ **Plan create**: `formData.get()` → null → Zod `optional()` — fix `|| undefined`

### UI/UX

- ✅ **Разделитель беклога**: +/- кнопки слева, вертикально, D&D отключён на мобиле
- ✅ **Разделитель**: оптимистичное перемещение без перезагрузки страницы
- ✅ **Safari**: `min-h-dvh` + `safe-bottom: max(env(...), 5px)` — меню не заезжает на тулбар
- ✅ **Кнопки задач**: визуальная полоса `bg-muted/30 rounded-l-lg` вне карточки

### CI/CD

- ✅ **Версия с миграцией**: `S v0.2.0-b{N}/00014` — query `MAX(version)` из `supabase_migrations.schema_migrations`
- ✅ **deploy.yml (prod)**: то же самое
- ✅ **Мерж в master**: 85 файлов, +9565/-626 строк, fast-forward

### Процесс

- ✅ **HANDOFF**: ⛔ Sisyphus commit rules — staging auto, master confirm

### Коммиты сессии (13)

```
ed00e07 feat: kanban mobile column arrows + disable card D&D on mobile
3829626 fix: increase button strip padding px-0.5->px-1, card pl-8->pl-9 for no overlap
532901a fix: mobile task +/- buttons — separate strip with bg-muted/30 outside card edge
d05fa93 fix: task +/- ordering sync + larger buttons + vertical separator controls
6a0d8cd fix: plan create/update — convert null formData fields to undefined for Zod optional()
40990c4 feat: optimistic backlog separator moves — no page refresh on +/-
0ff85ac fix: move backlog separator controls (+/- and drag handle) to left side of line
5299739 fix: reduce safe-bottom min padding 16px -> 5px for tighter Safari toolbar fit
d5a9241 fix: mobile Safari bottom bar overlap — dvh layout + safe-area min padding
b86e2db feat: +/- buttons for backlog separator + disable separator D&D on mobile
233f9a8 fix: smooth bezier trend line + visible CSS dots on mood chart
263c634 fix: calendar-day heart reset + empty-state ? + mood chart trend line
f0e9f78 docs: add Sisyphus commit rules to HANDOFF — staging auto, master confirm
e8f5f55 fix: add datetime({offset:true}) to Zod schemas + migration version in deploy CI
```

### Рекомендации по процессу

> Сессия: 2026-07-12. Характер: багфикс + UI/UX. 3.5 ч (вместо плановых 2 ч).

| Метрика          | Значение                                       |
| ---------------- | ---------------------------------------------- |
| Коммитов         | 13                                             |
| fix:feat:docs    | 8:3:2                                          |
| Гейты            | Lefthook × 13, vitest 280/280, tsc --noEmit ✅ |
| Багов исправлено | 8                                              |
| Мерж в прод      | ✅ (fast-forward, 85 файлов)                   |

**Рекомендация на следующую сессию:**

1. Проверить прод — график настроения, сердце, бэкапы (теперь должны работать)
2. Ручное тестирование по тест-плану (DAO + Auth)
3. K1 (оценка времени) или K2 (кастомные теги) — пора начинать, fix:feat сейчас 3.0:1, цель с визуальными агентами ~2.0:1
4. Светлая тема — редизайн через `visual-engineering` + `design-consultant`

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

|          | Staging                      | Production                   |
| -------- | ---------------------------- | ---------------------------- |
| IP       | 195.63.160.68                | 87.199.197.190               |
| URL      | v881545.hosted-by-vdsina.com | v869487.hosted-by-vdsina.com |
| Папка    | /opt/questify-staging        | /opt/questify                |
| PM2      | questify-staging (порт 3000) | questify (порт 3000)         |
| Supabase | irmihumjlbckwygtnvfi         | zkifblsbwfllfmlndxjt         |
| Бот      | @questify_stage_bot          | @questify_test_2_bot         |

SSH-ключ: `C:\Users\user\.ssh\questify-deploy`

## Ветки

- `staging` — разработка (все изменения сюда)
- `master` — прод (мерж только по «мержи в прод»)

## Деплой

- Пуш в staging → GitHub Actions → деплой на VPS2
- Пуш в master → GitHub Actions → деплой на VPS1 (approval gate)
- Версия: `S v0.2-bN` (в углу на стейджинге, клик — копирует)

## Статус

| Блок                  | Статус                                                                                                                                          |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| A — Быстрые фиксы     | ✅ done                                                                                                                                         |
| B — Геймификация      | ✅ done                                                                                                                                         |
| C — Связать сущности  | ✅ done                                                                                                                                         |
| D — Kanban-апгрейд    | ✅ D1-D6 done (D2 инлайн, D3 Backlog, D5 разделитель, D6 drag-to-reorder)                                                                       |
| E — Дашборд-центр     | ✅ E1-E4 done (быстрые действия, HP-бар сердце, график 0-100, /focus)                                                                           |
| F — Крупные фичи      | ⬜                                                                                                                                              |
| G — Инвайт-система    | ⬜                                                                                                                                              |
| H — Инфраструктура    | ✅ done                                                                                                                                         |
| I — На подумать       | ⬜                                                                                                                                              |
| J — Геймификация 2.0  | ⬜ Boss-битвы, дерево навыков                                                                                                                   |
| K — Аналитика         | ⬜ Оценка времени + кастомные теги (см. ниже)                                                                                                   |
| K1 — Оценка времени   | ⬜ `estimated_minutes` + `actual_minutes` на tasks, plan_items, ideas, problems. При создании — estimated, при закрытии — actual. Для аналитики |
| K2 — Кастомные теги   | ⬜ Теги с цветами (Работа, Переезд, Здоровье, Рутина, Дом, Семья...). Привязка ко всем типам задач. Фильтрация                                  |
| L — Интеграции        | ⬜ Telegram-создание, Google Calendar                                                                                                           |
| M — AI (post-MVP)     | ⬜ Декомпозиция, приоритизация, рефлексия                                                                                                       |
| N — Комментарии       | ⬜                                                                                                                                              |
| O — Тематические флоу | ⬜ Sci-Fi dev-flow (+O2e аналитика), Fantasy, фидбек                                                                                            |
| P — Тестовое покрытие | ✅ 280 tests (10 files, P0-P7 done)                                                                                                             |
| Z — Неразвитые идеи   | ⬜ Квесты, вебхуки, Pomodoro, S3                                                                                                                |

## Тесты

- Unit: 59/59 ✅ (`npx vitest run`)
- E2E: 18/18 ✅ (`npx playwright test`)

## Текущие задачи

- ✅ #1: GitHub PAT — создан, добавлен в Secrets
- ✅ #2: DeepSeek API-ключ — получен, настроен для OMA-агентов
- ✅ Рефакторинг — Stages 1-4 done (9 CRITICAL + 6 MAJOR + 4 MINOR fixes)
- ✅ D7+D7a — Draggable Backlog/Todo разделитель + previous_status
- ✅ E0 — Быстродействие дашборда (RPC get_dashboard_data)
- ✅ Блок P — тестовое покрытие (280 тестов, 10 файлов)
- ⬜ Ручное тестирование по тест-плану (`.omo/plans/manual-qa-testplan.md`)
- ⬜ Проверка Safari mobile: server actions → прямой Supabase client в wellbeing-компонентах
- ⬜ Груминг: приоритезация оставшихся блоков (F, G, J, K, L, M, N, O, Z)
- 🟡 E0: Быстродействие дашборда (RPC get_dashboard_data, < 500ms)
- 🔴 Баг: график настроения пропал на проде — wellbeing не смержен в master (65 коммитов отставание)
- 🟢 Баг: сердце не показывает последний уровень за сегодня — ✅ fixed (24h sliding window + safeParse)
- 🟡 Проверить сердце на стейджинге после деплоя — safeParse должен показать причину ошибки
- ✅ Планы: завершённые скрыты по умолчанию, кнопка "Show completed (N)" в хедере
- ✅ Баг: разделитель backlog удваивал задачи и терял порядок — fixed (реконструкция массивов в исходном порядке)
- ⬜ Редизайн светлой темы — слишком блёклая и невыразительная
- ⬜ **K1 — Оценка времени**: `estimated_minutes` + `actual_minutes` на все сущности (tasks, ideas, problems, plans, plan_items). При создании — estimated, при закрытии — actual
- ⬜ **K2 — Кастомные теги**: таблица `tags` (name, color, user_id), связь many-to-many с tasks/ideas/problems/plans. Фильтрация по тегам

### 📊 fix:feat ratio (обновлено 2026-07-12)

| Период                     | fix | feat | fix:feat     |
| -------------------------- | --- | ---- | ------------ |
| Весь проект (228 коммитов) | 79  | 33   | 2.39:1       |
| До базы (≤ 2026-07-07)     | 58  | 26   | 2.23:1       |
| База (2026-07-08)          | —   | —    | 2.9:1        |
| После базы (07-08 → 07-12) | 21  | 7    | **3.0:1 ↗️** |

**Тренд**: 2.23 → 2.9 → 3.0. Рост ожидаем — последние сессии багфиксные. При переходе к K1/K2/F1 + визуальные агенты + HANDOFF-оверрайд → цель ~2.0:1.

## Последние изменения (сессия 2026-07-09)

### Багфиксы (5 шт.)

- ✅ **Сердце — timezone**: 24h sliding window вместо UTC-даты в `getTodaysLatestEntry` + `createWellbeingEntry`
- ✅ **Сердце — surface ошибок**: `WellbeingHeart` показывает текст ошибки вместо молчаливого «Click to set mood»
- ✅ **Сердце — safeParse**: `.parse()` → `.safeParse()` везде в `wellbeing.ts` — ZodError больше не throw
- ✅ **Планы — hide completed**: кнопка «Show completed (N)» в хедере, по умолчанию скрыты
- ✅ **Разделитель backlog**: удвоение задач + потеря порядка — реконструкция массивов в исходном порядке

### Процесс и документация

- ✅ AGENTS.md: ⛔ КОММИТ = НЕМЕДЛЕННЫЙ ПУШ STAGING (без вопроса)
- ✅ HANDOFF: QA на стейджинге `v881545.hosted-by-vdsina.com`, не на локалхосте
- ✅ AGENTS.md: после каждого пуша — версия `S v0.2.0-bN` для проверки
- ✅ `.omo/specs/E3-wellbeing-heart.md` — полная спецификация сердца (FR, NFR, AC, схема БД)

### CI/CD

- ✅ `deploy-staging.yml`: `continue-on-error` на миграциях + retry psql 3x
- ✅ `backup-staging.yml` + `backup.yml`: `set -e`, проверка размера дампа, retry pg_dump 3x

### Бэклог (новая сессия)

- ⬜ K1 — Оценка времени (estimated + actual на все сущности)
- ⬜ K2 — Кастомные теги (name + color, many-to-many, фильтрация)
- ⬜ Редизайн светлой темы
- 🔴 Баг: график настроения на проде (wellbeing не в master)
- 🟡 Проверить сердце на стейджинге — safeParse фикс (ждёт деплоя после runner)

### Коммиты сессии

```
cd1af00 docs: add K1 time estimation + K2 custom tags to backlog
5cf7241 fix: make backups and deploy resilient to Supabase transient 500s
fc0fa6a docs: report version after each push to staging
384af92 fix: replace Zod .parse() with .safeParse() in wellbeing actions
f27fc43 docs: commit = immediate push staging, QA on staging not localhost
bf7ecca fix: wellbeing 24h window, plans hide completed, separator doubling
```

### Рекомендации по процессу

> Сессия: 2026-07-09. Характер: багфикс + процесс.

| Метрика          | Значение                                      |
| ---------------- | --------------------------------------------- |
| Коммитов         | 6                                             |
| fix:docs         | 3:3                                           |
| Гейты            | Lefthook × 6, vitest 280/280, tsc --noEmit ✅ |
| Багов исправлено | 5                                             |

**Рекомендация на следующую сессию:**

1. 🔴 **Сначала** — проверить деплой стейджинга (runner issue). Версия должна быть ≥ `b222`
2. Проверить сердце на стейджинге — safeParse должен показывать конкретную ошибку вместо «Failed to save mood»
3. Если сердце работает — чинь заметку (PATCH вместо INSERT-дубликата)
4. Если нет — разбираться с корнем ошибки (Supabase коннект, схема, auth)

---

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
- ✅ **Ритуал финиша сессии**: HANDOFF → commit + push → /stop-continuation. Через 3 дня теряется контекст, поэтому ритуал обязателен. /stop-continuation отключает автодобор OH-MY-OPENCODE, иначе CONTINUATION найдёт любую pending-задачу и продолжит сессию без твоего ведома.
- **Коммит = немедленный push staging.** Без вопроса. Без ожидания. Staging — не прод, approval-гейта нет.
- **QA на стейджинге** (`v881545.hosted-by-vdsina.com`), не на локалхосте — доступ с телефона, не зависит от запущенного dev-сервера
- Еженедельный аудит: git-статистика + librarian (новые фичи OMO, модели, скиллы)
- Коммит `c1aa545` — все изменения воркфлоу

### Рекомендации по процессу (анализ сессии)

> Сессия: 2026-07-08. Характер: чистый воркфлоу (документация + инфраструктура), 0 строк production-кода.

| Метрика        | Значение                                   |
| -------------- | ------------------------------------------ |
| Коммитов       | 1 (c1aa545)                                |
| fix:feat       | N/A (нет production-изменений)             |
| Гейты пройдены | Lefthook (type-check + lint), vitest 59/59 |
| Пропущено      | Ничего                                     |

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

### Блок P + D7 + E0 (сессия 2026-07-08, часть 4 — финал)

#### D7+D7a — Draggable Backlog/Todo разделитель

- ✅ DraggableSeparator компонент (useDraggable + DragOverlay)
- ✅ Разделитель в tasks/page.tsx: перетаскивание меняет статусы задач массово
- ✅ bulkUpdateTaskStatuses action с previous_status save/restore
- ✅ Миграция 00013: previous_status TEXT на tasks
- ✅ D7a: updateTask сохраняет/восстанавливает previous_status

#### E0 — Быстродействие дашборда

- ✅ RPC get_dashboard_data(p_user_id) — 1 запрос вместо 4
- ✅ Plans: COUNT+FILTER агрегат вместо N+1 fetch всех plan_items
- ✅ Achievements: SQL-фильтр user_id вместо JS post-filter
- ✅ 2 новых индекса: idx_plans_user_created_at, idx_tasks_user_sort_order_created
- ✅ Миграция 00014

#### Блок P — Тестовое покрытие

- ✅ P0: setupFiles (ранее)
- ✅ P1: gamification-engine.test.ts — 63 теста (28 pure + 35 async)
- ✅ P2: tasks-actions.test.ts — 35 тестов (createTask, updateTask, deleteTask, reorderTasks, getTasks)
- ✅ P3: plans-actions.test.ts — 36 тестов
- ✅ P4: conversions-actions.test.ts — 30 тестов
- ✅ P5: kanban-columns-actions.test.ts — 37 тестов
- ✅ P6: wellbeing-actions.test.ts — 24 теста
- ✅ P7: useAuth.test.ts — 10 тестов
- ✅ Итого: 280 тестов в 10 файлах

#### Важные решения

- Ручное тестирование отложено — создан тест-план (`.omo/plans/manual-qa-testplan.md`)
- Груминг оставшихся блоков (F-Z) — на следующую сессию
- 7 коммитов за сессию, 0 откатов, fix:feat = 0:7 (только feat + test + refactor)

#### Рекомендации по процессу (анализ сессии)

> Сессия: 2026-07-08, часть 4. Характер: фичи (D7, E0) + тесты (P1-P7).

| Метрика               | Значение                                                                |
| --------------------- | ----------------------------------------------------------------------- |
| Коммитов              | 7 (за всю сессию)                                                       |
| fix:feat              | 0:7 — идеально                                                          |
| Гейты пройдены        | Lefthook (type-check + lint) × 7, vitest 280/280                        |
| Агентов задействовано | oracle, explore × 8, deep × 12, quick × 4, visual-engineering × 2, plan |
| Пропущено             | Ручное тестирование (отложено), /review-work (только на марафоне)       |

**Рекомендация на следующую сессию:**

1. Сначала — ручное тестирование по тест-плану (P0: D7 + Auth)
2. Если баги — фиксы
3. Груминг: приоритезация блоков F-Z, что реально нужно в MVP
4. Миграции 0006-0014 применить на стейджинг (`supabase db push`)

## Миграции

| #    | Название                             | Staging | Prod                  |
| ---- | ------------------------------------ | ------- | --------------------- |
| 0002 | RPC + ачивки                         | ✅      | ✅                    |
| 0003 | type колонка ideas                   | ✅      | ✅                    |
| 0004 | kanban_columns                       | ✅      | ✅                    |
| 0005 | fix tasks_completed                  | ✅      | ✅                    |
| 0006 | backlog_status                       | ✅      | ⏳ (merge 2026-07-12) |
| 0007 | wellbeing_entries                    | ✅      | ⏳ (merge 2026-07-12) |
| 0008 | focus_tasks                          | ✅      | ⏳ (merge 2026-07-12) |
| 0009 | mood_score_0_100                     | ✅      | ⏳ (merge 2026-07-12) |
| 0010 | normalize_task_ordering              | ✅      | ⏳ (merge 2026-07-12) |
| 0011 | telegram_chats_rls                   | ✅      | ⏳ (merge 2026-07-12) |
| 0012 | with_check_rls                       | ✅      | ⏳ (merge 2026-07-12) |
| 0013 | add_previous_status                  | ✅      | ⏳ (merge 2026-07-12) |
| 0014 | get_dashboard_data_rpc               | ✅      | ⏳ (merge 2026-07-12) |
| 0015 | time_estimation (K1) + missed status | ⬜      | ⬜                    |

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
