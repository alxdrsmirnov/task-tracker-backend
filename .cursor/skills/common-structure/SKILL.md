---
name: common-structure
description: Organizes `src/common/` by architectural layers and keeps shared code boundaries clean. Use when creating or refactoring files inside `common/`, deciding where shared (cross-module) code belongs, or working with `common`, `shared`, `utils`, `validators`, `decorators`, `exceptions`, `types`, or `infra` in the shared kernel.
---

# Common Structure

## Cheat Sheet

- `src/common/` hosts shared (cross-module) primitives only.
- Subfolders: `exceptions/`, `types/`, `utils/`, `validators/`, `decorators/`, `infra/`.
- `infra/` is split by technology: `prisma/` (the ORM in use). Other infra layers (`redis/`, `context/`) are optional examples — add them only when the technology is actually present.
- Each folder has `index.ts` barrel. Import via `@common/{folder}` — never via deep paths.
- Base `DomainException` signature: `super({ code, message, cause?, metadata? })`.
- Module-specific domain exceptions stay in `modules/{m}/domain/exceptions/`, NOT here.
- Prisma model files live under `common/infra/prisma/models/`, NOT inside module `domain/`.
- HTTP is TOP-LEVEL (`src/http`) — not in `common/`. Other transport/execution layers (`queue/`, `cron/`, `ws/`) are also top-level, added only when needed.

## Goal

`common/` holds only primitives that cross module boundaries. Group by **architectural layer** (shared kernel vs. infra technology), not by technical role.

## Target Shape

```
src/
  common/
    exceptions/          # DomainException, DtoFailed
    types/               # generics, enums, paginated-result, utils.types
    utils/               # pure helpers (deepMerge)
    validators/          # class-validator helpers (IsNullable)
    decorators/          # cross-cutting method decorators (ValidateDto)
    infra/
      prisma/            # PrismaModule, PrismaService, PrismaConnector, models/, schema.prisma, migrations/, TransactionRunner, TransactionContext
  http/                  # top-level — controllers, filters, guards, pipes, templates, transforms
  modules/               # business modules
  app.module.ts
  main.ts
```

### Optional infra layers (examples)

These follow the same pattern as `infra/prisma/` — each technology gets its own folder with `index.ts` and NestJS module. Add only when the technology is actually present in the project:

```
  common/
    infra/
      redis/             # RedisModule, RedisConnector (optional)
      context/           # AuthContext, ClientContext, LogContext, ContextModule — CLS-based (optional)
```

### Optional top-level layers (examples)

Transport / execution slices live directly under `src/`, not under `src/common/`. Add only when needed:

```
  queue/                 # BullMQ queue and workers (optional)
  cron/                  # scheduled tasks (optional)
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
| Prisma module / service / connector / models / migrations / transaction runner | `common/infra/prisma/` |
| HTTP controller / filter / guard / pipe | `src/http/` (top-level) |
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

#### `infra/prisma/`

Prisma is the ORM used in this project. The folder hosts:

- `prisma.module.ts` — `PrismaModule` (NestJS global module for DB connection).
- `prisma.service.ts` — `PrismaService` (wraps PrismaClient, accessible via `this.prisma.db`).
- `prisma.connector.ts` — `PrismaConnector` (manages connection lifecycle: connect/disconnect hooks).
- `models/*.prisma` — Prisma model files, grouped by domain.
- `schema.prisma` — root Prisma schema that references model files via `include`.
- `migrations/` — Prisma migration history.
- `transaction.runner.ts` — `TransactionRunner.run(async () => ...)` for wrapping logic in a DB transaction.
- `transaction-context.ts` — `TransactionContext` (CLS-based, tracks the active Prisma transaction).

Why Prisma models live in `common/infra/prisma/models/` and not inside modules: Prisma models reference each other through relations across module boundaries. Keeping them central avoids circular imports between modules.

Other ORMs would follow the same pattern: `common/infra/{orm}/` with the ORM-specific helpers inside.

### Top-level layers — NOT in `common/`

These live directly under `src/`, not under `src/common/`:

- `src/http/` — HTTP transport: controllers, filters, guards, pipes, templates, transforms.
- `src/queue/` — BullMQ queue (optional).
- `src/cron/` — scheduled tasks (optional).

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
| Prisma module / service / connector / transaction runner | `@common/infra/prisma` |

Good:

```ts
import type { New } from '@common/types'
import { DomainException } from '@common/exceptions'
import { TransactionRunner } from '@common/infra/prisma'
import { PrismaService } from '@common/infra/prisma'
```

Bad:

```ts
import type { New } from '@common/types/generics'           // deep path — use barrel
import { DomainException } from '@common/exceptions/domain.exception'
import { PrismaService } from '@common/infra/prisma/prisma.service'
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
3. Putting Prisma models inside `modules/{m}/domain/` — they belong to `common/infra/prisma/models/`.
4. Putting module-specific domain exceptions into `common/exceptions/` — only base/cross-cutting errors live there.
5. Creating empty NestJS modules for a single provider — register the provider directly in the technology's infra module.
6. Importing from deep paths when a barrel re-exports the symbol.
7. Re-exporting symbols from one `common/` subfolder through another subfolder's `index.ts` — each barrel exports only its own content.

## Checklist

- [ ] File is placed in the folder that matches its classification (see table above).
- [ ] Import path uses `@common/{folder}` barrel, not a deep path.
- [ ] Prisma models are NOT inside `modules/*/domain/`.
- [ ] Module-specific domain exceptions are NOT in `common/exceptions/`.
- [ ] `common/` root has no orphan standalone files.
- [ ] HTTP / queue / cron code is NOT in `common/`.
- [ ] Each new `common/` subfolder has an `index.ts` barrel.
