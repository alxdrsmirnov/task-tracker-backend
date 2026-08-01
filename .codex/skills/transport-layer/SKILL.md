---
name: transport-layer
description: "Используй при создании, изменении или проверке входящих NestJS adapters в src/http/** и src/ws/**: controllers, DTO/response models, pipes, guards, filters, Socket.IO gateways, handshake auth и transport error mapping."
---

# Transport Layer

Держи HTTP и WebSocket код входными adapters приложения. Разбирай и валидируй transport data, вызывай application use case и преобразуй результат в transport response.

## Структура

```text
src/http/
  controllers/
  decorators/
  filters/
  guards/
  models/
    dto/
    responses/
  pipes/
  http.module.ts

src/ws/
  controllers/
  decorators/
  guards/
  types/
  web-socket.gateway.ts
  web-socket.module.ts
```

Создавай только реально используемые каталоги.

## HTTP

- Принимай route/query/body/cookie/header data в controller, decorator, guard или pipe.
- Валидируй DTO через `class-validator` и преобразуй значения через `class-transformer` только на transport boundary.
- Передавай в app service scalar или явный application Input.
- Возвращай response model, primitive или корректный HTTP status; не отдавай Prisma record и external API response.
- Преобразуй transport-specific failures в filters или Nest exceptions без дублирования business rules.
- Оставляй middleware registration, global prefix и CORS bootstrap в `src/main.ts`.

## WebSocket

- Держи Socket.IO gateway ответственным за namespace, lifecycle и handshake boundary.
- Разбирай cookie/header/token и устанавливай authenticated socket context в WS guard или gateway boundary.
- Передавай validated event payload в application service; не изменяй aggregate напрямую.
- Отправляй transport-safe acknowledgement/error и не раскрывай internal exception details.

## Границы И Проверка

- Импортируй application API через `@app/*` и transport-local symbols.
- Не импортируй Prisma client, concrete repository implementation и external connector.
- Не размещай business invariants, transaction orchestration и persistence mapping.
- Проверь HTTP status/response shape и WS acknowledgement/error contract.
- Проверь CORS credentials и cookie behavior при изменении authentication boundary.
- Примени `$code-readability` после изменения TypeScript-кода.
