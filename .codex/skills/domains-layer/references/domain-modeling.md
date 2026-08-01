# Domain Modeling

## Классификация

- Определи **Aggregate Root** как consistency boundary и единственную точку изменения owned entities.
- Определи **Entity** по identity и lifecycle внутри bounded context или aggregate.
- Определи **Value Object** по значению без самостоятельной identity; заменяй его целиком.
- Не превращай HTTP DTO, Prisma record, repository args, API payload или read model в domain class только из-за похожей формы.
- Называй модель предметно: `Task`, `WorkspaceMember`, `Email`; не используй суффиксы `Dto`, `Payload`, `Record` и `Response` для domain objects.

## Форма Класса

- Используй class с явно типизированным состоянием и domain methods.
- Добавляй метод только для поведения или инварианта; не создавай технические setters.
- Изменяй owned entity только через Aggregate Root.
- Не импортируй Prisma models, transport shapes и framework decorators.
- Не используй `Object.assign` и type casts для сокрытия неполной hydration.
- Соблюдай порядок: fields, constructor, static factories, public methods, private helpers.

## Lifecycle И Hydration

- Используй private constructor и явные factories `create()` / `restore()` для Aggregate Root.
- Создавай в `create()` identity, defaults, timestamps, owned entities и initial events.
- Восстанавливай в `restore()` полный persisted snapshot без новых business events.
- Восстанавливай owned class instances явно; не оставляй nested plain objects.
- Используй public constructor для Entity/Value Object, если business creation не отличается от hydration.
- Принимай partial snapshot только при реальном default для каждого отсутствующего поля.

```ts
private constructor(data: TaskData) {
  // validate and hydrate the complete state
}

public static create(data: CreateTaskData): Task {
  // identity, defaults and initial events
}

public static restore(data: TaskData): Task {
  // persisted snapshot without new events
}
```

## Инварианты И Events

- Проверяй инварианты при creation/restoration и перед каждой мутацией, способной их нарушить.
- Оставляй aggregate-local invariant внутри aggregate; не дублируй его в app service или repository.
- Выполняй no-op guard до изменения timestamps и накопления event.
- Сначала изменяй state, затем обновляй timestamp и добавляй domain event.
- Не добавляй equality/no-op behavior в постороннем refactoring без business requirement.
- Сохраняй Aggregate Root целиком через один repository.

## Проверка

- Подтверди классификацию по identity, lifecycle и consistency boundary.
- Проверь полную hydration и отсутствие новых events в `restore()`.
- Проверь, что external transport и persistence не протекли в model.
- Проверь, что методы выражают business actions и защищают invariants.
