# Фича: Регистрация только по приглашению

## Концепт
- Существующий пользователь генерирует ссылку-приглашение
- Новый пользователь приходит по ссылке `/register?invite=TOKEN`
- Без токена регистрация недоступна
- Лендинг: убрать «Get Started», только «Sign In»

## Файлы и изменения

### 1. DB — новая таблица `invites`
Файл: `supabase/migrations/XXXX_invites.sql`
```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  used_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  max_uses INT DEFAULT 1
);

-- RLS: creator + admins can read/insert, anyone can read by token (for validation)
CREATE POLICY "Creators can manage invites" ON invites FOR ALL USING (created_by = auth.uid());
CREATE POLICY "Anyone can read invite by token" ON invites FOR SELECT USING (true);
```

### 2. Серверный экшен — генерация и валидация инвайтов
Файл: `src/lib/actions/invites.ts`
- `generateInvite()` — создаёт инвайт (только для авторизованных)
- `validateInvite(token)` — проверяет токен (не истёк, не использован)
- `getInvites()` — список инвайтов пользователя

### 3. Страница генерации инвайтов
Файл: `src/app/(app)/invites/page.tsx`
- Список сгенерированных инвайтов (токен, статус, кнопка копирования)
- Кнопка «Generate Invite Link»
- Ссылка формата `{origin}/register?invite={token}`

### 4. Изменение страницы регистрации
Файл: `src/app/(auth)/register/page.tsx`
- Поле ввода инвайт-кода (автозаполнение из query-параметра)
- Если код невалидный → ошибка
- Если валидный → обычная регистрация

### 5. Изменение серверного экшена регистрации
Файл: `src/lib/actions/auth.ts`
- В `signUp()`: принять `inviteToken` из formData
- Вызвать `validateInvite(token)` до `supabase.auth.signUp()`
- После успешной регистрации: пометить инвайт использованным

### 6. Изменение лендинга
Файл: `src/app/page.tsx`
- Убрать все кнопки «Get Started» / «Get Started Free» (строки 72, 114)
- Оставить только «Sign In» → `/login`
- Изменить текст: убрать «Get started in 30 seconds», заменить на инвайт-месседжинг

### 7. (Опционально) Middleware для защиты /register
Файл: `src/middleware.ts`
- Редирект с `/register` без query-параметра `invite`

---

_Приоритет: средний. Можно реализовать после Блока B (геймификация)._
