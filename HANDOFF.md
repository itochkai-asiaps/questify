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
| D — Kanban-апгрейд | ✅ D1-D5 done, ⬜ D6-D7 |
| E — Дашборд-центр | ✅ E1-E4 done, ⬜ E0 |
| F — Крупные фичи | ⬜ |
| G — Инвайт-система | ⬜ |
| H — Инфраструктура | ✅ done |
| I — На подумать | ⬜ |
| J — Геймификация 2.0 | ⬜ Boss-битвы, дерево навыков |
| K — Аналитика | ⬜ Heatmap, теги, оценка времени |
| L — Интеграции | ⬜ Telegram-создание, Google Calendar |
| M — AI (post-MVP) | ⬜ Декомпозиция, приоритизация, рефлексия |
| N — Комментарии | ⬜ |
| O — Тематические флоу | ⬜ Sci-Fi dev-flow, Fantasy, фидбек |
| Z — Неразвитые идеи | ⬜ Квесты, вебхуки, Pomodoro, S3 |

## Тесты
- Unit: 59/59 ✅ (`npx vitest run`)
- E2E: 18/18 ✅ (`npx playwright test`)

## Текущие задачи
- 🔴 #1: GitHub PAT — создать токен, добавить в Secrets
- 🔴 #2: DeepSeek API-ключ — получить для OMA-агентов
- 🟡 D6: Drag-to-reorder задач в списке и Kanban
- 🟡 D7: Draggable Backlog/Todo разделитель с сохранением previous_status
- 🟡 E0: Быстродействие дашборда (RPC get_dashboard_data, < 500ms)

## Последние изменения (сессия 2026-07-08)
- **D5 fix**: Backlog-разделитель перенесён под активные задачи, инлайн-создание над backlog-задачами
- **Роадмап**: добавлены блоки J (геймификация 2.0), K (аналитика), L (интеграции), M (AI), O (флоу), Z (неразвитые идеи)
- **AGENTS.md**: правило «после коммита — сразу git push origin staging»
- **Глобальный AGENTS.md**: то же правило для всех проектов

## Миграции (накатить через SQL Editor в Supabase)
- ⚠️ `00002_plans_completed_rpc.sql` — RPC + сид ачивок
- ⚠️ `00003_ideas_type.sql` — колонка type в ideas

## Планы и требования
- `.omo/plans/roadmap.md`
- `.omo/plans/tests.md`
- `.omo/plans/invite-only.md`
- `.omo/requirements/README.md`
- `.omo/requirements/block-c-connect-entities.md`

## Ключевые файлы
- `src/hooks/useAuth.ts` — lastUserId ref (не дёргает setUser при TOKEN_REFRESHED)
- `src/lib/actions/tasks.ts` — updateTask вызывает completeTask
- `src/lib/actions/plans.ts` — togglePlanItem вызывает awardXp
- `src/lib/actions/ideas.ts` — createIdea (type), toggleIdeaType
- `src/lib/actions/seed.ts` — seedRoadmap (31 задача из роадмапа)
- `src/lib/gamification/engine.ts` — awardXp, completeTask, achievements
- `src/lib/gamification/levels.ts` — XP_REWARDS, уровни, xpForPriority
- `src/app/(app)/ideas/page.tsx` — problem cards (orange/purple)
- `src/app/(app)/profile/page.tsx` — Settings: тема + Seed кнопка + версия
- `src/app/layout.tsx` — ThemeProvider (defaultTheme="system")
- `src/components/staging-banner.tsx` — версия в углу (click-to-copy)
- `HANDOFF.md` — этот файл в корне проекта
