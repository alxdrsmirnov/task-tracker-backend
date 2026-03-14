# Prisma: Полный гайд для разработчика

## Что такое Prisma?

**Prisma** — это ORM (Object-Relational Mapping) нового поколения для Node.js и TypeScript, которая работает как слой между вашим приложением и базой данных. Она предоставляет типобезопасный доступ к БД через автогенерируемый клиент.

## Ключевые концепции

### 1. **Schema-first подход**

Вся работа начинается с файла `schema.prisma` — это единый источник истины для вашей модели данных:

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
}
```

### 2. **Prisma Client**

После генерации вы получаете типобезопасный клиент с автодополнением:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Типобезопасные запросы
const users = await prisma.user.findMany({
  where: { email: { contains: '@gmail.com' } },
  include: { posts: true }
})
```

### 3. **Миграции**

Prisma управляет схемой БД через миграции:

```bash
# Создать миграцию на основе изменений в schema.prisma
npx prisma migrate dev --name add_user_table

# Применить миграции в продакшене
npx prisma migrate deploy
```

---

## Составление моделей (Models)

Модель в Prisma описывает таблицу в БД и определяет её поля, типы, отношения и ограничения. Ниже — детальное руководство по созданию моделей.

### 1. Базовая структура модели

```prisma
model ModelName {
  fieldName  FieldType  @attributes
  // ...
}
```

- **ModelName** — имя в PascalCase, соответствует имени таблицы (по умолчанию — `ModelName` в PostgreSQL).
- **fieldName** — имя поля в camelCase.
- **FieldType** — тип данных.
- **@attributes** — опциональные атрибуты.

### 2. Типы полей (Scalar types)

| Prisma тип | PostgreSQL | Описание |
|------------|------------|----------|
| `String` | `TEXT` | Строка произвольной длины |
| `Boolean` | `BOOLEAN` | true/false |
| `Int` | `INTEGER` | 32-битное целое |
| `BigInt` | `BIGINT` | 64-битное целое |
| `Float` | `DOUBLE PRECISION` | Число с плавающей точкой |
| `Decimal` | `DECIMAL(65,30)` | Точная десятичная дробь (деньги, расчёты) |
| `DateTime` | `TIMESTAMP(3)` | Дата и время (миллисекунды) |
| `Json` | `JSONB` | JSON-объект |
| `Bytes` | `BYTEA` | Бинарные данные |

**Опциональность (nullable):**

```prisma
name     String   // NOT NULL — обязательное
name     String?  // NULL — опциональное
```

### 3. Идентификаторы и уникальность

```prisma
model User {
  id        Int      @id @default(autoincrement())  // Автоинкремент
  uuid      String   @id @default(uuid())           // UUID как primary key
  email     String   @unique                        // Уникальное поле
  username  String   @unique @default(cuid())       // CUID — collision-resistant ID
}
```

**Варианты `@default` для ID:**

- `@default(autoincrement())` — автоинкремент (Int).
- `@default(uuid())` — UUID v4.
- `@default(cuid())` — CUID (collision-resistant unique identifier).
- `@default(cuid2())` — CUID2 (новый формат).

**Другие `@default`:**

```prisma
createdAt  DateTime  @default(now())
updatedAt  DateTime  @updatedAt                    // Обновляется автоматически
published  Boolean   @default(false)
score      Int       @default(0)
```

### 4. Отношения между моделями

#### One-to-Many (один ко многим)

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id])
  authorId Int  // Скалярное поле — foreign key
}
```

- На стороне «многих» — скалярное поле `authorId` и связь `@relation`.
- На стороне «одного» — массив `Post[]` (виртуальное поле, не создаёт колонку).

#### One-to-One (один к одному)

```prisma
model User {
  id      Int    @id @default(autoincrement())
  profile Profile?
}

model Profile {
  id     Int  @id @default(autoincrement())
  user   User @relation(fields: [userId], references: [id])
  userId Int  @unique  // @unique обязателен для 1:1
}
```

Для 1:1 на стороне «подчинённой» модели поле связи должно быть `@unique`.

#### Many-to-Many (многие ко многим)

**Неявная связь (Prisma создаёт join-таблицу):**

```prisma
model Post {
  id       Int    @id @default(autoincrement())
  title    String
  tags     Tag[]
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String
  posts Post[]
}
```

Prisma создаёт таблицу `_PostToTag` с колонками `A` и `B`.

**Явная связь (своя join-таблица):**

```prisma
model Post {
  id         Int      @id @default(autoincrement())
  title      String
  postTags   PostTag[]
}

model Tag {
  id       Int      @id @default(autoincrement())
  name     String
  postTags PostTag[]
}

model PostTag {
  postId   Int
  tagId    Int
  post     Post @relation(fields: [postId], references: [id])
  tag      Tag  @relation(fields: [tagId], references: [id])
  assignedAt DateTime @default(now())

  @@id([postId, tagId])  // Составной primary key
}
```

Явная модель нужна, если в связи есть дополнительные поля.

#### Именованные связи (несколько связей между моделями)

```prisma
model User {
  id            Int    @id @default(autoincrement())
  writtenPosts  Post[] @relation("Author")
  editedPosts   Post[] @relation("Editor")
}

model Post {
  id        Int   @id @default(autoincrement())
  author    User  @relation("Author", fields: [authorId], references: [id])
  authorId  Int
  editor    User? @relation("Editor", fields: [editorId], references: [id])
  editorId  Int?
}
```

### 5. Индексы

```prisma
model User {
  id        Int    @id @default(autoincrement())
  email     String @unique              // Уникальный индекс
  companyId Int
  status    String

  company Company @relation(fields: [companyId], references: [id])

  @@index([companyId])                 // Индекс на одно поле
  @@index([companyId, status])         // Составной индекс
  @@index([status], name: "status_idx") // Именованный индекс
}
```

**Когда нужны индексы:**

- Поля в `where`, `orderBy`, `groupBy`.
- Foreign key (часто создаётся автоматически).
- Частые поиски по нескольким полям — составной индекс.

### 6. Enum

```prisma
enum Role {
  USER
  ADMIN
  MODERATOR
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  DONE
  CANCELLED
}

model User {
  id     Int  @id @default(autoincrement())
  role   Role @default(USER)
}

model Task {
  id     Int        @id @default(autoincrement())
  status TaskStatus @default(PENDING)
}
```

В PostgreSQL enum создаётся как отдельный тип.

### 7. Маппинг имён (naming)

```prisma
model User {
  id        Int    @id @default(autoincrement())
  firstName String @map("first_name")   // Колонка: first_name
  createdAt DateTime @default(now()) @map("created_at")
}

model Post {
  id Int @id @default(autoincrement())

  @@map("blog_posts")  // Таблица: blog_posts
}
```

- `@map("column_name")` — имя колонки в БД.
- `@@map("table_name")` — имя таблицы в БД.

### 8. Составной первичный ключ

```prisma
model Vote {
  userId Int
  postId Int
  user   User @relation(fields: [userId], references: [id])
  post   Post @relation(fields: [postId], references: [id])

  @@id([userId, postId])
}
```

### 9. Уникальные ограничения

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
}

// Составной unique
model UserSession {
  userId    Int
  sessionId String
  @@unique([userId, sessionId])
}
```

### 10. Каскадное удаление (onDelete)

```prisma
model Post {
  id       Int  @id @default(autoincrement())
  author   User @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId Int
}
```

Варианты `onDelete`:

- `Cascade` — удалить связанные записи.
- `SetNull` — выставить `null` (поле должно быть опциональным).
- `Restrict` — запретить удаление, если есть связанные записи (по умолчанию).
- `NoAction` — без действия на уровне БД.
- `SetDefault` — выставить значение по умолчанию.

### 11. Чек-лист при создании модели

1. **ID** — `@id` с подходящим `@default` (autoincrement, uuid, cuid).
2. **Обязательность** — `String` vs `String?` в зависимости от бизнес-логики.
3. **Связи** — корректные `@relation`, скалярные FK и `@unique` для 1:1.
4. **Индексы** — для полей в `where`/`orderBy` и для FK.
5. **Уникальность** — `@unique` или `@@unique` там, где нужно.
6. **Значения по умолчанию** — `@default` для булевых, дат, статусов.
7. **Имена в БД** — `@map`/`@@map` при необходимости snake_case.
8. **Каскады** — `onDelete` для связей, где важно поведение при удалении.

### 12. Пример полной модели

```prisma
model Task {
  id          String     @id @default(cuid())
  title       String
  description String?
  status      TaskStatus  @default(PENDING)
  priority    Int         @default(0)
  assigneeId  Int?
  projectId   Int
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  assignee  User?    @relation(fields: [assigneeId], references: [id], onDelete: SetNull)
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  comments  Comment[]

  @@index([projectId])
  @@index([assigneeId])
  @@index([status, projectId])
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  REVIEW
  DONE
}
```

---

## Основные возможности

### **CRUD операции**

```typescript
// Create
const user = await prisma.user.create({
  data: { email: 'test@example.com', name: 'John' }
})

// Read
const user = await prisma.user.findUnique({ where: { id: 1 } })
const users = await prisma.user.findMany({
  where: { published: true },
  skip: 10,
  take: 20
})

// Update
const user = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'New Name' }
})

// Delete
const user = await prisma.user.delete({ where: { id: 1 } })
```

### **Отношения**

```typescript
// Eager loading
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: { posts: true }
})

// Nested writes
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    posts: {
      create: { title: 'First Post', content: '...' }
    }
  }
})
```

### **Транзакции**

```typescript
// Последовательные транзакции
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({...})
  await tx.post.create({ data: { authorId: user.id, ... }})
})

// Параллельные транзакции
const [user, post] = await prisma.$transaction([
  prisma.user.findUnique({ where: { id: 1 } }),
  prisma.post.findUnique({ where: { id: 1 } })
])
```

### **Raw SQL**

Когда Prisma недостаточно:

```typescript
// Raw query
const result = await prisma.$queryRaw`SELECT * FROM "User" WHERE id = ${1}`

// Raw execute
await prisma.$executeRaw`UPDATE "User" SET name = ${name} WHERE id = ${id}`
```

## Типичный workflow

```bash
# 1. Изменяем schema.prisma

# 2. Создаем миграцию (dev)
npx prisma migrate dev --name add_new_field

# 3. Генерируем клиент (если не используется auto-generation)
npx prisma generate

# 4. Используем в коде
import { PrismaClient } from '@prisma/client'

# 5. В продакшене
npx prisma migrate deploy
```

## Prisma Studio

GUI для работы с данными:

```bash
npx prisma studio
```

Открывает веб-интерфейс для просмотра, создания, редактирования записей.

## Best Practices

1. **Всегда используйте `include`/`select`** — не загружайте лишние данные
2. **Индексы** — добавляйте `@index` для часто используемых полей в `where`
3. **Транзакции** — для атомарных операций
4. **Пагинация** — используйте `skip`/`take` или курсорную пагинацию
5. **Валидация** — Prisma не валидирует данные, делайте это на уровне приложения
6. **Connection Pooling** — настройте для продакшена (PgBouncer для PostgreSQL)

## Основные команды CLI

### **1. Работа с миграциями**

```bash
# Создание миграции в development
npx prisma migrate dev --name <название>

# Применение миграций в production
npx prisma migrate deploy

# Откат последней миграции
npx prisma migrate resolve --rolled-back

# Просмотр статуса миграций
npx prisma migrate status

# Генерация миграции без применения (только SQL файл)
npx prisma migrate dev --create-only --name <название>

# Сброс базы и применение всех миграций
npx prisma migrate reset
```

### **2. Генерация Prisma Client**

```bash
# Генерация клиента (обычно автоматически при migrate dev)
npx prisma generate

# Генерация с кастомным output
npx prisma generate --output ./generated
```

### **3. Работа с базой данных**

```bash
# Форматирование базы (удаление всех данных + миграции)
npx prisma db seed

# Сброс базы к чистому состоянию
npx prisma db push          # Push схемы без миграций (для прототипирования)
npx prisma db pull          # Pull существующей схемы из БД в schema.prisma
```

### **4. Prisma Studio (GUI)**

```bash
# Запуск графического интерфейса
npx prisma studio
# или
npx prisma studio --port 3000
```

### **5. Валидация и форматирование**

```bash
# Проверка schema.prisma на ошибки
npx prisma validate

# Форматирование schema.prisma
npx prisma format
```

### **6. Прочие команды**

```bash
# Версия Prisma
npx prisma -v

# Инициализация нового проекта
npx prisma init

# Debug информация
npx prisma debug
```

---

## Полный рабочий процесс (Workflow)

### **📍 Development (Разработка)**

```bash
# 1. Изменяем schema.prisma
# Добавляем новую модель или поле

# 2. Создаем и применяем миграцию
npx prisma migrate dev --name add_user_avatar

# Что происходит:
# - Создается файл миграции в prisma/migrations/
# - Применяется к dev базе
# - Перегенерируется Prisma Client

# 3. (Опционально) Открываем Studio для просмотра данных
npx prisma studio

# 4. Пишем код с использованием Prisma Client
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
```

### **📍 Production (Продакшен)**

```bash
# 1. Генерируем миграции на dev машине (не в production!)
npx prisma migrate dev --name add_feature

# 2. Коммитим изменения (включая файлы миграций)
git add .
git commit -m "Add user avatar feature"

# 3. В production применяем миграции
npx prisma migrate deploy

# 4. (Опционально) Генерируем клиент если нужно
npx prisma generate
```

### **📍 Прототипирование (быстрые изменения без миграций)**

```bash
# Для быстрых экспериментов без создания миграций
npx prisma db push

# Внимание: не используйте в production!
# Это обновляет схему БД напрямую, без истории миграций
```

---

## Типичные сценарии

### **Сценарий 1: Добавление нового поля**

```bash
# 1. Добавляем поле в schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  avatar    String?  # Новое поле
}

# 2. Создаем миграцию
npx prisma migrate dev --name add_user_avatar

# 3. Обновляем код приложения
```

### **Сценарий 2: Работа с существующей БД**

```bash
# 1. Pull существующей схемы из БД
npx prisma db pull

# 2. Редактируем schema.prisma при необходимости

# 3. Генерируем клиент
npx prisma generate
```

### **Сценарий 3: Откат миграции**

```bash
# Если миграция сломала что-то:
npx prisma migrate resolve --rolled-back

# Или вручную откатить SQL и пометить как примененную
```

### **Сценарий 4: Seed данных (тестовые данные)**

```bash
# 1. Создаем prisma/seed.ts
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
await prisma.user.create({ data: { email: 'test@example.com' }})

# 2. Добавляем в package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}

# 3. Запускаем seed
npx prisma db seed
```

---

## Структура проекта с Prisma

```
project/
├── prisma/
│   ├── schema.prisma          # Схема БД
│   ├── migrations/            # Файлы миграций
│   │   ├── 20240101000000_init/
│   │   │   ├── migration.sql
│   │   │   └── migration_lock.toml
│   │   └── migration_lock.toml
│   └── seed.ts                # Seed данные
├── src/
│   └── ...
├── package.json
└── .env                       # DATABASE_URL
```

---

## Команды для повседневной разработки

| Задача | Команда |
|--------|---------|
| Добавить новое поле/модель | `npx prisma migrate dev --name <name>` |
| Применить миграции в prod | `npx prisma migrate deploy` |
| Посмотреть данные | `npx prisma studio` |
| Обновить клиент | `npx prisma generate` |
| Сбросить базу | `npx prisma migrate reset` |
| Взять схему из БД | `npx prisma db pull` |
| Push схему в БД (dev) | `npx prisma db push` |

---

## Важные заметки

1. **Никогда не запускайте `migrate dev` в production** — только `migrate deploy`
2. **Всегда коммитьте файлы миграций** в git
3. **`db push` уничтожает историю миграций** — используйте только для прототипов
4. **`migrate reset` удаляет все данные** — осторожно в shared базах
5. **Prisma Client генерируется автоматически** при `migrate dev`, но в CI/CD может потребоваться `generate`
