# Repository Rules

## Размещение И Контракт

- Размещай repository contract и concrete Prisma implementation в `src/domains/{domain}/repositories`.
- Импортируй `PrismaService`, transaction context и runner через `@infra/prisma`.
- Размещай query params, projections и repository read models в `repositories/types`.
- Принимай и возвращай domain classes, read models, primitives или repository-owned types.
- Не выпускай Prisma records, generated `WhereInput`, delegates, transactions и raw SQL shapes через public API.
- Возвращай из `find*` объект или `null`, из `list*` — массив, из `search*` — массив или явный paginated result.
- Не выполняй application orchestration и external side effects внутри repository.

## Mapping И Hydration

- Преобразуй Prisma record в Aggregate Root через `restore()`.
- Восстанавливай обычную Entity через её constructor или явный hydration factory.
- Используй private `toDomain` для одной domain target model.
- Используй предметный mapper для projection/read model, которая не является domain class.
- Делай field-by-field mapping при relations, rename, normalization, nullable/default handling и computed values.
- Не возвращай частично hydrated Aggregate Root; создай отдельную read model для лёгкого списка.

```ts
private toDomain(record: PrismaTask): Task {
  return Task.restore({
    id: record.id,
    title: record.title,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  })
}
```

## Aggregate Persistence

- Сохраняй root и owned entities через один aggregate repository.
- Не создавай app-facing repository для owned entity.
- Загружай Aggregate Root полностью перед вызовом его behavior.
- Делай одну public repository operation атомарной.
- Открывай transaction внутри repository, если одна operation выполняет несколько связанных DB writes.
- Используй application `TransactionRunner` только для atomic write через несколько repositories/stores.
- Присоединяйся к уже активной transaction через существующий `@infra/prisma` context.

## Ошибки

- Возвращай `null` для допустимого persistence `not found`.
- Оставляй business interpretation app service или domain behavior.
- Пробрасывай неизвестную Prisma/infrastructure error без маскировки.
- Преобразуй database constraint error только при устойчивом и явно проверяемом contract.

## Проверка

- Проверь, что public API говорит на языке домена.
- Проверь, что Prisma details не вышли за repository boundary.
- Проверь полноту Aggregate Root и atomicity записи.
- Проверь, что concrete repository остаётся в owning domain и использует `@infra/prisma`.
