## Description

Тестовое задание: REST API на **NestJS** с аутентификацией, CRUD для статей, PostgreSQL и Redis.

Проект демонстрирует:

* JWT-аутентификацию с **access / refresh токенами**
* хранение refresh token в виде **hash**
* CRUD API для сущности «Статья»
* пагинацию и фильтрацию
* кэширование запросов с использованием **Redis**
* инвалидацию кэша при изменении данных
* unit-тесты для бизнес-логики

Проект ориентирован на уровень **Middle NestJS developer** и близок к production-подходу.

---

## Stack

* **Node.js / TypeScript**
* **NestJS**
* **PostgreSQL** (TypeORM + migrations)
* **Redis** (cache-manager)
* **JWT (access + refresh)**
* **Docker / Docker Compose**
* **Jest** (unit tests)

---

## Requirements

* Node.js >= 18
* Docker + Docker Compose

---

## Environment variables

Создайте файл `.env` в корне проекта:

```env
# App
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=123456789
DB_NAME=articles_db

# JWT
JWT_ACCESS_SECRET=access_secret
JWT_ACCESS_EXPIRES_IN=900

JWT_REFRESH_SECRET=refresh_secret
JWT_REFRESH_EXPIRES_IN=604800

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
TTL=60000
```

---

## Run with Docker

Поднять PostgreSQL и Redis:

```bash
docker-compose up -d
```

Применить миграции:

```bash
npm run migration:run
```

Запустить приложение:

```bash
npm run start:dev
```

API будет доступно по адресу:

```
http://localhost:3000
```

---

## Run without Docker

1. Запустить PostgreSQL и Redis локально
2. Создать базу данных
3. Указать корректные значения в `.env`

Установка зависимостей:

```bash
npm install
```

Применение миграций:

```bash
npm run migration:run
```

Запуск:

```bash
npm run start:dev
```

---

## API Documentation (Swagger)

Swagger доступен по адресу:

```
http://localhost:3000/api/docs
```

Документация содержит:

* эндпоинты аутентификации
* CRUD для статей
* описание DTO и схем

---

## Authentication

Реализована схема **Access + Refresh token**:

* **Access token** — короткоживущий, используется для доступа к API
* **Refresh token** — долгоживущий, используется для обновления access token
* Refresh token хранится в БД **в виде hash**
* Реализована **rotation refresh token**

Эндпоинты:

* `POST /auth/register`
* `POST /auth/login`
* `POST /auth/refresh`
* `POST /auth/logout`

---

## Articles

Функциональность:

* создание статьи (только авторизованный пользователь)
* обновление статьи (только авторизованный пользователь)
* удаление статьи (только авторизованный пользователь)
* получение списка статей
* пагинация
* фильтрация по автору и дате публикации

---

## Caching

* Кэширование списка статей и отдельной статьи
* Используется Redis
* Инвалидация списка реализована через **versioned cache key**
* TTL кэша ограничен

---

## Testing

Unit-тесты покрывают бизнес-логику сервисов.

Запуск тестов:

```bash
npm run test
```

---

## Notes

* Код следует принципам чистой архитектуры
* Комментарии используются только для объяснения архитектурных и бизнес-решений
* Проект легко масштабируется под реальные production-сценарии

---

## Author

Тестовое задание выполнено в рамках отбора на позицию **Middle NestJS Developer**.
