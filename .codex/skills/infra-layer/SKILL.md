---
name: infra-layer
description: "Используй при создании, переносе или проверке src/infra/** и @infra/*: Prisma schema/models/migrations, database connection, transaction context и другие общие технические providers без бизнес-логики."
---

# Infra Layer

Размещай в `src/infra` общую техническую инфраструктуру, которой пользуются несколько доменов. Не превращай этот слой в каталог feature-specific implementations.

## Структура Prisma

```text
src/infra/prisma/
  migrations/
  models/
  schema.prisma
  prisma.connector.ts
  prisma.module.ts
  prisma.service.ts
  transaction-context.ts
  transaction.runner.ts
  index.ts
```

- Сохраняй Prisma schema, model fragments и migrations вместе в `src/infra/prisma`.
- Настраивай `prisma.config.ts` на `src/infra/prisma/schema.prisma` и соседний каталог migrations.
- Экспортируй через `@infra/prisma` только stable providers и transaction contracts, нужные другим слоям.
- Регистрируй lifecycle подключения и отключения в Prisma provider, а не в domain repository.
- Используй существующий CLS transaction context; не придумывай request/user context без требования.

## Границы

- Оставляй concrete Prisma repositories в `src/domains/{domain}/repositories`; импортируй там общий Prisma provider через `@infra/prisma`.
- Не размещай в `src/infra` domain repositories, gateways, aggregates, use cases, controllers и WS handlers.
- Не возвращай Prisma records или generated input types из infrastructure API, предназначенного domain/app слоям.
- Не импортируй `@app/*`, `@http/*` и `@ws/*`.
- Импортируй domain symbols только там, где инфраструктурная реализация неизбежно адаптирует domain contract; предпочитай держать такую реализацию в owning domain.
- Не изменяй существующие migrations при переносах. Создавай новую migration только для реального изменения schema.

## Изменение Schema

1. Определи доменного владельца данных.
2. Измени model fragment и root schema согласованно.
3. Сгенерируй migration штатной Prisma-командой, если меняется database contract.
4. Обнови repository mapping в домене-владельце.
5. Запусти `npx prisma validate` и `npm run db:generate`.

## Проверка

- Подтверди, что provider технический и переиспользуемый.
- Проверь alias `@infra/*`, Prisma paths и exports.
- Проверь отсутствие business orchestration и transport concerns.
- Примени `$code-readability` после изменения TypeScript-кода.
