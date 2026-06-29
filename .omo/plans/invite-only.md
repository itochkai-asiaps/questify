# Фича: Регистрация только по приглашению (с формой запроса)

## Концепт
- Лендинг: кнопка «Request Access» → форма с email
- Запрос сохраняется в БД + уведомление админу в Telegram
- Админ на странице `/invites` видит запросы → в один клик генерирует инвайт
- Новый пользователь приходит по ссылке `/register?invite=TOKEN`
- Без токена регистрация недоступна

## Файлы и изменения

### 1. DB — таблицы `invite_requests` + `invites`
Файл: `supabase/migrations/XXXX_invites.sql`
```sql
-- Запросы на приглашение (от незарегистрированных)
CREATE TABLE invite_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ DEFAULT now()
);

-- Инвайт-токены (генерирует админ)
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  request_id UUID REFERENCES invite_requests(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

-- RLS
CREATE POLICY "Authenticated can read requests" ON invite_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert requests" ON invite_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Creator can manage invites" ON invites FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Anyone can read invite by token" ON invites FOR SELECT USING (true);

-- Indexes for rate limiting & lookup
CREATE INDEX idx_invite_requests_email ON invite_requests(email, status);
CREATE INDEX idx_invites_token ON invites(token);
```

### 2. Серверные экшены
Файл: `src/lib/actions/invites.ts`
- `requestInvite(email)` — сохраняет запрос (публичный), с защитой:
  - **Rate limit per email**: не более 5 pending-запросов от одного email за 24h
  - **Rate limit global**: не более 10 новых запросов в минуту (COUNT по `invite_requests` за последнюю минуту)
  - **Nginx rate limit**: `limit_req` zone на форме запроса — 5 r/s, burst 10 (на уровне VPS)
  - **Email format**: Zod-валидация
  - **Cooldown**: если лимит превышен → вернуть «Too many requests. Please wait 24h.»
- `getRequests()` — список запросов для админа
- `generateInvite(requestId)` — создаёт инвайт + меняет статус запроса на approved
- `validateInvite(token)` — проверяет токен
- `getInvites()` — список инвайтов админа

### 3. Лендинг — форма запроса
Файл: `src/app/page.tsx`
- Убрать «Get Started» / «Get Started Free»
- Добавить «Request Access» → открывает модалку/инлайн с полем email
- Сабмит: `requestInvite(email)` → показ сообщения «Request sent! We'll send you an invite link.»
- Оставить «Sign In» для существующих

### 4. Уведомление админу
Файл: `src/lib/actions/invites.ts` (внутри `requestInvite`)
- После сохранения запроса → отправить сообщение в Telegram боту админа
- Текст: «New invite request: user@email.com»
- Или: in-app уведомление на `/invites` (счётчик новых)

### 5. Страница управления инвайтами
Файл: `src/app/(app)/invites/page.tsx`
- Вкладка «Requests» — список запросов (email, дата, статус)
- Кнопка «Generate Invite» напротив каждого pending-запроса
- Вкладка «Invites» — сгенерированные инвайты (токен, статус, ссылка)
- Копирование ссылки в один клик
- Бейдж с количеством новых запросов в сайдбаре

### 6. Страница регистрации
Файл: `src/app/(auth)/register/page.tsx`
- Поле инвайт-кода (автозаполнение из `?invite=` в URL)
- Валидация токена перед показом формы регистрации
- Обычная регистрация (email + пароль)

### 7. Серверный экшен регистрации
Файл: `src/lib/actions/auth.ts`
- `signUp()`: принять `inviteToken` из formData
- Вызвать `validateInvite(token)` до регистрации
- После успешной регистрации: пометить инвайт использованным (`used_by`, `used_at`)

### 8. Middleware для защиты `/register`
Файл: `src/middleware.ts`
- Редирект с `/register` без `?invite=` → на лендинг с сообщением

---

_Приоритет: средний. Блок: новый. Не блокирует B/C/D._

**Защита от DDoS (три слоя):**
1. **Per-email**: 5 запросов / 24h с одного email
2. **Global**: 10 запросов / минуту всего (защита от скриптов с перебором email)
3. **Nginx**: `limit_req` на уровне reverse proxy (5 r/s, burst 10)
4. **Будущее**: Cloudflare Turnstile (бесплатный невидимый CAPTCHA) — если атаки продолжатся

## Фаза 2 — Управление из Telegram бота

Добавить в вебхук бота команду `/approve` — админ получает уведомление о запросе в Telegram и может сразу ответить командой, не заходя в веб-интерфейс.

### Поток:
1. Пользователь оставляет запрос на лендинге
2. Бот присылает админу: «New request: user@example.com — reply /approve <id>»
3. Админ отвечает: `/approve req_abc123`
4. Бот: генерирует инвайт, меняет статус запроса на approved
5. Бот отвечает админу готовой ссылкой: `questify.app/register?invite=abc123`
6. Админ пересылает ссылку пользователю

### Что добавить:
- `requestInvite()` → отправляет сообщение в Telegram админу с ID запроса
- Команда `/approve <request_id>` в `route.ts` — вызывает `generateInvite(requestId)`
- Связь: в `invite_requests` добавить поле `telegram_chat_id` (если пользователь привязан к боту, можно отправить ссылку напрямую ему)
