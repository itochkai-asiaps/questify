# План автотестов Questify

## Текущее покрытие
- `tests/e2e/auth.spec.ts` — регистрация, логин, логаут (18 тестов, ✅ все pass)
- `tests/unit/gamification-levels.test.ts` — расчёт уровней, XP, множители (20 тестов, ✅ все pass)

---

## Блок 1 — Юнит-тесты (Vitest)

### 1.1 Геймификация
- [x] XP-расчёт: все приоритеты (P1=50, P2=30, P3=15, P4=5)
- [x] Уровни: граничные значения (0 XP → lvl 1, 100 → lvl 2, ...)
- [x] Множитель streak: x1.0 / x1.5 / x2.0
- [x] XP_REWARDS: planStep, planCompleted константы
- [ ] **NEW** `awardXp`: инкремент XP, level up, возврат { newXp, newLevel, leveledUp }
- [ ] **NEW** `completeTask`: расчёт XP с учётом streak-множителя, вызов update_streak
- [ ] **NEW** `checkAndAwardAchievements`: детект новых ачивок, пропуск уже разблокированных
- [ ] **NEW** `togglePlanItem`: XP за planStep (5), план полностью завершён → planCompleted (25) + increment_plans_completed

### 1.2 Серверные экшены
- [ ] `createTask` — валидация Zod
- [ ] `updateTask` — смена статуса на done → вызов completeTask (мок), не done → без вызова
- [ ] `togglePlanItem` — incomplete → complete → awardXp(planStep), все items done → awardXp(planCompleted)
- [ ] `createIdea`, `deleteIdea`, `getIdeas`
- [ ] `signIn`, `signUp`, `signOut`

### 1.3 Утилиты
- [ ] `groupTasksByStatus`: разбивка по 3 статусам, пустой массив
- [ ] `groupTasksByPriority`: разбивка по 4 приоритетам
- [ ] Zod-схемы: CreateTaskInputSchema, UpdateTaskInputSchema, etc.
- [ ] `avatarColor`: детерминированность, диапазон

---

## Блок 2 — E2E тесты (Playwright)

### 2.1 Аутентификация ✅ (18 тестов, pass)
- [x] Регистрация, логин, логаут
- [x] Защищённые маршруты
- [x] Публичные маршруты
- [x] Валидация форм

### 2.2 Задачи (Tasks)
- [ ] Создание через форму (title + description + priority)
- [ ] **NEW** Быстрое создание: Enter → задача в списке, поле очищено
- [ ] **NEW** Быстрое создание: кнопка + → задача в списке
- [ ] **NEW** Быстрое создание: ошибка отображается локально
- [ ] Фильтрация: поиск, приоритет, статус, сброс
- [ ] Удаление задачи

### 2.3 Kanban
- [ ] Отображение задач по колонкам (Todo / In Progress / Done)
- [ ] Drag-and-drop: задача меняет статус
- [ ] Drag-and-drop: задача не дублируется при быстрых перетаскиваниях

### 2.4 Matrix (Eisenhower)
- [ ] Отображение задач по квадрантам (P1-P4)
- [ ] Drag-and-drop: задача меняет приоритет
- [ ] Кнопка Auto-distribute → показывает инфо (не пересинк)

### 2.5 Планы (Plans)
- [ ] Создание плана
- [ ] Добавление элемента плана
- [ ] Отметка элемента как выполненного → прогресс-бар обновляется
- [ ] **NEW** Завершение плана → XP начислен (проверить дашборд)

### 2.6 Идеи (Ideas)
- [ ] Быстрое создание (инлайн-поле + Enter)
- [ ] Быстрое создание (инлайн-поле + кнопка)
- [ ] Удаление идеи
- [ ] Отображение источника (Web / Telegram)

### 2.7 Профиль
- [ ] Отображение имени, статистики, ачивок
- [ ] Копирование ID: в буфере `/link <id>`
- [ ] **NEW** Переключение темы: system → light → dark → system (цикл)

### 2.8 Дашборд
- [ ] Отображение статистики (tasks, plans, XP, streak)
- [ ] **NEW** Отображение ачивок (после выполнения задач)
- [ ] **NEW** Сердце: анимация пульсации
- [ ] Редирект без авторизации

### 2.9 Telegram вебхук
- [ ] GET /api/telegram → 200 OK
- [ ] POST /api/telegram /start → ответ с инструкцией
- [ ] POST /api/telegram /link → upsert в telegram_chats
- [ ] POST /api/telegram текст → создание идеи через service_role

---

## Приоритеты (обновлено)

| Приоритет | Блоки | Почему |
|---|---|---|
| **P1** | 1.1 (new), 2.1 (done), 2.2, 2.8 | Геймификация + критический путь |
| **P2** | 2.3, 2.4, 1.3 | Kanban/Matrix + утилиты |
| **P3** | 2.5, 2.6, 2.7, 1.2 | Планы/Ideas/Профиль + экшены |
| **P4** | 2.9 | Бот |

---

**Что добавилось после Блоков A+B:**
- Unit: 4 теста геймификации (awardXp, completeTask, checkAndAwardAchievements, togglePlanItem XP)
- Unit: 2 теста экшенов (updateTask→done, togglePlanItem→XP)
- E2E: быстрые создания (tasks + ideas), темы, ачивки, план-complete XP
- E2E: сердце (анимация), Auto-distribute (инфо)

_Начинать с P1. По одному файлу на группу тестов._
