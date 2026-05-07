---
name: common-structure
description: Organizes `src/common/` by architectural layers and keeps shared code boundaries clean. Use when creating or refactoring files inside `common/`, deciding where shared (cross-module) code belongs, or working with `common`, `shared`, `utils`, `validators`, `decorators`, `exceptions`, `types`, or `infra` in the shared kernel.
---

# Common Structure

## Cheat Sheet

- `src/common/` hosts shared (cross-module) primitives only.
- Subfolders: `exceptions/`, `types/`, `utils/`, `validators/`, `decorators/`, `infra/`.
- `infra/` is split by technology: `typeorm/`, `redis/`, `context/`.
- Each folder has `index.ts` barrel. Import via `@common/{folder}` — never via deep paths.
- Base `DomainException` signature: `super({ code, message, cause?, metadata? })`.
- Module-specific domain exceptions stay in `modules/{m}/domain/exceptions/`, NOT here.
- ORM entity classes live under `common/infra/typeorm/entities/{domain}/*`, NOT inside module `domain/`.
- HTTP / queue / cron are TOP-LEVEL (`src/http`, `src/queue`, `src/cron`) — not in `common/`.

## Goal

`common/` holds only primitives that cross module boundaries. Group by **architectural layer** (shared kernel vs. infra technology), not by technical role.

## Target Shape

```text
src/
  common/
    exceptions/          # DomainException, DtoFailed
    types/               # generics, enums, paginated-result, utils.types
    utils/               # pure helpers (deepMerge)
    validators/          # class-validator helpers (IsNullable)
    decorators/          # cross-cutting method decorators (ValidateDto)
    infra/
      typeorm/           # TypeormModule, entities/, TransactionRunner, 
      redis/             # RedisModule, RedisConnector
      context/           # AuthContext, ClientContext, LogContext, ContextModule (CLS)
  http/                  # top-level — controllers, filters, guards, pipes, templates, transforms
  queue/                 # top-level — BullMQ queue and workers
  cron/                  # top-level — scheduled tasks
  modules/               # business modules
  app.module.ts
  main.ts
```

## Folder Rules

### Classification table

| Artifact | Folder |
| --- | --- |
| Base / cross-cutting exception (`DomainException`, `DtoFailed`) | `common/exceptions/` |
| Shared type, enum, generic (`New<T>`, `Platform`, `PaginatedResult`) | `common/types/` |
| Pure helper, no I/O (`deepMerge`) | `common/utils/` |
| Reusable `class-validator` helper (`IsNullable`) | `common/validators/` |
| Cross-cutting method decorator (`ValidateDto`) | `common/decorators/` |
| TypeORM module / entities / transaction / repository manager | `common/infra/typeorm/` |
| Redis module / connector | `common/infra/redis/` |
| CLS context (auth / client / log) | `common/infra/context/` |
| HTTP controller / filter / guard / pipe | `src/http/` (top-level) |
| Queue worker / service | `src/queue/` (top-level) |
| Cron task | `src/cron/` (top-level) |
| Module-specific domain exception (`ClientNotFound`) | `modules/{m}/domain/exceptions/` — NOT here |

### `exceptions/`, `types/`, `utils/`, `validators/`, `decorators/`

1. Each folder has `index.ts` barrel.
2. `exceptions/` — only `DomainException` (base class) and cross-cutting app errors (`DtoFailed`). Module errors live in their module.
3. `types/` — shared enums, generics, and cross-module shapes. Current content: `generics.ts` (`SystemFields`, `New<T>`, `Updatable<T>`), `enums.ts` (`Platform`, `AmoEntity`), `paginated-result.ts`, `utils.types.ts` (`DeepPartial`, `ConvertPropsTo`, `NonNullableObject`).
4. `utils/` — pure helpers with no I/O, no Nest DI, no HTTP clients.
5. `validators/` — reusable `class-validator` decorators shared across module DTOs.
6. `decorators/` — NestJS/class method decorators shared across modules.

### `infra/` — split by technology

1. Each technology has its own folder with its own `index.ts` and NestJS module.
2. Folder name = technology name. Consumers import via `@common/infra/{name}`.
3. Infrastructure helpers tied to a specific technology live next to it — don't create an orphan shared folder.

#### `infra/typeorm/`

TypeORM is the ORM used in this project. The folder hosts:

- `typeorm.module.ts` — `TypeormModule` (NestJS global module for DB connection).
- `entities/{domain}/*.ts` — ORM entity classes, grouped by business domain (`auth/`, `client/`, `parser/`, `log/`, `dictionary/`, `amo/`).
- `transaction.runner.ts` — `TransactionRunner.run(async () => ...)` for wrapping logic in a DB transaction.
- `transaction-context.ts` — `TransactionContext` (CLS-based, tracks the active EntityManager).
- `repository.manager.ts` — `RepositoryManager` — a façade that exposes typed TypeORM repositories (`repository.client`, `repository.clientAuth`, etc.).

Why entities live in `common/infra/typeorm/entities/` and not inside modules: ORM entities reference each other through relations across module boundaries. Keeping them central avoids circular imports between modules.

Other ORMs (Prisma, Drizzle, etc.) would follow the same pattern: `common/infra/{orm}/` with the ORM-specific helpers inside. In this project, only TypeORM exists.

#### `infra/redis/`

- `redis.module.ts` — `RedisModule`.
- `redis.connector.ts` — `RedisConnector`.

#### `infra/context/`

CLS-based request-scoped contexts, backed by `nestjs-cls`. These replace passing cross-cutting data (current client, auth, log id) through method parameters.

- `auth.context.ts` — `AuthContext` — current `ClientAuth`.
- `client.context.ts` — `ClientContext` — current `Client`.
- `log.context.ts` — `LogContext` — current log ids (`resumeLogId`, `unloadLogId`).
- `context.module.ts` — `ContextModule` (global Nest module).

Guidance: inject a context into a repository / gateway / use-case instead of requiring the caller to pass `clientId`, `userId`, or similar values.

### Top-level layers — NOT in `common/`

These live directly under `src/`, not under `src/common/`:

- `src/http/` — HTTP transport: controllers, filters, guards, pipes, templates, transforms.
- `src/queue/` — BullMQ queue (`queue.service.ts`, `queue-manager.ts`, `workers/`).
- `src/cron/` — scheduled tasks (`cron.module.ts`, `tasks/`).

Reason: they are execution/transport slices of the application, not shared primitives. A typical `common/` primitive has no business logic and no runtime responsibility; HTTP / queue / cron do.

When the skill says "shared infra lives in `common/infra/`", it means **technologies consumed by many modules** (DB, cache, CLS). Transport and execution layers don't fit there.

## Import Paths

Consumers use these paths (always via the barrel, never deep):

| What | Import path |
| --- | --- |
| Shared types, enums, generics | `@common/types` |
| `DomainException`, `DtoFailed` | `@common/exceptions` |
| Pure helpers (`deepMerge`) | `@common/utils` |
| `ValidateDto` | `@common/decorators` |
| `IsNullable` | `@common/validators` |
| TypeORM module / entities / transaction / repo manager | `@common/infra/typeorm` |
| TypeORM entity classes by domain | `@common/infra/typeorm/entities/{domain}` |
| Redis | `@common/infra/redis` |
| CLS contexts (`AuthContext`, `ClientContext`, `LogContext`) | `@common/infra/context` |

Good:

```ts
import type { New } from '@common/types'
import { DomainException } from '@common/exceptions'
import { TransactionRunner } from '@common/infra/typeorm'
import { AuthContext } from '@common/infra/context'
```

Bad:

```ts
import type { New } from '@common/types/generics'           // deep path — use barrel
import { DomainException } from '@common/exceptions/domain.exception'
import { AuthContext } from '@common/infra/context/auth.context'
```

## DomainException

The base class lives in `@common/exceptions`. Its constructor accepts an object, not a string.

```ts
export abstract class DomainException extends Error {
  constructor(params: { code: string; message: string; cause?: Error; metadata?: Record<string, unknown> }) {
    super(params.message, params.cause ? { cause: params.cause } : undefined)
    this.name = new.target.name
    this.code = params.code
    this.metadata = params.metadata
    Error.captureStackTrace?.(this, new.target)
  }

  public readonly code: string
  public readonly metadata?: Record<string, unknown>
}
```

Subclassing pattern is defined in the `domain-structure` skill — see `exceptions/` section there.

## Anti-Patterns

1. Placing standalone files in the root of `common/` (`di.tokens.ts`, `utils.ts`, `helpers.ts`) — classify the artifact and put it in the corresponding folder.
2. Putting HTTP / queue / cron code into `common/infra/` — those are top-level layers.
3. Putting ORM entity classes inside `modules/{m}/domain/` — they belong to `common/infra/typeorm/entities/`.
4. Putting module-specific domain exceptions into `common/exceptions/` — only base/cross-cutting errors live there.
5. Creating empty NestJS modules for a single provider — register the provider directly in the technology's infra module.
6. Importing from deep paths when a barrel re-exports the symbol.
7. Re-exporting symbols from one `common/` subfolder through another subfolder's `index.ts` — each barrel exports only its own content.

## Checklist

- [ ] File is placed in the folder that matches its classification (see table above).
- [ ] Import path uses `@common/{folder}` barrel, not a deep path.
- [ ] ORM entity classes are NOT inside `modules/*/domain/`.
- [ ] Module-specific domain exceptions are NOT in `common/exceptions/`.
- [ ] `common/` root has no orphan standalone files.
- [ ] HTTP / queue / cron code is NOT in `common/`.
- [ ] Each new `common/` subfolder has an `index.ts` barrel.
