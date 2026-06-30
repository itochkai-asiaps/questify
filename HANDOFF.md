# HANDOFF CONTEXT — Questify MVP

## Сервера
| | Staging | Production |
|---|---|---|
| IP | 195.63.160.68 | 87.199.197.190 |
| URL | v881545.hosted-by-vdsina.com | v869487.hosted-by-vdsina.com |
| Папка | /opt/questify-staging | /opt/questify |
| PM2 | questify-staging | questify |
| Supabase | irmihumjlbckwygtnvfi | zkifblsbwfllfmlndxjt |
| Бот | @questify_stage_bot | @questify_test_2_bot |

SSH: `C:\Users\user\.ssh\questify-deploy`

## Ветки
- `staging` — разработка
- `master` — прод (мерж только по команде «мержи в прод»)

## Деплой
- Пуш в staging → GitHub Actions → деплой на VPS2
- Пуш в master → GitHub Actions → деплой на VPS1 (approval gate)
- Версия: `v` + git short SHA (стейджинг — всегда в углу, прод — в профиле)

## Планы
- `.omo/plans/roadmap.md` — дорожная карта (A-H)
- `.omo/plans/tests.md` — план тестов
- `.omo/plans/invite-only.md` — инвайт-система
- `.omo/requirements/` — база требований

## Статус блоков
| Блок | Статус |
|---|---|
| A — Быстрые фиксы | ✅ |
| B — Геймификация | ✅ |
| C — Связать сущности | 🔄 C0 done, C1-C3 pending |
| D — Kanban-апгрейд | ⬜ |
| E — Дашборд-центр | ⬜ |
| F — Крупные фичи | ⬜ |
| G — Инвайт-система | ⬜ |
| H — Инфраструктура | ⬜ |

## Тесты
- Unit: 59/59 ✅
- E2E: 18/18 ✅

## Задачи (pending)
- 🔴 #1: **GitHub PAT** — создать Personal Access Token для CI/CD, добавить в Secrets
- 🔴 #2: **DeepSeek API-ключ** — получить ключ, настроить для агентов OMA

## Ключевые файлы
- `src/hooks/useAuth.ts` — auth с защитой от TOKEN_REFRESHED
- `src/lib/actions/tasks.ts` — createTask/updateTask (completeTask при done)
- `src/lib/actions/plans.ts` — togglePlanItem (awardXp)
- `src/lib/actions/ideas.ts` — createIdea (type: idea/problem), toggleIdeaType
- `src/lib/gamification/engine.ts` — awardXp, completeTask, achievements
- `src/app/(app)/ideas/page.tsx` — problem cards (orange/purple)
- `src/app/layout.tsx` — ThemeProvider (defaultTheme="system")
- `src/components/staging-banner.tsx` — версия в углу на стейджинге
- `.github/workflows/deploy-staging.yml` — авто-деплой + версия
- `.github/workflows/deploy.yml` — прод деплой + approval gate
- `supabase/migrations/00003_ideas_type.sql` — type колонка (не накачена)

## Миграции (нужно накатить)
- `00002` — RPC increment_plans_completed + сид ачивок
- `00003` — type колонка в ideas
