# Quizzy

Веб-приложение для создания и прохождения квизов в реальном времени.

## Описание

Quizzy позволяет пользователям создавать собственные квизы, запускать игровые комнаты и проходить викторины вместе с другими участниками в режиме реального времени.

## Стек

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Realtime: Socket.IO

## Основные возможности

Авторизация/регистрация пользователей.

Работа с квизами:
 - создание квизов;
 - редактирование квизов;
 - публичные и приватные квизы;
 - добавление вопросов и вариантов ответов;
 - настройка времени и баллов.

Игровой процесс:
 - подключение по коду комнаты;
 - ожидание участников;
 - запуск квиза организатором;
 - синхронное отображение вопросов;
 - отправка ответов участниками;
 - обновление лидерборда в реальном времени;
 - итоговые результаты после завершения игры.

Личный кабинет:
 - профиль пользователя;
 - статистика участия;
 - последние результаты;
 - список созданных квизов;
 - история прохождения квизов.

## Структура проекта

```text
quizzy/
  client/     # React + Vite
  server/     # Node.js + Express + Socket.IO
  database/   # schema.sql и seed.sql
```

## Требования

- Node.js 18+
- npm 9+
- PostgreSQL 14+

## Установка

### 1. Клонирование проекта

```bash
git clone <repo_url>
cd quizzy
```

### 2. Установка зависимостей frontend

```bash
cd client
npm install
```

### 3. Установка зависимостей backend

```bash
cd ../server
npm install
```

## Настройка базы данных

### 1. Создайте базу данных

В PostgreSQL:

```sql
CREATE DATABASE quizzy;
```

### 2. Примените структуру базы

```bash
psql -U postgres -d quizzy -f database/schema.sql
```

### 3. Добавьте начальные данные

```bash
psql -U postgres -d quizzy -f database/seed.sql
```

## Настройка backend

В папке `server` создайте файл `.env` на основе `.env.example`.

Пример:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quizzy
DB_USER=postgres
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
PORT=5000
```

## Запуск проекта

### Backend

```bash
cd server
npm run dev
```

Ожидаемый успешный запуск:

```text
Quizzy server started on port 5000
```

### Frontend

```bash
cd client
npm run dev
```

Обычно frontend запускается на:

```text
http://localhost:5173
```

## Автор

Иванова Ксения

Практический проект VK — Quizzy.
