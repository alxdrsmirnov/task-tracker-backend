---
name: domain-structure
description: Organizes `src/modules/{moduleName}/domain/` and keeps domain boundaries clean. Use when creating or refactoring a domain folder, deciding where domain code belongs, or working with `domain`, `domain folder`, `domain layer`, `model`, `models`, `repository`, `repositories`, `gateway`, `gateways`, `tools`, `types`, or `exceptions` inside a module.
---

# Module Domain Structure

## Cheat Sheet

- Required files: `domain/index.ts`, `domain/{module}.domain.module.ts`, `domain/models/` (≥1 entity).
- Optional folders: add only when you have the artifact to put inside.
- `repositories/`, `gateways/`, `tools/` — concrete `@Injectable()` classes. Interfaces only for polymorphism.
- `{module}.domain.module.ts` — NestJS `@Module` that registers and exports all domain providers.
- `DomainException` constructor: `super({ code, message, cause?, metadata? })`.
- Exception file names: no `Exception` suffix — `client-not-found.ts`, class `ClientNotFound`.
- Exception messages: Russian. Code: `UPPER_SNAKE_CASE`.
- `create` / `update` method signatures: prefer `New<Model>` / `Updatable<Model>` from `@common/types`.
- Models are `interface` (TS), NOT Prisma model classes. Prisma models live in `common/infra/prisma/models/`.

## Goal

`domain/` is predictable and business-oriented. A developer opens `domain/` and immediately sees:

1. Business entities in `models/`
2. Persistence access in `repositories/`
3. External integrations in `gateways/`
4. In-process capabilities in `tools/`
5. Supporting types in `types/`
6. Domain errors in `exceptions/`
7. Public API in `domain/index.ts`
8. DI wiring in `{module}.domain.module.ts`

## Target Shape

```text
domain/
  index.ts                      # required — public API
  {module}.domain.module.ts     # required — NestJS @Module
  models/                       # required — business entities (interface)
    defaults/                   # optional — default instances for models
  types/                        # optional — supporting types / enums
  repositories/                 # optional — @Injectable() persistence classes
  gateways/                     # optional — @Injectable() external integration classes
    types/                      # optional — shapes specific to external APIs
  tools/                        # optional — @Injectable() in-process capabilities
  exceptions/                   # optional — domain errors
  constants.ts                  # optional — module-level constants
```

Minimum viable domain:

```text
domain/
  index.ts
  {module}.domain.module.ts
  models/
    {entity}.ts
```

Add folders only when the module has the corresponding artifact. A module without external APIs has no `gateways/`. A module without DB access has no `repositories/`. Empty / "just-in-case" folders are noise.

## `{module}.domain.module.ts` — required

Every module's `domain/` has a NestJS module that registers and exports the module's providers (repositories, gateways, tools).

Example:

```ts
import { Module } from '@nestjs/common'
import { ClientRepository } from './repositories/client.repository'

@Module({
  providers: [ClientRepository],
  exports: [ClientRepository]
})
export class ClientDomainModule {}
```

Rules:

1. One file per module: `{module}.domain.module.ts`.
2. Class name: `{Module}DomainModule` (e.g. `ClientDomainModule`, `AuthDomainModule`).
3. Register every `@Injectable()` class from `repositories/`, `gateways/`, `tools/`.
4. Export everything that neighboring modules need to inject.
5. The module is NOT re-exported from `domain/index.ts` — neighbors import it directly: `import { ClientDomainModule } from '@modules/client/domain/client.domain.module'`.

## Folder Rules

### Classification table

| Artifact | Folder | Example |
| --- | --- | --- |
| Business entity | `models/` | `client.ts` → `interface Client` |
| Supporting type / `enum` | `types/` | `client.types.ts` |
| Persistence class | `repositories/` | `client.repository.ts` → `class ClientRepository` |
| External integration class | `gateways/` | `amo-auth.gateway.ts` → `class AmoAuthGateway` |
| In-process capability class | `tools/` | `upload.logger.ts` → `class UploadLogger` |
| Domain error | `exceptions/` | `client-not-found.ts` → `class ClientNotFound` |
| Default model instance | `models/defaults/` | `amo-auth.default.ts` → `export const amoAuthDefault` |
| Module-level const array / enum map | `constants.ts` at domain root | `TextTypes`, `NumericTypes` |
| Business scenario (use case) | `src/modules/{m}/use-cases/` | `create-client.case.ts` |
| HTTP controller / filter / guard | `src/http/` | — |
| BullMQ worker | `src/queue/workers/` | — |
| Cron task | `src/cron/tasks/` | — |
| Prisma model | `src/common/infra/prisma/models/` | `user.prisma` |

### `models/`

Store business entities as TypeScript `interface`.

Rules:

1. One entity per file. Filename: `{entity}.ts` in kebab-case. Interface name: `PascalCase` without `I` prefix.
2. Models do NOT extend Prisma model types. Prisma mapping lives in `common/infra/prisma/models/`.
3. A model may reference local supporting types from `types/`.
4. Do not place helper types, DTOs, transport payloads, search params, or repository args here.

Good: `client.ts`, `parser.ts`, `client-auth.ts`.
Bad: `client-search.types.ts`, `create-client.dto.ts`, `amo-lead-response.ts`.

### `models/defaults/` (optional)

Default model instances — exported typed constants.

```ts
import type { AmoAuth } from '../amo-auth'

export const amoAuthDefault: AmoAuth = {
  domain: null,
  accessToken: null,
  credentials: { clientId: null, clientSecret: null, redirectUri: null }
}
```

File naming: `{entity}.default.ts`. Constant: `{entity}Default`.

### `constants.ts` — at domain root

Use for module-level constants (const arrays, enum maps, frozen configs). Keep at the domain root when there is a single file; if the number grows — split into a folder.

Example: `amo/domain/constants.ts` exports `TextTypes`, `NumericTypes`, `DateTypes`, etc.

### `types/`

Store supporting types: enums, repository / gateway method args, search params, filter shapes, composite helpers.

Rules:

1. Group related types per topic in one file: `{topic}.types.ts` or `index.ts`.
2. Types are `type` aliases or `enum`s. If a shape qualifies as a business entity, move it to `models/`.
3. For repository `create` / `update` args, prefer `New<Model>` / `Updatable<Model>` from `@common/types`:

   ```ts
   public async create(data: New<Client>): Promise<Client>
   public async update(client: Client): Promise<Client>
   ```

   `New<T>` strips `id`, `createdAt`, `updatedAt`. `Updatable<T>` is `Partial<New<T>>`. Use dedicated `CreateXData` / `UpdateXData` only when generic composition becomes unreadable.
4. Subfolders `types/{platform}` (e.g. `types/hh`, `types/avito`) are OK when entities have platform-specific variants.

Good: `client.types.ts` (`ClientFindParams`, `ClientSearchParams`), `custom-field.types.ts`.
Bad: `client.types.ts` containing the business entity itself.

### `repositories/` — concrete `@Injectable()` classes

The persistence contract in this project is a concrete class (not an `interface`). It injects `PrismaService` from `@common/infra/prisma` and exposes domain-oriented methods. Prisma rows are converted to domain models via a private `toDomain` mapper — never returned raw.

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@common/infra/prisma'
import type { New } from '@common/types'
import type { User } from '../models/user'

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async findById(id: number): Promise<User | null> {
    const user = await this.prisma.db.user.findUnique({ where: { id } })
    return user ? this.toDomain(user) : null
  }

  public async create(data: New<User>): Promise<User> {
    const user = await this.prisma.db.user.create({ data })
    return this.toDomain(user)
  }

  public async update(user: User): Promise<User> {
    const { id, ...data } = user
    const updated = await this.prisma.db.user.update({ where: { id }, data })
    return this.toDomain(updated)
  }

  public async delete(id: number): Promise<void> {
    await this.prisma.db.user.delete({ where: { id } })
  }

  private toDomain(user: User): User {
    return user
  }
}
```

Rules:

1. File: `{entity}.repository.ts`. Class: `{Entity}Repository`. No `Impl` / `Prisma` suffix.
2. Accept and return `models` / local `types` / primitives / shared types from `@common/types`. Never expose Prisma types.
3. Map Prisma → domain via a private `toDomain(row)` method. Even when the shapes coincide today, keep the mapper — it's the anchor for future divergence.
4. Access Prisma via `this.prisma.db` (not `this.prisma` directly).
5. Method naming:
   - `find*` / `get*` → single entity, may return `T | null`.
   - `list*` → collection with a business scope (`listEnabled`, `listByClientId`). Returns `T[]`, never `null`.
   - `search*` → filtered query with params. Returns `T[]` or `PaginatedResult<T>`.
   - `create` / `update` / `delete` — standard CRUD.
6. Methods separated by one blank line; private helpers (`toDomain`, `relations`) at the bottom.

### `gateways/` — concrete `@Injectable()` classes

External API integrations. The constructor injects an HTTP connector (a small `@Injectable()` class that encapsulates `baseURL`, headers, retry, rate-limiting — analogous to `PrismaService` in the persistence layer) and, when the API is per-client, an `AuthContext` from `@common/infra/context`.

```ts
import { Injectable } from '@nestjs/common'
import { AuthContext } from '@common/infra/context'
import { AmoConnector } from '../connectors/amo.connector'
import type { AmoAuth } from '../models/amo-auth'

@Injectable()
export class AmoAuthGateway {
  constructor(
    private readonly authContext: AuthContext,
    private readonly connector: AmoConnector
  ) {}

  public async authorize(code: string): Promise<AmoAuth> {}

  public async checkAuth(): Promise<boolean> {
    const api = this.connector.createApi(this.authContext.auth)
    await api.get('/account')
    return true
  }
}
```

Rules:

1. File: `{entity}.gateway.ts`. Class: `{Entity}Gateway` (e.g. `AmoAuthGateway`, `HhResumeGateway`). No `Impl` / `Axios` suffix.
2. Constructor injects the HTTP connector (`AmoConnector`, `HhConnector`, `AvitoConnector`, or an SDK client). Do NOT create raw `axios.create(...)` inline in the gateway — extract to a connector.
3. Method names describe business intent: `authorize`, `checkAuth`, `getWithContacts`. Not `sendRequest`, `callApi`.
4. Accept and return `models` / local `types` / primitives. Never expose `AxiosResponse`, SDK types, or raw webhook payloads — map at the boundary.
5. Gateway-specific external shapes go in `gateways/types/` (or `gateways/types/{platform}/` for multiple platforms).

### `gateways/types/` (optional)

Shapes of the external API (request/response payloads). Kept next to the gateway instead of in the top-level `types/` to make the boundary explicit.

### `tools/`

In-process infrastructure capabilities — classes that do not hit an external system and are not persistence. Examples: password hashing, encryption, token generation, ID generation, CLS-buffered logging.

```ts
import { Injectable } from '@nestjs/common'
import * as bcrypt from 'bcrypt'

@Injectable()
export class PasswordHasher {
  private readonly rounds = 10

  public async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds)
  }

  public async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }
}
```

Rules:

1. File: `{capability}.tool.ts` or `{capability}.{role}.ts` (e.g. `password-hasher.tool.ts`, `upload.logger.ts`). Class: `PascalCase` describing the capability (`PasswordHasher`, `UploadLogger`, `TokenGenerator`). No fixed suffix required.
2. Do not use `tools/` for things that belong in `repositories/` (DB) or `gateways/` (external API).
3. A tool may inject `@common/infra/context` CLS contexts when the capability is request-scoped (e.g. `UploadLogger` buffers steps per request).

### Interface usage — when it's allowed

Default is a concrete `@Injectable()` class. An `interface` is allowed only when the same contract has multiple concrete implementations that vary by a type parameter.

Current example:

```ts
// resume/domain/gateways/types/resume.gateway.ts
export interface ResumeGateway<Resume> {
  getWithContacts(resume: Resume): Promise<Resume>

  list(page: number, size: number, params: string): Promise<Resume[]>
}
```

Implemented by `HhResumeGateway implements ResumeGateway<HhResume>` and `AvitoResumeGateway implements ResumeGateway<AvitoResume>`.

Rule: use an interface only when polymorphism is real. Do not declare an interface just to "have a contract".

### `exceptions/`

Domain-specific errors. Subclass `DomainException` from `@common/exceptions`.

Not-found example:

```ts
import { DomainException } from '@common/exceptions'

export class ClientAuthNotFound extends DomainException {
  constructor(clientId: number) {
    super({
      code: 'CLIENT_AUTH_NOT_FOUND',
      message: `Не удалось найти авторизационные данные по ID клиента: ${clientId}`,
      metadata: { clientId }
    })
  }
}
```

Conflict example:

```ts
import { DomainException } from '@common/exceptions'

export class ClientExistsByName extends DomainException {
  constructor(name: string) {
    super({
      code: 'CLIENT_EXISTS_BY_NAME',
      message: `Клиент с именем «${name}» уже существует`,
      metadata: { name }
    })
  }
}
```

Rules:

1. File: `{error-name}.ts` (e.g. `client-not-found.ts`). Class: `{ErrorName}` (e.g. `ClientNotFound`). No `Exception` suffix.
2. Message is in Russian. `code` is `UPPER_SNAKE_CASE`.
3. `metadata` carries the values needed to explain the error downstream (logs, transport mapping). Pass the raw identifiers/names, not formatted strings.
4. Use only for business rule violations / invalid state. Infrastructure errors (timeouts, SDK failures, DB errors) stay in the infra layer and are translated at the boundary before reaching a domain exception.

### `domain/index.ts` — public API

Re-export the domain's public surface. Symbols NOT exported here are considered internal; other modules must not import them.

```ts
export type { Client } from './models/client'
export type { ClientFindParams, ClientSearchParams } from './types'
export { hhConfigDefault } from './models/hh-config'

export { ClientNotFound } from './exceptions/client-not-found'
export { ClientExistsByName } from './exceptions/client-exists-by-name'
```

Rules:

1. Flat exports by default. Section headers `/** === Models === */` are optional — use them only in large files (≥20 exports).
2. `{module}.domain.module.ts` is NOT re-exported from `index.ts` — neighboring Nest modules import it directly by its file path.
3. Concrete repository / gateway classes are usually NOT re-exported either — use cases import them from their file path, Nest modules consume them via `DomainModule.exports`.

## Import Rules

Inside `src/modules/{moduleName}/domain/**`, these imports are allowed:

1. Neighbor files from the same module's `domain/`.
2. `@common/*` (types, exceptions, utils, decorators, validators, infra).
3. External libraries — grouped by role (repository / gateway / tool classes are concrete implementations, so framework imports are expected):
   - Nest core: `@nestjs/common`, `nestjs-cls`
   - ORM: `@prisma/client`
   - HTTP: `axios`, `axios-retry`
   - Rate-limiting: `bottleneck`
   - Crypto / hashing: `bcrypt`, `jsonwebtoken`
   - DTO validation: `class-validator`, `class-transformer`
4. Another module's public API via its `domain/index.ts`: `import type { ClientAuth } from '@modules/auth/domain'`.

Forbidden:

1. Importing from another module's internal files when a public export exists via `domain/index.ts`.
2. Importing from the same module's own `domain/index.ts` instead of local files.
3. Importing from `use-cases/**` of any module — dependency direction is `use-cases → domain`, not the reverse.

Use barrel paths (`@common/types`) instead of deep ones (`@common/types/generics`).

## Anti-Patterns

1. Creating a `repository` for an external API (amoCRM, HH, Avito) — external API = `gateway`.
2. Creating a `gateway` for database access — DB = `repository`.
3. Declaring an `interface` for a contract that has only one implementation — use a class.
4. Using `any` / `unknown` / `Record<string, unknown>` as a lazy escape hatch in method signatures.
5. Placing Prisma models inside `domain/models/` — they belong to `common/infra/prisma/models/`.
6. Exposing `AxiosResponse`, SDK types, or raw DB rows from a repository / gateway method.
7. Re-exporting `{module}.domain.module.ts` from `domain/index.ts`.
8. Creating duplicate concepts for the same business meaning (`Client`, `ClientModel`, `ClientData`, `ClientPayload`). Pick one canonical name.
9. Creating empty folders "for future use". Add a folder only when you put a file in it.
