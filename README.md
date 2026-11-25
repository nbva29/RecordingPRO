# ЗаписьПро

**ЗаписьПро (RecordingPRO)** - учебный сервис онлайн-записи и управления клиентами
малого бизнеса. Клиенты находят организации, выбирают услуги и время приёма;
администраторы управляют услугами, специалистами и расписанием.

Frontend, backend и MySQL можно запускать через Docker Compose.

## Технологии

- Frontend: React, TypeScript, Vite.
- Backend: Python, FastAPI, SQLAlchemy, Alembic, MySQL.
- Контейнеризация и веб-сервер: Docker, Docker Compose, Nginx.
- Совместная работа: Git и GitHub.

## Запуск приложения

### Запуск через Docker

Требуются запущенный Docker Desktop с Linux-контейнерами и Docker Compose.
Все команды в этом разделе выполняются в PowerShell из корня проекта.

При первом запуске создайте корневой `.env` из примера. Команда не перезапишет
существующий файл:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Откройте корневой `.env` и заполните:

- `DB_PASSWORD` - пароль пользователя приложения в MySQL.
- `MYSQL_ROOT_PASSWORD` - отдельный пароль администратора MySQL.
- `JWT_SECRET_KEY` - случайный секрет длиной не менее 32 символов.

`DB_NAME` и `DB_USER` можно оставить из примера. Чтобы сгенерировать секрет,
выполните `python -c "import secrets; print(secrets.token_urlsafe(32))"` и
скопируйте результат в `JWT_SECRET_KEY`. Настройки SMTP необязательны: они нужны
для восстановления пароля. Не публикуйте заполненный `.env`.

Корневой `.env` используется Docker Compose; `backend/.env` нужен для запуска
backend без Docker. Файл `frontend/.env` для Docker не требуется.

Соберите и запустите все сервисы:

```powershell
docker compose up -d --build --wait
```

Compose запускает MySQL, backend и frontend, ожидает готовности базы и применяет
миграции. После запуска откройте:

- Приложение: [http://localhost:8080](http://localhost:8080).
- Документация backend API: [http://localhost:8000/docs](http://localhost:8000/docs).

Порты можно изменить через `FRONTEND_PORT` и `BACKEND_PORT` в корневом `.env`.
Nginx во frontend направляет запросы `/api` в backend по внутренней сети Compose.
`TZ` задаёт часовой пояс организации; по умолчанию используется `Asia/Tomsk`.

Проверка состояния и просмотр ошибок:

```powershell
docker compose ps
docker compose logs --tail=100 frontend backend db
docker compose exec frontend nginx -t
```

Остановка, повторный запуск и пересборка после изменений:

```powershell
docker compose stop
docker compose up -d --wait
docker compose up -d --build --wait
```

Данные сохраняются в Docker volume `mysql_data`. Локальная MySQL и её данные
автоматически в контейнер не переносятся. При существующем volume изменение
паролей в `.env` не меняет уже созданные учётные данные MySQL. Команда
`docker compose down -v` удаляет volume вместе с данными.

### Запуск без Docker

Требуются Python, Node.js с npm и запущенный MySQL. Команды ниже предназначены
для PowerShell и выполняются из корня репозитория. Backend и frontend запускаются
в отдельных терминалах.

#### Backend

При первой настройке создайте окружение и установите зависимости:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Если `backend/.env` ещё не создан, скопируйте в него `backend/.env.example`.
В локальном `.env` заполните:

- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - подключение к MySQL.
  Базу и пользователя нужно создать заранее; пользователю нужны права на данные
  и изменение схемы этой базы для миграций.
- `JWT_SECRET_KEY` - собственный случайный секрет длиной не менее 32 символов.

Сгенерировать секрет можно из папки `backend`:

```powershell
.\.venv\Scripts\python.exe -c "import secrets; print(secrets.token_urlsafe(32))"
```

`ACCESS_TOKEN_EXPIRE_MINUTES` задаёт срок действия токена входа (по умолчанию
30 минут), `PASSWORD_RESET_EXPIRE_MINUTES` - кода восстановления (15 минут).
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

#### Почта для восстановления пароля

Для Gmail включите двухэтапную аутентификацию и создайте
[пароль приложения Google](https://support.google.com/accounts/answer/185833?hl=ru).
В используемом `.env` укажите `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
`SMTP_USER` - адрес почты, `SMTP_PASSWORD` - пароль приложения без пробелов,
`SMTP_FROM` - тот же адрес, что в `SMTP_USER`.

Поддерживаются порт `465` с TLS и порт `587` с STARTTLS. Без настроенного SMTP
восстановление пароля недоступно. После изменения `.env` перезапустите backend.

### Frontend

В отдельном терминале из корня репозитория:

```powershell
cd frontend
npm ci
npm run dev
```

Frontend: [http://localhost:5173](http://localhost:5173).
По умолчанию Vite перенаправляет запросы к backend на `http://localhost:8000`.
Для другого адреса создайте `frontend/.env` по образцу `frontend/.env.example`
и измените `VITE_API_BASE_URL`. После изменения перезапустите frontend.

## Команда

| Разработчик     | Зона ответственности                                         |
| --------------- | ------------------------------------------------------------ |
| Настя Белякова  | Frontend - интерфейсы клиента и администратора               |
| Саша Сидоренко  | Frontend - авторизация и регистрация                         |
| Данил Тимошенко | Backend - организации, услуги, специалисты и цены            |
| Денис Лазинский | Backend - авторизация, бронирования, расписание и статистика |
