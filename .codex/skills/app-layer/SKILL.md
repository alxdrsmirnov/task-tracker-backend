---
name: app-layer
description: "Используй при создании, изменении или проверке src/app/** и @app/*: application use cases, Input/Output contracts, orchestration, aggregate repository flow, transactions, side effects и runtime listeners/jobs."
---

# App Layer

Оркестрируй законченные пользовательские и системные сценарии в `src/app`. Вызывай domain behavior, repositories и gateways; не переноси их ответственность в application service.

## Структура Feature

```text
src/app/{feature}/
  {feature}.service.ts
  types/
  listeners/
  jobs/
  {feature}.module.ts
  index.ts
```

Создавай только используемые файлы и каталоги. Оставляй HTTP controllers в `src/http`, а WebSocket gateways/controllers — в `src/ws`.

## Use Case

Строй один public method как один завершённый сценарий:

```text
input
-> load state
-> application guards
-> domain behavior
-> persist
-> publish events / call side effects
-> result
```

- Оставляй важные фазы видимыми и читаемыми сверху вниз.
- Проверяй факты между aggregates через repository или gateway.
- Оставляй инварианты одного Aggregate Root его доменным методам.
- Не вызывай Prisma, SQL, HTTP clients или Socket.IO напрямую.
- Не импортируй transport DTO; определяй application Input/Output в `src/app/{feature}/types`.
- Не возвращай partial Aggregate Root; используй полный aggregate или отдельную read model.

## Persistence И Side Effects

1. Загрузи Aggregate Root через его repository.
2. Вызови domain methods.
3. Сохрани root через тот же repository.
4. Опубликуй events и выполни внешние side effects после успешного commit.

- Не оборачивай один атомарный repository call в application transaction.
- Используй `TransactionRunner` для одного commit/rollback нескольких repositories.
- Не внедряй repository owned entity отдельно от Aggregate Root.
- Не проглатывай неизвестные errors.
- Преобразуй только ожидаемые domain/application failures; не анализируй Axios/Prisma errors и внешние status codes.

## Runtime Entrypoints

- Держи listener и background job тонкими: разбери signal, собери Input, вызови один use case, соблюди retry policy.
- Не дублируй business guards, repository flow и domain mutations в handler.
- Пробрасывай error для retry/failed job, если явный контракт не требует остановить повтор.

## Imports И Проверка

- Импортируй `@common/*`, публичные `@domains/*`, `@infra/*` contracts и файлы своей feature.
- Не импортируй `@http/*` и `@ws/*`.
- Не импортируй один feature service из другого без явного application coordinator или подтверждённого sync contract.
- Подтверди, что public method читается как законченный use case.
- Подтверди, что transaction охватывает только требуемую atomic boundary.
- Примени `$code-readability` после изменения TypeScript-кода.
