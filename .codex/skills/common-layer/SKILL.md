---
name: common-layer
description: "Используй при создании, переносе или проверке src/common/** и @common/*: shared kernel, общие domain primitives, asserts, types, validators, чистые utils, barrels и import boundaries без I/O и бизнес-владения."
---

# Common Layer

Используй `src/common` только для shared kernel, который не принадлежит одному домену. Не размещай здесь I/O, Prisma, HTTP, WebSocket, внешние клиенты и application orchestration.

## Структура

```text
src/common/
  asserts/        # переиспользуемые чистые проверки
  domain/
    events/       # общая механика domain events
    types/        # типы общих domain primitives
  types/          # общие TypeScript utility types
  utils/          # чистые helpers
  validators/     # переиспользуемые правила без transport binding
```

Создавай только каталоги с реальным содержимым. Добавляй `index.ts` только для намеренно публичной подпапки.

## Владение

- Клади в `common/domain` только primitives, реально используемые несколькими доменами: например `AggregateRoot` и `DomainEvent`.
- Оставляй business-owned types, errors и constants в домене-владельце, даже если у них несколько consumers.
- Держи `asserts`, `utils` и validators детерминированными и свободными от I/O.
- Не добавляй Nest providers, Prisma types, database clients, filesystem/network calls и process lifecycle hooks.
- Не размещай controllers, gateways, repositories, listeners, jobs и feature services.
- Не создавай speculative abstraction: сначала найди минимум два реальных независимых consumers.

## Imports И Barrels

- Разрешай `common` импортировать только стандартную библиотеку и нейтральные библиотеки, не направляющие зависимость к слоям проекта.
- Запрещай импорты из `@infra/*`, `@domains/*`, `@app/*`, `@http/*` и `@ws/*`.
- Импортируй публичные symbols через ближайший `@common/*` barrel.
- Экспортируй type-only symbols через `export type`.
- Не re-export-ь содержимое одной common-подпапки через чужой barrel.

## Проверка

- Подтверди, что код нужен нескольким доменам и не имеет бизнес-владельца.
- Подтверди отсутствие I/O и infrastructure/framework coupling.
- Проверь направление импортов и отсутствие циклов.
- Примени `$code-readability` после изменения TypeScript-кода.
