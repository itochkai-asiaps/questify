# Questify — проектные правила

## OVERVIEW

**Questify** — gamified task tracker. Next.js 16 app с Supabase-бэкендом.  
Геймификация: XP, уровни, ежедневные стрики, достижения.  
Kanban-доска, Eisenhower Matrix, планы с чеклистами.

**Статус**: 🔥 Активная разработка. Блок C (connect entities).  
**Репозиторий**: `github.com/itochkai-asiaps/questify`  
**Бранч разработки**: `staging`

## STACK

| Слой           | Технология                           | Версия                 |
| -------------- | ------------------------------------ | ---------------------- |
| Фреймворк      | Next.js (App Router)                 | 16.2.9                 |
| UI             | React + Tailwind CSS + shadcn/ui     | 19.2.4 / 4 / base-nova |
| Анимации       | Framer Motion                        | 12                     |
| Стейт          | Zustand                              | 5                      |
| Drag & Drop    | @dnd-kit                             | 6 / 10                 |
| Бэкенд         | Next.js Server Actions               | —                      |
| База данных    | Supabase (PostgreSQL)                | —                      |
| Аутентификация | Supabase Auth (email + Google OAuth) | —                      |
| Валидация      | Zod                                  | 4                      |
| Тесты          | Vitest (unit) + Playwright (e2e)     | 4 / 1.61               |
| Линтер         | ESLint 9 + next-config               | —                      |
| Деплой         | VPS (nginx + pm2 + Let's Encrypt)    | —                      |

## COMMANDS

```bash
# Разработка
npm run dev              # Запуск dev-сервера (Turbopack)

# Тестирование
npm test                 # Vitest unit-тесты (48/48 ✅)
npm run test:e2e         # Playwright e2e-тесты (18/18 ✅)
npm run test:watch       # Vitest в watch-режиме

# Качество кода
npm run lint             # ESLint
npm run type-check       # TypeScript проверка типов (tsc --noEmit)

# Сборка
npm run build            # Production сборка

# База данных
npm run db:push          # Применить миграции (локально)
npm run db:push:staging  # Применить миграции (staging Supabase)
npm run db:push:prod     # Применить миграции (production Supabase)
```

## STRUCTURE

```
questify/
├── src/
│   ├── app/              # Next.js App Router (страницы, layout, Server Actions)
│   ├── components/       # React-компоненты (ui/, features/)
│   ├── hooks/            # Кастомные хуки
│   ├── lib/              # Утилиты: supabase client, levels.ts, utils
│   ├── types/            # TypeScript-типы
│   └── proxy.ts          # API-прокси
├── supabase/
│   └── migrations/       # SQL-миграции (3 миграции)
├── tests/                # Playwright e2e-тесты
├── .github/workflows/    # CI/CD: ci.yml, deploy-staging.yml, deploy.yml
├── deploy/               # Скрипты деплоя на VPS
├── .omo/                 # Рабочие артефакты: планы, драфты, codegraph
├── public/               # Статика: favicon, PWA-манифест
└── scripts/              # Вспомогательные скрипты
```

## CONVENTIONS

### Next.js

- **Только App Router**. Никаких `pages/`. Все роуты — через `src/app/`.
- **Server Actions** для мутаций. Никаких API Routes (`route.ts`) без крайней необходимости.
- **Серверные компоненты по умолчанию**. `'use client'` — только когда реально нужен браузерный API.
- **Loading + Error states** всегда. Каждая страница должна обрабатывать загрузку и ошибки.

### Supabase

- **RLS на всех таблицах**. Без исключений. Миграции через Supabase CLI.
- **Server-side auth**. Supabase client создаётся через `@supabase/ssr`, не через клиентский SDK.
- **Миграции атомарные**. Одна миграция = одно изменение схемы. Не смешивать.
- **Миграции идемпотентные** — должны проходить без ошибок при повторном запуске:
  - Таблицы: `CREATE TABLE IF NOT EXISTS`
  - Индексы: `CREATE INDEX IF NOT EXISTS`
  - Политики RLS: `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN END $$`
  - Триггеры: `DROP TRIGGER IF EXISTS ...; CREATE TRIGGER ...`
  - Функции: `CREATE OR REPLACE FUNCTION`

### Стили

- **Tailwind utility-first**. Никаких CSS modules, никаких inline styles кроме динамических значений.
- **shadcn/ui компоненты** — основа UI. Кастомизация через CSS-переменные, не через пропсы.
- **Мобильные first**. Все компоненты должны работать на mobile (max-width: 768px).

### Типы

- **Zod на границах**. Все Server Actions парсят вход через Zod-схему.
- **Строгие типы**. `any`, `as`, `@ts-ignore` — запрещены глобальным AGENTS.md.
- **Типы в `src/types/`**. Общие интерфейсы — там, а не в компонентах.

### Git

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`.
- Ветки: `staging` → PR → `master`. Feature-бранчи от `staging`.
- **Рабочий процесс**: `.omo/` → план → реализация → тесты → коммит — см. workflow в `.omo/`.
- **⛔ КОММИТ = НЕМЕДЛЕННЫЙ ПУШ В STAGING. Без вопроса, без подтверждения, без ожидания.** Локальные коммиты без пуша недопустимы. CI/CD деплоит staging автоматически при push — это не production, approval-гейта нет. Спрашивать «запушить?» после коммита — ошибка агента.
- **После каждого пуша — сообщать версию для проверки.** Формат: `S v{package.json version}-b{GitHub run number}`. Версия отображается в левом нижнем углу на стейджинге (клик — копирует). Если run ещё не завершён — указать хеш коммита и ссылку на Actions.

### HANDOFF

- **Файл**: `HANDOFF.md` в корне репо. Не писать на рабочий стол, не создавать `HANDOFF.txt` в других местах.
- **Содержание**: статус блоков, таблица миграций (с пометками Staging/Prod), последние изменения с датой, важные решения.
- **Анализ стиля работы**: при каждом обновлении HANDOFF агент анализирует паттерны сессии (fix:feat ratio, каскады, длительность, покрытие тестами) и добавляет блок «Рекомендации по процессу» — конкретные предложения по оптимизации, аналогично блоку «Режим работы» в роадмапе.
- **Коммитить**: HANDOFF.md — часть репо, коммитится и пушится вместе с остальными изменениями.
- **Обновлять**: после каждой значимой сессии (завершённый блок, новые миграции, важные архитектурные решения).

## AGENT WORKFLOW

Агенты OMO — не вспомогательные, а **основные** исполнители. Sisyphus оркестрирует, агенты делают работу.

### Каждую сессию — `ulw`

Всегда начинай новую сессию с ключевого слова `ulw` в первом сообщении. Это включает ultrawork-режим на всю сессию: параллельные агенты, глубокое исследование, авто-продолжение. Повторно в течение сессии не требуется.

```
"ulw Делаем блок N: ..."
```

### Документация — всегда Context7

**Всегда** используй Context7 для получения актуальной документации по стеку проекта:

- **Supabase** (`/supabase/supabase`) — SSR, RLS, миграции, realtime
- **Next.js** (`/vercel/next.js`) — App Router, Server Actions, middleware
- **Tailwind CSS** + **shadcn/ui** — utility-классы, компоненты
- **Framer Motion** — анимации

Не полагайся на тренировочные данные — документация могла измениться с момента тренировки модели.

### До кода (планирование)

| Когда                                                  | Агент                        | Что делает                                                                       |
| ------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------------------- |
| Любая фича (2+ шагов, неясные требования)              | `metis`                      | Pre-planning анализ: скрытые намерения, ambiguity, точки отказа AI               |
| Сложная фича (2+ модуля, новый UI, архитектурный риск) | `hyperplan`                  | 5 adversarial агентов атакуют план → список проблем ДО написания кода            |
| План готов, нужна формальная верификация               | `momus`                      | Безжалостная проверка плана на полноту, проверяемость, ясность                   |
| План утверждён, нужно исполнение                       | `prometheus` + `/start-work` | Prometheus строит исполняемый план → `/start-work` передаёт Atlas для исполнения |

**Полная цепочка для сложной фичи:**

```
metis (gap-анализ) → hyperplan (адверсариальная критика) → momus (формальная верификация) → prometheus (исполняемый план) → /start-work (Atlas исполняет)
```

### Во время реализации

| Тип задачи                       | Агент                          | Правило                                                         |
| -------------------------------- | ------------------------------ | --------------------------------------------------------------- |
| **Вёрстка, стили, анимация, UI** | `visual-engineering` (GPT-4.1) | **Всегда.** Не пиши JSX+Tailwind вручную — делегируй            |
| **Сложная логика, алгоритмы**    | `ultrabrain` (DeepSeek R1)     | Задачи с нетривиальной логикой                                  |
| **Исследование, поиск по коду**  | `explore` / `librarian`        | Параллельно, в фоне                                             |
| **Архитектурные решения**        | `oracle`                       | После 2+ неудачных попыток или перед крупным рефакторингом      |
| **Длинная многошаговая задача**  | `/ralph-loop`                  | Агент сам продолжает до завершения, не ждёт ручного перезапуска |

### После кода (верификация) — MANDATORY GATES

| Когда                                        | Инструмент                  | Что делает                                                                                                           |
| -------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **После любого визуального изменения**       | `/visual-qa`                | Скриншот → два oracle pass (design system + visual fidelity) → вердикт pass/fail                                     |
| **После каждого блока (перед /review-work)** | `/remove-ai-slops`          | Чистка AI-сгенерированных паттернов (10 категорий): избыточная сложность, oversized модули, performance equivalences |
| **После закрытия блока**                     | `/review-work`              | 5 параллельных проверок: архитектура, код, безопасность, QA, контекст                                                |
| **Перед каждым коммитом**                    | Lefthook (автомат)          | `lint` + `type-check` параллельно. Ошибка → коммит блокирован                                                        |
| **В CI (на каждый PR/push)**                 | Playwright visual snapshots | `toHaveScreenshot()` для дашборда, mood chart, HP-бара. Ловит визуальные регрессии                                   |

### Правило трёх ошибок (3-fix-stop)

**3 fix-коммита подряд на одну задачу → СТОП.**

- Не коммитить четвёртый fix
- Запустить `/debugging` — hypothesis-driven анализ (≥3 гипотезы → параллельная проверка → root cause)
- Root cause analysis: почему баг не был пойман раньше?
- Если визуальный баг → был ли запущен `/visual-qa`?
- Если логический баг → была ли полная цепочка `metis → hyperplan → momus`?
- Результат анализа → в коммит-сообщение или PR

### Правило пяти таймаутов (5-retry-stop)

**Внешний агент не отвечает 5 раз подряд → СТОП. Не продолжать.**

- Не ретраить бесконечно
- Сообщить пользователю: какой агент, на каком шаге, что произошло
- Принять паузу — пользователь решит, перезапускать или менять подход
- Перед паузой: `/stop-continuation`

### Дизайн-ревью (после визуальных изменений) — MANDATORY

**Правило**: при любой работе со страницей (баг, фича, рефакторинг) — прогнать затронутые экраны через `look_at` (dark+light, 2 скриншота за вызов). Не более 10 экранов за сессию.

**Инструмент**: `look_at` с `file_paths` (не `multimodal-looker` — он не видит файлы по пути). Работает безотказно: 98% success rate, без rate limit, ~15s на пару скриншотов.

```
look_at(
  file_paths=["screenshots/.../app-dark-N-page.png", "screenshots/.../app-light-N-page.png"],
  goal="Design audit: severity (critical/high/medium/low), category, location, theme, expected vs actual, fix suggestion. Only REAL visible issues."
)
```

**Полный аудит всей дизайн-системы** — только разово (при инициализации или после крупного редизайна). Не на каждой сессии — накладно по времени (~15 мин на 50+ батчей).

**В HANDOFF**: если дизайн-ревью затронутых страниц не завершён — явная задача на следующую сессию с пометкой `🔄 design-review: <page names>`. Не терять.

### Порядок для типовых сценариев

**Визуальная фича:**

```
metis → hyperplan → momus → prometheus → visual-engineering (вёрстка) → /visual-qa → /remove-ai-slops → Lefthook → commit → CI snapshots
```

**Логическая фича:**

```
metis → hyperplan → momus → prometheus → ultrabrain/deep (реализация) → /remove-ai-slops → Lefthook → commit → CI tests
```

**Закрытие блока:**

```
/remove-ai-slops → /review-work → fix findings → Lefthook → commit → push
```

**Длинная многошаговая задача (автономно):**

```
/ralph-loop "описание задачи" → (агент работает автономно) → /remove-ai-slops → /review-work → Lefthook → commit → push
```

### Цветовая система

- **Стейджинг**: amber-акценты (`#ea580c` фон, `#eab308` хедер)
- **Прод**: indigo-акценты (`#6366f1`)
- **Тёмная тема**: через `next-themes`, class-based (`dark:` префикс)
- **Проблемы/ошибки**: оранжевый в светлой (`orange-500`), фиолетовый в тёмной (`purple-400`)

### Требования к UI

- Контрастность текста ≥ 4.5:1 (WCAG AA)
- Все интерактивные элементы: hover, focus, active, disabled
- Тёмная тема: проверять ВСЕ компоненты в обоих режимах

## ARTIFACTS (значимые файлы — только в проекте)

- **Скриншоты**: `screenshots/` в корне проекта. Все скриншоты (дизайн-аудит, визуальные тесты, QA) сохраняются сюда, а не в `C:\Users\user\screenshots` или `~/Desktop`.
- **Планы и спецификации**: `.omo/` (уже настроено).
- **Временные файлы сессии**: `.omo/tmp/` — ультраворк-блокноты, черновики.
- **Никаких файлов на рабочем столе**. Никаких артефактов вне репо. Проект должен быть самодостаточным при клонировании на новую машину.

### Структура screenshots/

```
screenshots/
├── skeletons/          # Скелетоны (сразу после загрузки, без данных)
│   ├── dark/           # Тёмная тема, desktop
│   ├── light/          # Светлая тема, desktop
│   ├── mobile-dark/    # Тёмная тема, mobile
│   └── mobile-light/   # Светлая тема, mobile
├── loaded/             # С данными (после полной загрузки)
│   ├── dark/
│   ├── light/
│   ├── mobile-dark/
│   └── mobile-light/
└── visual-qa/          # Скриншоты для /visual-qa (baseline + actual)
```

## ANTI-PATTERNS (что НЕЛЬЗЯ в этом проекте)

- ❌ **Pages Router** (`pages/` директория). Только App Router.
- ❌ **API Routes** (`route.ts`). Используй Server Actions.
- ❌ **Prisma ORM**. Используем нативный Supabase JS-клиент.
- ❌ **CSS Modules** или styled-components. Только Tailwind utility-классы.
- ❌ **Client-side Supabase** для запросов. Только серверный `createClient()`.
- ❌ **`useEffect` для data fetching**. Данные загружаются в серверных компонентах.
- ❌ **`any` / `as` / `@ts-ignore`**. Нарушает правило #6 глобального AGENTS.md.
- ❌ **Прямые манипуляции с DOM**. Используй React-рефы или Framer Motion.

## VALIDATION RULES (agents must check before every commit)

### Pre-commit checklist (automated via Lefthook, sequential):

1. **Prettier** — `npx prettier --check {staged_files}` (formatting)
2. **Gitleaks** — `gitleaks protect --staged` (secrets scan)
3. **ESLint** — `npm run lint` (zero errors)
4. **TypeScript** — `npm run type-check` (tsc --noEmit, zero errors)

### Agent validation rules:

- ✅ **Env vars**: Never commit `process.env.X!` without a fallback or validation. All new env vars must be added to `src/lib/env.ts`.
- ✅ **Dead code**: Run `npx knip` before closing a block. Remove or document unused exports.
- ✅ **Secrets**: Never hardcode tokens, keys, or passwords. Use `.env` files + Gitleaks check.
- ✅ **Bundle size**: Run `ANALYZE=true npm run build` for any change that adds a dependency.
- ✅ **Type strictness**: No `any`, no `as`, no `@ts-ignore`, no `@ts-expect-error`.
- ✅ **Formatting**: Code must pass Prettier check. Run `npx prettier --write` on changed files.

## DEPLOYMENT

| Среда      | URL                            | Ветка     | Деплой                |
| ---------- | ------------------------------ | --------- | --------------------- |
| Staging    | `staging.questify.itochka.xyz` | `staging` | Автоматический (push) |
| Production | `questify.itochka.xyz`         | `master`  | Ручной (approval)     |

Инфраструктура: VPS → nginx reverse proxy → pm2 → Next.js. SSL через Let's Encrypt.  
CI/CD: GitHub Actions (`.github/workflows/`).
