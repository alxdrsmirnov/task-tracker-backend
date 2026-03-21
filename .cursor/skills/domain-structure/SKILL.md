---
name: domain-structure
description: Organizes `src/modules/{moduleName}/domain/` in project modules and keeps domain boundaries clean. Use when creating or refactoring domain folders, deciding where domain code belongs, or working with `models`, `repositories`, `gateways`, `tools`, `types`, `di.tokens.ts`, `exceptions`, and `domain/index.ts`.
---

# Module Domain Structure

## Scope

Apply this skill when at least one of these signals is present:

1. The work touches `src/modules/*/domain/**`
2. The task is to create or refactor a module's `domain/` structure
3. The task mentions `models`, `repositories`, `gateways`, `tools`, `types`, `di.tokens.ts`, `exceptions`, or `domain/index.ts`
4. The task requires deciding whether code belongs to `domain` or `infra`

## Goal

Keep `domain/` predictable, business-oriented, and independent from `infra`.

A developer should be able to open `domain/` and immediately see:

1. Business entities in `models`
2. Database contracts in `repositories`
3. External API contracts in `gateways`
4. Infrastructure capability contracts in `tools`
5. Supporting domain types in `types`
6. Domain-specific exceptions in `exceptions`
7. Public domain exports in `domain/index.ts`

## Target Shape

Use this target shape for `src/modules/{moduleName}/domain/`:

```text
domain/
  index.ts              # required
  di.tokens.ts          # when module has contracts
  models/               # when module has business entities
    operations/         # when module has business rules beyond CRUD
  types/                # when module has supporting types or enums
  repositories/         # when module needs persistence contracts
  gateways/             # when module needs external API contracts
  tools/                # when module needs in-process capability contracts
  exceptions/           # when module needs domain errors
```

Rules for creation:

1. `domain/index.ts` is required
2. `di.tokens.ts` is created when the module has domain contracts (`repositories/`, `gateways/`, or `tools/`)
3. `repositories/` is created only when the module needs database or persistence contracts
4. `gateways/` is created only when the module needs external API contracts
5. `tools/` is created only when the module needs infrastructure capability contracts that are neither persistence nor external system integrations
6. Do not create `entities/` inside `domain/`; use `models/`

## Folder Rules

Before creating a new file in `domain/`, classify the artifact:

- Business entity -> `models/`
- Pure business rule function -> `models/operations/`
- Supporting type or `enum` -> `types/`
- Database or persistence contract -> `repositories/`
- External system integration contract -> `gateways/`
- Infrastructure capability contract -> `tools/`
- Domain-specific error -> `exceptions/`
- Domain DI token -> `di.tokens.ts`
- Implementation detail -> not `domain/`; check `infra` or another layer

### Interface formatting

Separate methods in contract interfaces (`repositories/`, `gateways/`, `tools/`) with a blank line:

```ts
export interface AuthUserRepository {
  findByUserId(userId: string): Promise<UserCredentials | null>

  create(data: New<UserCredentials>): Promise<UserCredentials>

  findRefreshToken(token: string): Promise<RefreshToken | null>
}
```

### Contract method argument types

For `create` and `update` methods in contract interfaces, prefer shared generic types from `src/common/types`:

- `New<T>` — strips system fields (`id`, `createdAt`, `updatedAt`) from the model; use for `create`
- `Updatable<T>` — `Partial<New<T>>`; use for `update`

These types are built on top of `SystemFields` — also in `src/common/types`.

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

### Contract method retrieval naming

Methods in `repositories/` and `gateways/` that retrieve a single entity must follow the `find` / `get` naming convention:

| Prefix | Return type | Behavior when not found |
|---|---|---|
| `find*` | `Promise<Model \| null>` | Returns `null` |
| `get*` | `Promise<Model>` | Throws a domain exception (e.g. `NotFound`) |

Both patterns are valid. When generating new code, prefer `find*` (`findById`, `findOne`, `findBy`).

Methods that return a collection always return `Promise<Model[]>` — an empty array when nothing matches, never `null`.

Bad:

```ts
getById(id: number): Promise<Contact | null>
findAll(): Promise<Contact[] | null>
```

Good:

```ts
findById(id: number): Promise<Contact | null>
getById(id: number): Promise<Contact>
search(params: ContactSearchParams): Promise<Contact[]>
```

### `models/`

Store only business entities.

Rules:

1. Use `interface`; an `interface` in `models/` must pass the business entity checklist below
2. Keep exactly one business entity per file
3. A model may reference local supporting types from `types/` when they describe entity fields
4. Do not place helper `type`, `enum`, DTO, transport payload, repository args, gateway args, or infrastructure shapes here

Naming:

- File: `{entity}.ts` in `kebab-case` (e.g. `custom-field.ts`)
- Interface: `PascalCase` without `I` prefix (e.g. `CustomField`)

Business entity checklist:

1. The structure has standalone business meaning
2. The structure would still make sense without HTTP, SDK, ORM, or DB-specific representation
3. The structure is not created only for one method's input or output
4. The structure is not just params, payload, response, row, entity, dto, or patch data
5. The structure represents "what the business works with", not "how a specific adapter exchanges data"

Good fit: `relation.ts`, `lead.ts`, `task.ts`, `pizzeria.ts`

Bad fit: `relation-search.types.ts`, `amo-response.ts`, `create-relation.dto.ts`

#### `models/operations/`

Store pure functions that encode business rules over domain models.

Operations are immutable pure functions. They accept `Readonly<T>`, return a new object, and never mutate the input. They have no side effects except throwing domain exceptions.

If an operation changes model data, it returns the full model (`T`), not a partial object.

Create `models/operations/` only when the module has business rules that go beyond simple CRUD.

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

### `types/`

Store only supporting types.

An `interface` in `types/` is a supporting structure: method arguments, search params, composite field types, or grouped data that does not pass the business entity checklist.

Use this folder for:

1. `enum`
2. Repository method arguments
3. Gateway method arguments
4. Tool method arguments
5. Search or filter params
6. Grouped aliases and helper interfaces that are not business entities

Rules:

1. Group related supporting types in one file when they belong to the same topic
2. Do not move business entities here just because they are expressed as types
3. Prefer `New<Model>` and `Updatable<Model>` over dedicated `Create{Entity}Data` / `Update{Entity}Data` types for contract method arguments (see "Contract method argument types")

Naming:

- File: `{topic}.types.ts` in `kebab-case` (e.g. `custom-field.types.ts`, `webhook.types.ts`)
- Types: `PascalCase` with descriptive suffixes such as `Params`, `Payload`, `Filter`, `Sort`, `Item`, `Detail` (e.g. `FormRegisterParams`, `AmoCandidateData`, `MapPizzeriaItem`)

Good fit: `amo-enums.types.ts`, `field.types.ts`, `map-pizzeria.types.ts`

Bad fit: `lead.types.ts` (if `Lead` is a business entity, it belongs in `models/lead.ts`)

### `repositories/`

Store only persistence contracts.

Rules:

1. Only `interface`
2. Only for database or internal persistence access
3. Methods should accept and return `models`, local supporting types from `types/`, primitive types, or shared types from `src/common/types`
4. Never place implementation classes here
5. Prefer method names that describe business persistence intent, such as `findById`, `create`, `search`, `update`, or `delete`
6. Do not expose ORM helpers, query builders, repository instances, or persistence result wrappers

Naming:

- File: `{entity}.repository.ts` in `kebab-case` (e.g. `pizzeria.repository.ts`)
- Interface: `{Entity}Repository` (e.g. `PizzeriaRepository`)

Good fit: `pizzeria.repository.ts`, `relation.repository.ts`

Bad fit: `amo-lead.repository.ts` (amoCRM is an external API — use `gateways/`)

### `gateways/`

Store only external integration contracts.

Rules:

1. Only `interface`
2. Only for external APIs and integrations (amoCRM, HH, Pyrus, Avito, etc.)
3. Methods should accept and return `models`, local supporting types from `types/`, primitive types, or shared types from `src/common/types`
4. Never place implementation classes here
5. Prefer method names that describe business integration intent, not transport mechanics
6. Do not expose `AxiosResponse`, SDK client types, raw webhook payloads, or transport result wrappers

Naming:

- File: `{entity}.gateway.ts` in `kebab-case` (e.g. `contact.gateway.ts`, `catalog.gateway.ts`)
- Interface: `{Entity}Gateway` (e.g. `ContactGateway`, `CatalogGateway`)

Good fit: `lead.gateway.ts`, `form.gateway.ts`, `task.gateway.ts`

Bad fit: `pizzeria.gateway.ts` (if pizzeria is a local DB entity — use `repositories/`)

### `tools/`

Store only infrastructure capability contracts.

A tool contract abstracts an infrastructure capability that could be implemented entirely in-process, without calling an external system over the network. The domain needs the capability but must not know the library or algorithm behind it.

Use this folder for contracts such as:

1. Password or data hashing
2. Encryption / decryption
3. Token or code generation
4. ID generation
5. Data serialization or transformation that depends on a specific algorithm

Do NOT use this folder for:

1. Database access (use `repositories/`)
2. Communication with an identifiable external system over the network (use `gateways/`)

Rules:

1. Only `interface`
2. Methods should accept and return primitive types, `models`, local supporting types from `types/`, or shared types from `src/common/types`
3. Never place implementation classes here
4. Prefer method names that describe the capability intent, such as `hash`, `verify`, `generate`, `encrypt`, `decrypt`

Naming:

- File: `{capability}.tool.ts` in `kebab-case` (e.g. `password-hasher.tool.ts`)
- Interface: `PascalCase` describing the capability (e.g. `PasswordHasher`); a `Tool` suffix is not required when the name is already self-descriptive

Good fit: `password-hasher.tool.ts`, `token-generator.tool.ts`, `id-generator.tool.ts`

Bad fit: `auth-user.tool.ts` (if it accesses the database — use `repositories/`), `email-sender.tool.ts` (if it sends email through an external provider — use `gateways/`)

### `exceptions/`

Store domain-specific exception classes.

Rules:

1. Add this folder when the module needs explicit domain errors
2. Use only for business rule violations, invalid transitions, or missing required business state
3. Do not use for HTTP exceptions, timeouts, SDK failures, ORM failures, serialization errors, or other infrastructure errors
4. Translate infrastructure errors in the infra layer (gateway/repository implementations) or in the use case before they become domain exceptions

Naming:

- File: `{error-name}.ts` in `kebab-case` (e.g. `relation-not-found.ts`, `form-not-linked.ts`)
- Class: `{ErrorName} extends DomainException` (e.g. `RelationNotFound`, `FormNotLinked`); import `DomainException` from `src/common/exceptions`

Good fit: `relation-not-found.ts`, `form-not-linked.ts`, `interview-date-not-found.ts`

Bad fit: `api-timeout.ts`, `database-connection-error.ts` (infrastructure errors)

### `di.tokens.ts`

Store domain DI tokens only.

Rules:

1. Export a single `const` object like `RelationDomainDI`
2. Keys are `PascalCase`, values are `Symbol` with `UPPER_SNAKE_CASE` string
3. Keep tokens focused on domain contracts
4. Do not place unrelated constants here

Example:

```ts
export const AuthDomainDI = {
  AuthUserRepository: Symbol('AUTH_USER_REPOSITORY'),
  PasswordHasher: Symbol('PASSWORD_HASHER'),
  TokenGenerator: Symbol('TOKEN_GENERATOR')
} as const
```

### `index.ts`

`domain/index.ts` is the public entry point of the domain layer.

Rules:

1. Re-export the public domain API from here
2. Treat `domain/index.ts` as the public surface of the domain layer
3. If a symbol is not exported from `domain/index.ts`, treat it as internal
4. Avoid deep imports into another module's `domain/` internals

Structure:

1. First line: DI tokens export (no section header)
2. Then categorized sections, each preceded by a `/** === SectionName === */` comment
3. Blank line between sections
4. Only include sections that have exports
5. Section order:

| Order | Header | Contents |
|---|---|---|
| — | _(no header)_ | `{Module}DomainDI` from `./di.tokens` |
| 1 | `/** === Models === */` | Business entities from `models/` |
| 2 | `/** === Operations === */` | Pure business rule functions from `models/operations/` |
| 3 | `/** === Repositories === */` | Persistence contracts from `repositories/` |
| 4 | `/** === Gateways === */` | External integration contracts from `gateways/` |
| 5 | `/** === Tools === */` | Infrastructure capability contracts from `tools/` |
| 6 | `/** === Types === */` | Supporting types from `types/` |
| 7 | `/** === Exceptions === */` | Domain exceptions from `exceptions/` |

Example:

```ts
export { AuthDomainDI } from './di.tokens'

/** === Models === */
export type { UserCredentials } from './models/user-credentials'
export type { RefreshToken } from './models/refresh-token'

/** === Repositories === */
export type { AuthUserRepository } from './repositories/auth-user.repository'

/** === Tools === */
export type { PasswordHasher } from './tools/password-hasher.tool'

/** === Types === */
export type { UserTokens, JwtPayload } from './types/auth.types'

/** === Exceptions === */
export { InvalidCredentials } from './exceptions/invalid-credentials'
export { EmailAlreadyExists } from './exceptions/email-already-exists'
export { InvalidRefreshToken } from './exceptions/invalid-refresh-token'
```

## Contract Classification Guide

When deciding where a contract belongs, ask these questions in order:

1. Does it read or write data to a database or persistent store? → `repositories/`
2. Does it communicate with an identifiable external system over the network? → `gateways/`
3. Does it provide an infrastructure capability that can run entirely in-process? → `tools/`

| Signal | Folder | Example |
|---|---|---|
| SQL, ORM, cache, file storage as persistence | `repositories/` | `AuthUserRepository` |
| HTTP API, webhook, SDK for third-party service | `gateways/` | `PaymentGateway` |
| Crypto, hashing, token generation, encoding | `tools/` | `PasswordHasher` |

## Implementation Naming

Implementation classes in `infra/` must include the library or technology name instead of a generic `Impl` suffix.
This makes explicit which dependency backs the contract and simplifies searching when multiple implementations exist.

Pattern: `{ContractName}` (domain interface) → `{Entity}{Library}{ContractSuffix}` (infra class)

### Repositories

The technology folder (`infra/prisma/`, `infra/drizzle/`, etc.) already provides context, so the file name does not repeat it.

| Domain interface | Implementation class | File path |
|---|---|---|
| `AuthUserRepository` | `AuthUserPrismaRepository` | `infra/prisma/auth-user.repository.ts` |
| `TaskRepository` | `TaskPrismaRepository` | `infra/prisma/task.repository.ts` |

### Gateways

Same rule — the technology folder provides context.

| Domain interface | Implementation class | File path |
|---|---|---|
| `StorageGateway` | `StorageS3Gateway` | `infra/s3/storage.gateway.ts` |
| `ContactGateway` | `ContactAxiosGateway` | `infra/axios/contact.gateway.ts` |

### Tools

Tools have capability-based names without a fixed suffix, so the technology is part of the file name (mirrors the class name).

| Domain interface | Implementation class | File path |
|---|---|---|
| `PasswordHasher` | `BcryptPasswordHasher` | `infra/bcrypt/bcrypt-password-hasher.ts` |
| `TokenGenerator` | `JwtTokenGenerator` | `infra/jwt/jwt-token-generator.ts` |

### Rules

1. Never use `Impl` suffix — always name the specific technology
2. For repositories and gateways: the library name goes between the entity name and the contract suffix (`AuthUser` + `Prisma` + `Repository`); the file name omits the technology because the parent folder already provides it
3. For tools: the library becomes a prefix of the capability name (`Bcrypt` + `PasswordHasher`); the file name includes the technology because there is no fixed suffix to anchor on

Bad:

```ts
export class AuthUserRepositoryImpl implements AuthUserRepository {}
export class StorageGatewayImpl implements StorageGateway {}
export class PasswordHasherImpl implements PasswordHasher {}
```

Good:

```ts
export class AuthUserPrismaRepository implements AuthUserRepository {}
export class StorageS3Gateway implements StorageGateway {}
export class BcryptPasswordHasher implements PasswordHasher {}
```

## Import Rules

Inside `src/modules/{moduleName}/domain/**`, prefer only these imports:

1. Neighbor files from the same module's `domain/`
2. Shared types from `src/common/types`
3. Public exports of another module when a true cross-module domain dependency is required

Import path style:

1. Always verify that import paths are correct before saving
2. Use the shortest available path without sacrificing readability — prefer barrel (`index.ts`) re-exports over deep file paths when a barrel exists
3. `import { New } from '@common/types'` — good (short, uses barrel)
4. `import { New } from '@common/types/new.type'` — bad (unnecessarily deep when barrel re-exports it)

Forbidden imports:

1. Anything from `infra/**`
2. Anything from `use-cases/**`
3. Controllers, Nest modules, cron classes, or transport adapters
4. Framework or library types such as `@nestjs/*`, `axios`, `typeorm`, `class-validator`, and `class-transformer`
5. Deep imports into another module's internal files when a public export exists
6. Importing from the same module's own `domain/index.ts` or module `index.ts` instead of local domain files

## Boundary Mapping

Mapping belongs at the boundary, not in domain contracts.

1. Webhook payloads, HTTP responses, SDK objects, ORM entities, and DB rows are not domain models
2. Convert those shapes before they enter domain contracts or use cases
3. Do not mirror a transport or persistence shape in `models/` just because it is convenient
4. If a structure keeps transport-specific field names only to match an external system, it belongs outside `models/`
5. Repository and gateway interfaces must expose domain-oriented shapes, not adapter-oriented shapes

## Workflow

When creating or refactoring domain code, follow this order:

1. Search for an existing `model`, `type`, contract, or exception before creating a new file; prefer one canonical name per concept
2. Classify the artifact using the checklist at the top of Folder Rules
3. Verify that imports stay within allowed domain boundaries
4. Check whether a transport or persistence shape must be mapped before it reaches `domain/`
5. Export the public symbol through `domain/index.ts` when it is part of the domain API
6. When refactoring, preserve observable behavior unless the user asked for behavior changes
7. Do not copy an existing structural mistake into new code; move misplaced artifacts when the task justifies it

## Anti-Patterns

These mistakes are not obvious from the rules above:

1. Creating a `repository` for an external API (amoCRM, HH, Pyrus, Avito) or a `gateway` for database access — repositories are for persistence, gateways are for external integrations
2. Using technical method names such as `sendRequest`, `callApi`, `runQuery`, or `executeSql` in domain contracts — prefer business-intent names
3. Using `any`, `unknown`, or `Record<string, unknown>` as a lazy escape hatch in domain contracts
4. Turning infrastructure failures (timeouts, connection errors, SDK exceptions) into domain exceptions — translate them at the boundary
5. Creating duplicate concepts with names like `Lead`, `LeadModel`, `LeadData`, and `LeadPayload` for the same business meaning — prefer one canonical name
6. Placing a local infrastructure capability (hashing, token generation) in `gateways/` or `repositories/` — if the capability does not require network access or persistence, it belongs in `tools/`
7. Creating dedicated `CreateXData` or `UpdateXData` types when `New<Model>` or `Updatable<Model>` would suffice
