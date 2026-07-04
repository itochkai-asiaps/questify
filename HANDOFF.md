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
| C — Связать сущности | 🔄 C0 done, C1-C3 pending |
| D — Kanban-апгрейд | ⬜ |
| E — Дашборд-центр | ⬜ |
| F — Крупные фичи | ⬜ |
| G — Инвайт-система | ⬜ |
| H — Инфраструктура | ⬜ |

## Тесты
- Unit: 59/59 ✅ (`npx vitest run`)
- E2E: 18/18 ✅ (`npx playwright test`)

## Текущие задачи
- 🔴 #1: GitHub PAT — создать токен, добавить в Secrets
- 🔴 #2: DeepSeek API-ключ — получить для OMA-агентов

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
