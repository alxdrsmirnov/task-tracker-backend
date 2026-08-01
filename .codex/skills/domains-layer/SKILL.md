---
name: domains-layer
description: "Используй при проектировании, создании или проверке src/domains/** и @domains/*: aggregates, entities, value objects, events, exceptions, domain modules, Prisma repositories, external gateways/connectors, types и public API."
---

# Domains Layer

Строй `src/domains` вокруг бизнес-владения и consistency boundaries. Держи model, owned persistence adapters и предметные external gateways рядом с доменом; не помещай сюда transport entrypoints и application orchestration.

## Обязательные References

- Прочитай [domain-modeling.md](references/domain-modeling.md) при создании или изменении Aggregate Root, Entity, Value Object, invariant, event или domain error.
- Прочитай [repository-rules.md](references/repository-rules.md) при создании или изменении repository, Prisma mapping, query/read model или transaction behavior.
- Прочитай [gateway-connector-rules.md](references/gateway-connector-rules.md) при интеграции с внешней системой, работе с API types, authentication, retry или transport errors.

## Целевая Структура

```text
src/domains/{domain}/
  aggregates/
    invariants/
    types/
  entities/
    types/
  vo/
    types/
  events/
  exceptions/
  repositories/
    types/
  gateways/
    connectors/
      types/
    types/
  types/
  {domain}-domain.module.ts
  index.ts
```

Создавай только реально необходимые каталоги. Не создавай доменные `services/`; размещай use cases и orchestration в `src/app`.

## Владение И Public API

- Клади тип к наиболее узкому семантическому владельцу, а не к каталогу с наибольшим числом consumers.
- Держи aggregate/entity/VO data рядом с моделью, repository args/read models в `repositories/types`, API wire shapes в `gateways/types`, connector config в `gateways/connectors/types`.
- Регистрируй concrete repositories, gateways и connectors в `{domain}-domain.module.ts`.
- Экспортируй из domain module только providers, нужные app или другим domain modules.
- Экспортируй из корневого `index.ts` публичные domain classes, events, errors, contracts/providers и module.
- Не раскрывай Prisma rows, API wire types и connector internals через основной barrel.

## Imports

- Используй относительные импорты внутри одного домена и не импортируй собственный root barrel.
- Импортируй другой домен только через его `@domains/{domain}` public API.
- Разрешай domain repository импортировать `@infra/prisma`; не переноси concrete repository в `src/infra`.
- Не импортируй `@app/*`, `@http/*` и `@ws/*`.
- Не обходи circular dependency deep import-ом; пересмотри ownership или coordination boundary.

## Проверка

- Подтверди бизнес-владельца каждого файла и типа.
- Проверь отсутствие transport DTO, application orchestration и infrastructure records в public domain contracts.
- Проверь полноту Aggregate Root hydration и атомарность его repository.
- Проверь пару Gateway/Connector для каждого внешнего integration boundary.
- Примени `$code-readability` после изменения TypeScript-кода.
