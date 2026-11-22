# ЗаписьПро

**ЗаписьПро (RecordingPRO)** — учебный сервис онлайн-записи и управления клиентами
малого бизнеса. Клиенты находят организации, выбирают услуги и время приёма;
администраторы управляют услугами, специалистами и расписанием.

Проект находится в разработке. Docker и Docker Compose планируются на следующих этапах.

## Технологии

- Frontend: React, TypeScript, Vite.
- Backend: Python, FastAPI, SQLAlchemy, Alembic, MySQL.
- Совместная работа: Git и GitHub.

## Локальный запуск

Требуются Python, Node.js с npm и запущенный MySQL. Команды ниже предназначены
для PowerShell и выполняются из корня репозитория. Backend и frontend запускаются
в отдельных терминалах.

### Backend

При первой настройке создайте окружение и установите зависимости:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Если `backend/.env` ещё не создан, скопируйте в него `backend/.env.example`.
В локальном `.env` заполните:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` — подключение к MySQL.
  Базу и пользователя нужно создать заранее; пользователю нужны права на данные
  и изменение схемы этой базы для миграций.
- `JWT_SECRET_KEY` — собственный случайный секрет длиной не менее 32 символов.

Сгенерировать секрет можно из папки `backend`:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
```

`ACCESS_TOKEN_EXPIRE_MINUTES` задаёт срок действия токена входа (по умолчанию
30 минут), `PASSWORD_RESET_EXPIRE_MINUTES` — кода восстановления (15 минут).
Реальные пароли и секреты храните только в локальном `.env`; он исключён из Git.

Из папки `backend` примените миграции и запустите сервер:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Backend: [http://localhost:8000](http://localhost:8000).
После получения новых миграций повторяйте `alembic upgrade head` перед запуском.
Для расчёта свободного времени часовой пояс backend должен совпадать с часовым
поясом организации.

### Почта для восстановления пароля

Для Gmail включите двухэтапную аутентификацию и создайте
[пароль приложения Google](https://support.google.com/accounts/answer/185833?hl=ru).
В `backend/.env` укажите `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
`SMTP_USER` — адрес почты, `SMTP_PASSWORD` — пароль приложения без пробелов,
`SMTP_FROM` — тот же адрес, что в `SMTP_USER`.

Поддерживаются порт `465` с TLS и порт `587` с STARTTLS. Без настроенного SMTP
восстановление пароля недоступно. После изменения `.env` перезапустите backend.

### Frontend

В отдельном терминале из корня репозитория:

```powershell
cd frontend
npm install
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173).
По умолчанию Vite перенаправляет запросы к backend на `http://localhost:8000`.
Для другого адреса создайте `frontend/.env` по образцу `frontend/.env.example`
и измените `VITE_API_BASE_URL`. После изменения перезапустите frontend.

## Команда

| Разработчик | Зона ответственности |
| --- | --- |
| Настя Белякова | Frontend — интерфейсы клиента и администратора |
| Саша Сидоренко | Frontend — авторизация и регистрация |
| Данил Тимошенко | Backend — организации, услуги, специалисты и цены |
| Денис Лазинский | Backend — авторизация, бронирования, расписание и статистика |
