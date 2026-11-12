# ЗаписьПро

**ЗаписьПро** — веб-приложение для онлайн-записи клиентов к специалистам организаций малого бизнеса.

Платформа позволяет клиентам находить организации, выбирать услуги и записываться на удобное время. Администраторы могут управлять услугами, расписанием специалистов и бронированиями.

## Технологический стек

**Frontend:**

- React
- TypeScript

**Backend:**

- Python
- FastAPI
- MySQL

**Инфраструктура:**

- Git и GitHub
- Docker и Docker Compose

## Локальный запуск

### Frontend

Требуется установленный Node.js и npm.

```bash
cd frontend
npm install
npm run dev
```

Адрес приложения: http://localhost:5173

### Backend

Требуется установленный Python.

Перейдите в папку backend:

```bash
cd backend
```

Создайте виртуальное окружение:

```bash
python -m venv .venv
```

Активируйте окружение на Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

Установите зависимости:

```bash
python -m pip install -r requirements.txt
```

При первой настройке скопируйте `backend/.env.example` в `backend/.env`
и укажите данные подключения к своей базе MySQL. Файл `.env` исключён из Git.
Для `JWT_SECRET_KEY` сгенерируйте собственный секрет командой
`python -c "import secrets; print(secrets.token_urlsafe(32))"`
и запишите результат в `.env`. По умолчанию токен действует 30 минут
(`ACCESS_TOKEN_EXPIRE_MINUTES=30`).
Из папки `backend` примените миграции:

```bash
python -m alembic upgrade head
```

Начальная миграция создаёт таблицы `users`, `roles` и добавляет роли
`client` (клиент) и `admin` (администратор).

Запустите сервер:

```bash
python -m uvicorn app.main:app --reload
```

Адрес API: http://localhost:8000

Документация Swagger: http://localhost:8000/docs

Регистрация клиента: `POST /api/auth/register`. Пример JSON-запроса:

```json
{
  "email": "client@example.com",
  "password": "ExamplePassword123!"
}
```

Успешный ответ: `201 Created`, повторный email: `409 Conflict`,
некорректные данные: `422 Unprocessable Entity`.
Регистрация создаёт клиента; пароль и его хеш в ответ не включаются.

Вход: `POST /api/auth/login` с JSON-полями `email` и `password`.
Успешный ответ `200 OK` содержит `access_token`, `token_type: "bearer"`
и `expires_in` (срок действия в секундах). Неверный email или пароль
возвращает `401 Unauthorized`.

Текущий пользователь: `GET /api/auth/me` с заголовком
`Authorization: Bearer <access_token>`. Отсутствующий, недействительный
или просроченный токен возвращает `401 Unauthorized`.
Для проверки в Swagger выполните вход, скопируйте `access_token`, нажмите
**Authorize** и вставьте только токен. Затем выполните `GET /api/auth/me`.

### Организации

Создавать и редактировать организации может только пользователь с ролью
`admin`. Токен передаётся в заголовке `Authorization: Bearer <access_token>`.

- `POST /api/organizations` — создать организацию;
- `GET /api/organizations/{id}` — получить организацию (доступно без авторизации);
- `PATCH /api/organizations/{id}` — изменить переданные поля.

Пример создания:

```json
{
  "name": "Студия красоты «Лайм»",
  "description": "Уютная студия красоты",
  "address": "Томск, ул. Тверская, 12",
  "city": "Томск",
  "phone": "+7 999 000-00-00"
}
```

Обязательные поля — `name`, `address`, `city`; `description` и `phone`
необязательны. Пустые `name`/`address`/`city` и неизвестные поля отклоняются
с `422`. Без токена API отвечает `401`, клиенту без роли `admin` — `403`,
для несуществующей организации — `404`.

В `PATCH` можно очистить необязательные поля, передав `null`
(`{"description": null, "phone": null}`). Явный `null` в `name`, `address`
или `city` возвращает `422`.

**Примечание:** Docker будет настроен на следующих этапах разработки.

## Команда

| Разработчик     | Зона ответственности                                         |
| --------------- | ------------------------------------------------------------ |
| Настя Белякова  | Frontend — интерфейсы клиента и администратора               |
| Саша Сидоренко  | Frontend — авторизация и регистрация                         |
| Данил Тимошенко | Backend — организации, услуги, специалисты и цены            |
| Денис Лазинский | Backend — авторизация, бронирования, расписание и статистика |

## Статус проекта

Проект находится в разработке.
