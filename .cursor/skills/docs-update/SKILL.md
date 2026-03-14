---
name: docs-update
disable-model-invocation: true
---

# Docs Update

## Workflow

1. Scan `src/modules/` via Glob to collect module directory names.
2. Use `AskQuestion` with `allow_multiple: true` to present a numbered list of discovered modules.
   - Add an extra option **"Во всех модулях"** as the last item.
   - Wait for the user's selection before proceeding.
3. For each selected module:
   a. Read **all source files** inside `src/modules/{module}/` (domain, infra, use-cases, controllers).
   b. Read the existing `docs/modules-docs/{module}.docs.md` if it exists.
   c. Generate or update the documentation following the template below.
   d. Write the result to `docs/modules-docs/{module}.docs.md`.
4. Report which files were created or updated.

## AskQuestion Format

```text
title: "Обновление документации модулей"
prompt: "В каких модулях обновить документацию?"
options:
  - { id: "{module1}", label: "1. {module1}" }
  - { id: "{module2}", label: "2. {module2}" }
  - ...
  - { id: "all",       label: "N. Во всех модулях" }
allow_multiple: true
```

If the user selects "all", process every module.

## Documentation Template

Each `docs/modules-docs/{module}.docs.md` must follow this structure and order.
Language: Russian. Reference: `docs/modules-docs/auth.docs.md`.

```markdown
# {ModuleName} Module

## Назначение

{Краткое описание: что делает модуль, за что отвечает.}

---

## Связи с другими модулями

{Для каждой зависимости — направление, что импортируется, зачем.}

| Направление | Что импортируется | Для чего |
|-------------|-------------------|----------|
| `{module}` → `{other}` | ... | ... |

{Если модуль используется другими — перечислить кем и для чего.}

---

## Структура модуля

\`\`\`
modules/{module}/
├── {module}.module.ts
├── {module}.{http|ws}.controller.ts
│
├── domain/
│   ├── di.tokens.ts
│   ├── models/
│   │   └── ...
│   ├── repositories/
│   │   └── ...
│   ├── types/            # если есть
│   │   └── ...
│   ├── operations/       # если есть
│   │   └── ...
│   └── exceptions/
│       └── ...
│
├── infra/
│   ├── {module}.infra.module.ts
│   └── prisma/
│       └── ...
│
├── use-cases/
│   ├── {case-name}.case.ts
│   └── dto/
│       └── ...
│
└── index.ts
\`\`\`

---

## Domain

### Доменные модели

{Для каждой модели из `domain/models/`:}

#### {ModelName}

{Описание сущности: что хранит, назначение, связи с другими сущностями.}

\`\`\`typescript
interface {ModelName} {
  // поля с комментариями
}
\`\`\`

---

### Репозитории

{Для каждого репозитория из `domain/repositories/`:}

#### {RepositoryName}

{Описание: с какими сущностями работает.}

\`\`\`typescript
interface {RepositoryName} {
  // Описание метода
  methodName(args): Promise<Result>;
}
\`\`\`

---

### Типы

{Если есть `domain/types/`. Для каждого файла типов:}

#### {TypeFileName}

\`\`\`typescript
// types/{file}.ts

interface/type {TypeName} {
  // поля
}
\`\`\`

---

### Исключения

| Исключение | Когда выбрасывается |
|------------|---------------------|
| `{ExceptionName}` | {Описание ситуации} |

---

### Operations

{Если есть `domain/operations/`. Описание функций и их назначения.}

---

### DI Tokens

\`\`\`typescript
export const {Module}DomainDI = {
  {TOKEN_NAME}: Symbol('{TOKEN_NAME}'),
} as const;
\`\`\`

---

## Infra

{Для каждой реализации из `infra/`:}

### {ImplementationName}

{Описание: какой интерфейс реализует, какую технологию использует (Prisma, S3, BullMQ и т.д.).}

{Если реализация содержит нетривиальную логику — описать ключевые детали.}

---

## Use Cases

### Список

| Use Case | Описание |
|----------|----------|
| `{UseCaseName}` | {Краткое описание} |

---

{Для каждого use case — детальное описание:}

### {UseCaseName}

{Что делает этот use case.}

**Поток:**
1. {Шаг 1}
2. {Шаг 2}
3. ...

---

## HTTP Endpoints

{Только если есть `*.http.controller.ts`.}

| Метод | Путь | Назначение |
|-------|------|------------|
| {METHOD} | `/{route}` | {Описание} |

---

## WebSocket Events

{Только если есть `*.ws.controller.ts`.}

| Событие | Payload | Описание |
|---------|---------|----------|
| `{event:name}` | `{DtoName}` | {Описание} |
```

## Rules

1. Write documentation in **Russian**.
2. Read actual source code — do not guess field names, types, or method signatures.
3. Preserve existing module-specific sections (e.g. "Безопасность" in auth, "Стратегии" in auth) — do not remove them.
4. If the module has no `domain/types/`, `domain/operations/`, or other optional sections — omit those sections entirely.
5. Use `---` as section separator (consistent with auth.docs.md).
6. Tree structure format must match the style in `docs/modules-docs/auth.docs.md`.
7. For `infra/` section: describe each implementation analogously to domain — what interface it implements, technology used, key implementation details.
8. For `use-cases/` section: first a summary table of all cases, then a detailed block for each one with step-by-step flow.
9. Do not invent information that is not in the source code.

## Output Format

After completion:

```text
Обновлена документация:
- docs/modules-docs/{module1}.docs.md (создан | обновлён)
- docs/modules-docs/{module2}.docs.md (создан | обновлён)
```
