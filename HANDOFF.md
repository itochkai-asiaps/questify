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
| D — Kanban-апгрейд | ✅ D1-D5 done (D2 инлайн-создание, D3 Backlog, D5 разделитель) |
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

### Блок D — Kanban (добивка)
- ✅ D2: инлайн-создание в первой колонке (Enter → создано, Loader2)
- ✅ D3: Backlog — статус `backlog`, виртуальная колонка с тогглом, D&D в/из backlog
- ✅ D5: разделитель «Backlog / Todo» в Tasks

### Блок E — Дашборд-центр
- ✅ E2: быстрые действия (+Task/+Idea/+Plan с мини-диалогом)
- ✅ E3: HP-бар сердце — курсорный трекинг, 20 зон по 5%, градиент жёлтый→красный, без диалогов, безлимитные записи (≤48/день), шкала 0-100, заметка после клика (таймер паузится при фокусе)
- ✅ E3: график настроения — смайлики под днями, avg /100, тренд ↑↓→
- ✅ E4: фокус-задача — комбо-сортировка шортлиста (P1 сегодня→P1 без→P2 сегодня→...), `/focus` с таймером 15/25/45/60 мин

### Бэкапы
- ✅ AWS CLI v2 (совместимость с ubuntu 24.04)
- ✅ Убран AWS S3 (не настроен), только Yandex Object Storage
- ✅ Защита от каскадной очистки: < 7 prod / < 2 staging файлов → skip
- ✅ Еженедельный бэкап staging БД

### Багфиксы
- ✅ Ideas: кнопки действий и теги поменяны местами
- ✅ Kanban: TouchSensor отключён на мобилке → Z6
- ✅ Mood chart: Card overflow-visible, SVG-кружки убраны
- ✅ Backup CI: починена установка AWS CLI

### Роадмап
- ✅ Блок N (Комментарии N1-N4)
- ✅ Блок Z: Z3-Z6 добавлены

### Важные решения
- Дневник: безлимитные записи (48/день), шкала 0-100, HP-бар без диалогов
- Фокус: отдельная страница `/focus`, MVP без записи сессий
- Kanban mobile D&D: отключён до переработки
- Правило: 3 фейла с визуальным багом → предлагать DevTools, не гадать
- HANDOFF.md в корне репо (не на десктопе), коммитится в git

## Миграции

| # | Название | Staging | Prod |
|---|---|---|---|
| 0002 | RPC + ачивки | ✅ | ✅ |
| 0003 | type колонка ideas | ✅ | ✅ |
| 0004 | kanban_columns | ✅ | ✅ |
| 0005 | fix tasks_completed | ✅ | ✅ |
| 0006 | backlog_status | ⏳ | ⬜ |
| 0007 | wellbeing_entries | ⏳ | ⬜ |
| 0008 | focus_tasks | ⏳ | ⬜ |
| 0009 | mood_score_0_100 | ⏳ | ⬜ |

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
