---
name: domain-structure
description: Organizes `src/modules/{moduleName}/domain/` in project modules and keeps domain boundaries clean. Use when creating or refactoring domain folders, deciding where domain code belongs, or working with `schemas`, `exceptions`, or `operations` inside `domain/`.
---

# Module Domain Structure

## Scope

Apply this skill when at least one of these signals is present:

1. The work touches `src/modules/*/domain/**`
2. The task is to create or refactor a module's `domain/` structure
3. The task mentions `schemas`, `exceptions`, `operations`, or zod schemas in a module context
4. The task requires deciding whether code belongs to `domain` or `infra`

## Goal

Keep `domain/` lightweight and business-oriented.

A developer should be able to open `domain/` and immediately see:

1. Business entity schemas and derived types in `schemas/`
2. Domain-specific exceptions in `exceptions/`
3. Pure business rule functions in `operations/` (when needed)

## Target Shape

Use this target shape for `src/modules/{moduleName}/domain/`:

```text
domain/
  schemas/              # when module has entities that diverge from Prisma defaults
  exceptions/           # when module needs domain errors
  operations/           # optional, when module has business rules beyond CRUD
```

Rules for creation:

1. `schemas/` is created when the module's business entities diverge from Prisma's default scalar types (e.g. need custom field sets, embedded relations, or validation)
2. `exceptions/` is created when the module needs explicit domain errors
3. `operations/` is created only when the module has pure business rules beyond simple CRUD
4. When all types are 1:1 with Prisma models and there are no exceptions — `domain/` folder is not needed
5. No `index.ts` barrel file — use direct imports to specific files
6. No `di.tokens.ts` — DI is done by class reference, not Symbol tokens

## What Moved Out of `domain/`

Previous architecture kept contract interfaces (`repositories/`, `gateways/`, `tools/`) and DI tokens in `domain/`. In the current architecture:

- **Repositories, gateways, tools** — concrete classes live in `infra/repositories/`, `infra/gateways/`, `infra/tools/`
- **DI tokens** — removed; inject by class reference
- **Supporting types** (DTOs, infra-specific shapes) — live in `infra/types/`
- **Business entity types** — derived from zod schemas via `z.infer`, or imported from `@prisma/client` when 1:1

## Folder Rules

Before creating a new file in `domain/`, classify the artifact:

- Business entity schema (zod) → `schemas/`
- Pure business rule function → `operations/`
- Domain-specific error → `exceptions/`
- Repository / gateway / tool implementation → not `domain/`; belongs in `infra/`
- Supporting type or DTO → not `domain/`; belongs in `infra/types/`
- Implementation detail → not `domain/`; check `infra` or another layer

### `schemas/`

Store zod schemas as the single source of truth for business entity types that diverge from Prisma defaults.

Rules:

1. One file per entity: `{entity}.ts` in `kebab-case` (e.g. `user-credentials.ts`, `refresh-token.ts`)
2. Define the schema using `zod`, export the schema and the derived type via `z.infer`
3. When a module's entity is 1:1 with Prisma model — use `import type { Entity } from '@prisma/client'` directly, no schema needed
4. Do not create schemas just to mirror Prisma types without changes

Example:

```ts
// domain/schemas/user-credentials.ts
import { z } from 'zod'

export const UserCredentialsSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  refreshTokens: z.array(RefreshTokenSchema),
})

export type UserCredentials = z.infer<typeof UserCredentialsSchema>
```

For simple 1:1 Prisma models:

```ts
import type { User } from '@prisma/client'
```

### `operations/`

Store pure functions that encode business rules over domain models.

Operations are immutable pure functions. They accept `Readonly<T>`, return a new object, and never mutate the input. They have no side effects except throwing domain exceptions.

If an operation changes model data, it returns the full model (`T`), not a partial object.

Create `operations/` only when the module has business rules that go beyond simple CRUD.

Rules:

1. One file per model or topic: `{entity}.operations.ts`
2. Functions accept `Readonly<Model>` and return `Model` or a primitive
3. No dependencies on repositories, gateways, tools, or any injected services
4. Domain exceptions are allowed
5. No side effects beyond throwing exceptions

Example:

```ts
export function completeTask(task: Readonly<Task>): Task {
  if (task.status === 'completed') {
    throw new TaskAlreadyCompleted(task.id)
  }
  return { ...task, status: 'completed', completedAt: new Date() }
}

export function isOverdue(task: Readonly<Task>): boolean {
  return task.dueDate !== null
    && task.status !== 'completed'
    && task.dueDate < new Date()
}
```

Good fit: status transitions, role assertions, business predicates

Bad fit: data fetching, persistence, anything requiring DI

### `exceptions/`

Store domain-specific exception classes.

Rules:

1. Add this folder when the module needs explicit domain errors
2. Use only for business rule violations, invalid transitions, or missing required business state
3. Do not use for HTTP exceptions, timeouts, SDK failures, ORM failures, serialization errors, or other infrastructure errors
4. Translate infrastructure errors in the infra layer (gateway/repository implementations) or in the use case before they become domain exceptions

Naming:

- File: `{error-name}.ts` in `kebab-case` (e.g. `relation-not-found.ts`, `form-not-linked.ts`)
- Class: `{ErrorName} extends DomainException` (e.g. `RelationNotFound`, `FormNotLinked`); import `DomainException` from `@common/domain`

Good fit: `relation-not-found.ts`, `form-not-linked.ts`, `interview-date-not-found.ts`

Bad fit: `api-timeout.ts`, `database-connection-error.ts` (infrastructure errors)

## Repository Method Naming

Methods in repository classes that retrieve a single entity must follow the `find` / `get` naming convention:

| Prefix | Return type | Behavior when not found |
| --- | --- | --- |
| `find*` | `Promise<Model \| null>` | Returns `null` |
| `get*` | `Promise<Model>` | Throws a domain exception (e.g. `NotFound`) |

Both patterns are valid. When generating new code, prefer `find*` (`findById`, `findOne`, `findBy`).

Methods that return a collection always return `Promise<Model[]>` — an empty array when nothing matches, never `null`. **Name those methods with the `list*` prefix** (e.g. `listByWorkspaceId`, `listMembersInWorkspace`, `listForUser`). Use a suffix or middle phrase that states the business scope (workspace, user, filter key), not a generic `findAll` unless the domain truly has no narrower name.

`search*` remains appropriate when the method's intent is **search or filter by params** (a dedicated params type); it still returns `Promise<Model[]>` and never `null`.

Bad:

```ts
getById(id: number): Promise<Contact | null>
findAll(): Promise<Contact[] | null>
findByWorkspaceId(workspaceId: string): Promise<Member[]>
```

Good:

```ts
findById(id: number): Promise<Contact | null>
getById(id: number): Promise<Contact>
listByWorkspaceId(workspaceId: string): Promise<Member[]>
search(params: ContactSearchParams): Promise<Contact[]>
```

## Repository Method Argument Types

For `create` and `update` methods in repositories, prefer shared generic types from `src/common/domain`:

- `New<T>` — strips system fields (`id`, `createdAt`, `updatedAt`) from the model; use for `create`
- `Updatable<T>` — `Partial<New<T>>`; use for `update`

These types are built on top of `SystemFields` — also in `src/common/domain`.

1. For `create`: prefer `New<Model>`
2. For `update`: prefer `id` + `Updatable<Model>`
3. When `New<Model>` is not enough (model has extra server-side fields like `completedAt`), use `Omit<New<Model>, 'field'>` inline
4. Dedicated types like `CreateUserData` or `UpdateUserData` are acceptable when generic composition becomes unreadable, but `New<Model>` and `Updatable<Model>` are preferred by default

Preferred:

```ts
create(data: New<User>): Promise<User>
update(id: string, data: Updatable<User>): Promise<User>
```

Acceptable when generic composition is too complex:

```ts
create(data: CreateUserData): Promise<User>
```

Edge case — extra server-side fields:

```ts
create(data: Omit<New<Task>, 'completedAt'>): Promise<Task>
```

## Import Rules

Inside `src/modules/{moduleName}/domain/**`, prefer only these imports:

1. Neighbor files from the same module's `domain/`
2. Shared types from `@common/domain`
3. `zod` for schema definitions
4. `@prisma/client` for 1:1 entity types (when no custom schema needed)

Import path style:

1. Always use direct paths to specific files — no barrel imports
2. `import { UserCredentials } from '../domain/schemas/user-credentials'` — good (direct path)
3. `import { UserCredentials } from '../domain'` — bad (barrel import, barrels are not used)

Forbidden imports:

1. Anything from `infra/**`
2. Anything from `use-cases/**`
3. Controllers, Nest modules, cron classes, or transport adapters
4. Framework or library types such as `@nestjs/*`, `axios`, `typeorm`, `class-validator`, and `class-transformer` (except `zod`)

## Anti-Patterns

1. Creating schemas just to mirror Prisma types without any changes — use `@prisma/client` types directly
2. Using technical method names such as `sendRequest`, `callApi`, `runQuery`, or `executeSql` in repositories — prefer business-intent names
3. Using `any`, `unknown`, or `Record<string, unknown>` as a lazy escape hatch
4. Turning infrastructure failures (timeouts, connection errors, SDK exceptions) into domain exceptions — translate them at the boundary
5. Creating duplicate concepts with names like `Lead`, `LeadModel`, `LeadData`, and `LeadPayload` for the same business meaning — prefer one canonical name
6. Creating a `domain/index.ts` barrel file — use direct file imports
7. Creating `di.tokens.ts` with Symbol tokens — inject by class reference
8. Placing contract interfaces in `domain/` — concrete classes live in `infra/`
