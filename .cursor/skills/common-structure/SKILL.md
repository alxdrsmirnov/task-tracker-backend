---
name: common-structure
description: Organizes `src/common/` by architectural layers and keeps shared code boundaries clean. Use when creating or refactoring files inside `common/`, deciding where shared code belongs, or working with `domain/`, `use-cases/`, `infra/`, `http/` inside `common/`.
---

# Common Structure

## Scope

Apply this skill when at least one of these signals is present:

1. The work touches `src/common/**`
2. The task is to create or refactor `common/` structure
3. The task requires deciding where shared (cross-module) code belongs
4. The task mentions shared exceptions, types, filters, decorators, or DI tokens

## Goal

`common/` mirrors the layered structure of modules. A developer opens `common/domain/` and sees only domain contracts, opens `common/http/` and sees only HTTP-specific things.

Group by **architectural layer** (domain, application, infrastructure, transport), not by **technical role** (decorators, filters, exceptions).

## Target Shape

```text
common/
  domain/
    index.ts              # required
    di.tokens.ts          # when shared DI tokens exist
    exceptions/           # base domain exception classes
    types/                # shared domain types and utility generics
  use-cases/
    index.ts              # required
  infra/
    prisma/               # one folder per technology
  http/
    filters/              # HTTP exception filters
    guards/               # when HTTP guards appear
    interceptors/         # when HTTP interceptors appear
```

## Folder Rules

Before creating a file in `common/`, classify the artifact:

| Artifact | Layer | Folder |
| --- | --- | --- |
| Base domain exception class | domain | `domain/exceptions/` |
| Shared domain type (`New<T>`, `TransactionRunner`) | domain | `domain/types/` |
| Shared DI token | domain | `domain/di.tokens.ts` |
| Use-case decorator or utility | use-cases | `use-cases/` |
| Application-level exception (`DtoValidationFailed`) | use-cases | `use-cases/` |
| Infrastructure implementation (Prisma, Redis) | infra | `infra/{technology}/` |
| Infrastructure helper tied to a specific technology | infra | `infra/{technology}/` |
| HTTP exception filter | http | `http/filters/` |
| HTTP guard | http | `http/guards/` |
| HTTP interceptor | http | `http/interceptors/` |
| WS-specific filter or guard | ws | `ws/filters/` or `ws/guards/` |

### `domain/`

1. `domain/index.ts` is required — it is the public entry point for shared domain code
2. `domain/exceptions/` — only base exception classes that module domain exceptions extend (e.g. `DomainException`)
3. `domain/types/` — shared types and utility generics used by multiple module domains (e.g. `New<T>`, `TransactionRunner`)
4. `domain/di.tokens.ts` — DI tokens for shared contracts (e.g. `TransactionRunner`)
5. Module-specific domain exceptions (`EmailAlreadyExists`, `InvalidCredentials`) do NOT belong here — they stay in the module's own `domain/exceptions/`

### `use-cases/`

1. `use-cases/index.ts` is required
2. Shared utilities used by use cases across multiple modules live here
3. Application-level exceptions (not domain) also live here (e.g. `DtoValidationFailed`)
4. File suffixes: `.exception.ts` for exceptions, `.decorator.ts` for decorators

### `infra/`

1. Each technology gets its own subfolder: `infra/prisma/`, `infra/redis/`
2. Infrastructure helpers tied to a specific technology live next to it, not in a separate shared folder
3. `index.ts` inside `infra/{technology}/` exports **only its own** artifacts — no re-exports from parent folders
4. NestJS infrastructure modules (e.g. `PrismaModule`) live inside their technology folder

### `http/`

1. Only HTTP-specific artifacts: exception filters, guards, interceptors, pipes
2. Subfolders by purpose: `http/filters/`, `http/guards/`
3. When WS transport appears — analogous structure under `ws/`

## Import Paths

Consumers of `common/` use these import paths:

| What | Import path |
| --- | --- |
| Domain types, exceptions, DI tokens | `@common/domain` |
| Use-case utilities (`ValidateDto`, `DtoValidationFailed`) | `@common/use-cases` |
| Infrastructure (`PrismaDb`, `PrismaModule`) | `@common/infra/prisma` |
| HTTP filters | `@common/http/filters` |

Prefer barrel (`index.ts`) imports over deep file paths.

## Anti-Patterns

1. Creating folders by technical role (`decorators/`, `filters/`, `exceptions/`) instead of by layer
2. Placing standalone files in the root of `common/` (`di.tokens.ts`, `utils.ts`) — determine the layer and place in the corresponding folder
3. Re-exporting from `infra/{technology}/index.ts` artifacts that belong to parent folders (`../../di.tokens`, `../../context`)
4. Creating empty NestJS modules for single-class providers — register directly in the technology's infra module
5. Creating a separate folder for a single class used only within a specific technology (e.g. `context/TransactionContext` should live in `infra/prisma/`)
6. Mixing artifacts from different layers in one folder (domain exceptions + application exceptions)
