---
name: use-case-class
description: Creates and refactors declarative use case classes with a single public execute() method. Use when creating or editing classes in `use-cases/` folders, or when working with `use-case`, `use-cases`, `usecase`, `use case`, `case`, `cases`, `execute()`, or `business scenario`.
---

# Use Case Class

## Cheat Sheet

- File: `{case-name}.ts` (kebab-case). Class: `{CaseName}` — **no `Case` suffix, no `.case.ts` extension**.
- One public method: `execute()`.
- `execute()` **must have an explicit return type** (`Promise<T>` or `Promise<void>`). Type inference is forbidden.
- `execute()` accepts a DTO class (+ `@ValidateDto()`) OR nothing. Raw primitives / enums as parameters are forbidden — always wrap input in a DTO, even for a single field.
- DI: inject concrete classes directly (`private readonly authRepo: AuthRepository`).
- Throw `DomainException` subclasses from private helpers; prefer the `throwXxx(): never` pattern.
- `DomainException` constructor signature: `super({ code, message, metadata? })`.
- Exception messages in Russian. Code: `UPPER_SNAKE_CASE`.
- Use CLS contexts (`AuthContext`, `ClientContext`, `LogContext`) for cross-cutting data — don't pass `clientId` / `userId` through DTOs when they're already in context.

## Priority

Rules in this skill take precedence over patterns found in older project code. If an existing use case violates these rules — do NOT copy its pattern. Follow this skill.

## Goal

`execute()` reads as a business scenario. A developer opens the class, reads `execute()`, and understands the full flow without unpacking implementation details. Technical details, validations, data loading, and branching live in private helpers.

## Naming

- File: kebab-case without suffixes — `authorize-hh.ts`, `create-client.ts`, `list-clients.ts`.
- Class: PascalCase, verb-first, **no `Case` / `UseCase` suffix** — `AuthorizeHh`, `CreateClient`, `ListClients`.
- DTO file: `{case-name}.dto.ts` inside `use-cases/dto/`.
- DTO class: `{CaseName}Dto` — `AuthorizeDto`, `CreateClientDto`.

## Structure

Reading order inside the class:

1. Constructor (dependencies).
2. `public async execute(...)`.
3. Private helpers.
4. Private state (readonly maps, relation configs, etc.) at the bottom if present.

Example with private state:

```ts
@Injectable()
export class RunReadyParsers {
  constructor(private readonly parserRepository: ParserRepository) {}

  public async execute(): Promise<void> {
    const parsers = await this.parserRepository.listEnabled()
    parsers.filter((p) => this.isReadyToRun(p)).forEach(/* ... */)
  }

  private isReadyToRun(parser: Parser): boolean {
    const intervalSec = this.scheduleIntervals[parser.schedule]
    return Date.now() / 1000 - parser.lastRun >= intervalSec
  }

  private readonly scheduleIntervals: Record<ParserSchedule, number> = {
    EVERY_30_MINUTES: 30 * 60,
    EVERY_DAY: 24 * 60 * 60
  }
}
```

Extract from `execute()` when:

- A block has a clear business meaning that can be named.
- A condition or branch is large.
- Several calls form one semantic step.

Do not create extra use cases just to shorten `execute()`.

## Input Contract

`execute()` takes zero or one parameter. Two valid forms:

- **With input** → always a DTO class + `@ValidateDto()`. Even for a single field / single primitive, wrap it in a DTO. Raw primitive / `enum` parameters are forbidden.
- **No input** → no DTO, no `@ValidateDto()`.

### 1. DTO class + `@ValidateDto()` — any input

```ts
import { ValidateDto } from '@common/decorators'
import { CreateClientDto } from '@modules/client/use-cases/dto'

@Injectable()
export class CreateClient {
  constructor(private readonly clientRepository: ClientRepository) {}

  @ValidateDto()
  public async execute(dto: CreateClientDto): Promise<Client> {}
}
```

Single-field DTO — still a class, still `@ValidateDto()`:

```ts
// use-cases/dto/get-client-auth.dto.ts
import { IsInt, IsPositive } from 'class-validator'

export class GetClientAuthDto {
  @IsInt()
  @IsPositive()
  clientId: number
}
```

```ts
@Injectable()
export class GetClientAuth {
  constructor(private readonly authRepository: AuthRepository) {}

  @ValidateDto()
  public async execute(dto: GetClientAuthDto): Promise<ClientAuth> {
    const auth = await this.authRepository.findOne(dto.clientId)
    return auth ?? this.throwAuthNotFound(dto.clientId)
  }

  private throwAuthNotFound(clientId: number): never {
    throw new ClientAuthNotFound(clientId)
  }
}
```

Rules:

- DTO must be a **class** (not an interface / type alias) — `Reflect.getMetadata` needs a runtime class.
- DTO fields use `class-validator` decorators (`@IsString()`, `@IsInt()`, `@IsEnum()`, `@MinLength()`, etc.).
- DTO files live in `use-cases/dto/`, named `{case-name}.dto.ts`.
- Data from auth context (e.g. `userId`, `clientId`) usually does NOT belong in the DTO — get it from `AuthContext` / `ClientContext` instead (see "CLS Contexts" below).

What `@ValidateDto()` does internally:

1. Reads the DTO class via `Reflect.getMetadata('design:paramtypes', ...)`.
2. Transforms the plain input into a class instance via `plainToInstance`.
3. Validates via `class-validator`.
4. Throws `DtoFailed` with formatted errors on failure.
5. Otherwise calls the original `execute()` with the validated instance.

### 2. No parameters (no decorator)

```ts
@Injectable()
export class RunReadyParsers {
  public async execute(): Promise<void> {}
}
```

Use for scheduled tasks / internal triggers with no caller input.

## Return Type — explicit and mandatory

`execute()` must declare its return type explicitly. Relying on TypeScript inference is forbidden.

Good:

```ts
public async execute(dto: RegisterDto): Promise<UserTokens> {}
public async execute(dto: GetClientDto): Promise<Client | null> {}
public async execute(): Promise<void> {}
```

Bad:

```ts
public async execute(dto: RegisterDto) {}           // inferred — NOT allowed
public async execute() {}                           // inferred — NOT allowed
```

Why: the contract of the use case is visible immediately, consumer types don't drift when internals change, and IDE autocomplete doesn't depend on checking the full method body.

## Dependency Injection

**Default: inject concrete classes directly.** Repositories, gateways, and tools in this project are concrete `@Injectable()` classes (see `domain-structure` skill), so there is no interface to hide behind a token.

```ts
import { AuthRepository } from '@modules/auth/domain/repositories/auth.repository'
import { HhAuthGateway } from '@modules/auth/domain/gateways/hh-auth.gateway'
import { AuthContext } from '@common/infra/context'

@Injectable()
export class AuthorizeHh {
  constructor(
    private readonly authContext: AuthContext,
    private readonly hhAuthGateway: HhAuthGateway,
    private readonly authRepository: AuthRepository
  ) {}
}
```

Deep import paths to domain classes (`@modules/auth/domain/repositories/auth.repository`) are expected. Neighboring domain modules are pulled via `{module}.domain.module.ts` in the Nest module's `imports`.

### Exception: polymorphic contracts

When a contract has multiple real implementations (e.g. `ResumeGateway<T>` with `HhResumeGateway` and `AvitoResumeGateway`), injecting by interface is valid.

Two valid ways, depending on what the use case needs:

1. **Inject a specific implementation directly** — when the use case knows which one it needs:

   ```ts
   constructor(private readonly resumeGateway: HhResumeGateway) {}
   ```

2. **Inject by interface through a token** — when the implementation is chosen at wiring time (different modules can provide a different class for the same role):

   ```ts
   import { RESUME_GATEWAY } from '@modules/resume/domain'
   import type { ResumeGateway } from '@modules/resume/domain'

   constructor(
     @Inject(RESUME_GATEWAY)
     private readonly resumeGateway: ResumeGateway<Resume>
   ) {}
   ```

   The token lives in the domain that owns the interface; wiring lives in the consumer module's NestJS module. Use this only when you actually have swap points — not "just in case".

If you find yourself introducing a token for a single-implementation contract, don't — inject the class.

## Throwing Domain Exceptions

Every private helper that provides data for the next business step must return `T` or throw. Never return `null` / `undefined` / `false` just to let `execute()` silently `return`.

Same helper (`getClientAuth`), two valid implementations:

### Pattern A — throw inside the loader

```ts
private async getClientAuth(clientId: number): Promise<ClientAuth> {
  const auth = await this.authRepository.findOne(clientId)
  if (!auth) {
    throw new ClientAuthNotFound(clientId)
  }
  return auth
}
```

### Pattern B — `throwXxx(): never` helper (preferred in this project)

```ts
private async getClientAuth(clientId: number): Promise<ClientAuth> {
  const auth = await this.authRepository.findOne(clientId)
  return auth ?? this.throwClientAuthNotFound(clientId)
}

private throwClientAuthNotFound(clientId: number): never {
  throw new ClientAuthNotFound(clientId)
}
```

Why pattern B is useful: the loader stays a one-liner (`return x ?? throwXxx(...)`), the throw logic is reusable, and `: never` lets TS narrow the return type to `ClientAuth`.

### Forbidden — silent returns

```ts
@ValidateDto()
public async execute(dto: SyncRelationDto): Promise<void> {
  const comment = this.getRelevantComment(dto)
  if (!comment) return                    // FORBIDDEN

  const ids = this.extractLinkedIds(dto)
  if (!ids) return                        // FORBIDDEN
}
```

### When `T | null` is acceptable

Only when `null` drives a meaningful business branch — each branch has a concrete action:

```ts
const existing = await this.findExistingRelation(dto)
if (existing) {
  await this.updateRelation(existing, dto)
} else {
  await this.createRelation(dto)
}
```

### Boolean predicates

Use `boolean` only for predicates that select between business branches, both of which continue the scenario. Do not use a predicate to justify an early silent `return`.

## Exception Rules

A use case throws only subclasses of `DomainException` from `@common/exceptions` — never `HttpException`, raw `Error`, or `new Error('msg')`. One dedicated exception class per business failure, stored in the module's `domain/exceptions/`.

See `domain-structure` skill → `### exceptions/` for the full signature, naming, and examples.

## CLS Contexts — cross-cutting data

The project uses CLS-based contexts from `@common/infra/context` to pass current user / client / log data across layers without threading it through every method.

Available contexts:

- `AuthContext` — current `ClientAuth`.
- `ClientContext` — current `Client`.
- `LogContext` — current log identifiers (`resumeLogId`, `unloadLogId`).

Name the injected field with the full context name — `authContext`, `clientContext`, `logContext`. Do not abbreviate to `authCtx` / `clientCtx` / `logCtx`.

### When to use a context vs. a DTO parameter

| Data | Source |
| --- | --- |
| Current client / auth / log ids — set once per request | Context |
| Operation-specific input (command fields, search filters, form data) | DTO |

Example — using `ClientContext` instead of passing `clientId` in the DTO:

```ts
@Injectable()
export class UpdateAuthCredentials {
  constructor(
    private readonly clientContext: ClientContext,
    private readonly authRepository: AuthRepository
  ) {}

  private get client() {
    return this.clientContext.client
  }

  @ValidateDto()
  public async execute(dto: UpdateAuthCredentialsDto): Promise<ClientAuth> {
    const auth = await this.getAuth()
    /* ... mutate auth using dto ... */
    return this.authRepository.update(auth)
  }

  private async getAuth(): Promise<ClientAuth> {
    const auth = await this.authRepository.findOne(this.client.id)
    return auth ?? this.throwClientAuthNotFound(this.client.id)
  }

  private throwClientAuthNotFound(clientId: number): never {
    throw new ClientAuthNotFound(clientId)
  }
}
```

A `private get client()` shortcut is a valid pattern when the context value is used in several methods.

## Transactions

Wrap multi-write operations with `TransactionRunner.run(...)` from `@common/infra/typeorm`. Everything executed inside the callback runs in a single TypeORM transaction thanks to the CLS-based `TransactionContext`.

```ts
import { TransactionRunner } from '@common/infra/typeorm'

@Injectable()
export class CreateClient {
  constructor(
    private readonly transaction: TransactionRunner,
    private readonly clientRepository: ClientRepository,
    private readonly authRepository: AuthRepository
  ) {}

  @ValidateDto()
  public async execute(dto: CreateClientDto): Promise<Client> {
    return this.transaction.run(async () => {
      const client = await this.clientRepository.create({
        name: dto.name,
        isActive: dto.isActive
      })
      await this.authRepository.create({
        clientId: client.id,
        credentials: dto.credentials
      })
      return client
    })
  }
}
```

Rules:

- Everything inside the `run` callback runs in the same DB transaction. Keep only DB writes / reads there.
- Return from the callback only the data `execute()` actually needs. If a helper entity is created only as a side-effect (like `auth` tied to `client`), don't return it just to acknowledge its creation.
- Side effects that must be durable only after commit (event emit, external API call, file write) go **after** `run` returns, not inside the callback.

## Method Naming

Method names describe business intent:

- `validateCommand`, `loadTargetEntity`, `buildRelation`, `persistRelation`, `findExistingRelation` — good.
- `processData`, `handle`, `check`, `step1`, `runLogic` — bad.

Prefix conventions:

- `get*` / `load*` / `extract*` / `resolve*` — always return `T` or throw.
- `find*` — may return `T | null` when `null` drives a meaningful business branch.
- `throw*` — private `: never` helper that throws a domain exception.

No technical suffixes like `OrThrow`.

## Spacing

No empty line between an assignment and the `if` that checks the same value:

```ts
const existing = await this.findExistingRelation(dto)
if (existing) {
  return existing
}
```

## Module-level Wiring

A use case is registered in the module's NestJS module at `src/modules/{m}/{m}.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { ClientDomainModule } from './domain/client.domain.module'
import { AuthDomainModule } from '@modules/auth/domain/auth.domain.module'
import { CreateClient, ListClients, DeleteClient } from './use-cases'

const useCases = [CreateClient, ListClients, DeleteClient]

@Module({
  imports: [ClientDomainModule, AuthDomainModule],
  providers: [...useCases],
  exports: [...useCases, ClientDomainModule]
})
export class ClientModule {}
```

Use cases are also re-exported from `src/modules/{m}/use-cases/index.ts` for convenient imports from the module's own wiring and from sibling modules that need to inject them.

## Refactoring Existing Code

When editing an existing use case:

1. Keep observable behavior unless the user asked for changes.
2. Apply every rule from this skill. The most common drifts to fix: `Case` suffix, missing return type, primitive `execute()` parameter, `if (!x) return` chains, string-based `DomainException` constructor.

## Anti-Patterns

1. `Case` / `UseCase` suffix in class name or `.case.ts` file extension.
2. Missing return type on `execute()`.
3. Passing a raw primitive / enum into `execute()` instead of wrapping it in a DTO class.
4. `if (!x) return` chains to silently stop `execute()`.
5. Throwing `HttpException`, raw `Error`, or a `new Error('message')` from a use case.
6. Passing `clientId` / `userId` through DTOs when the value is already in a CLS context.
7. Using `any` anywhere in the use case.
8. Multiple public methods on a use case class.
9. Calling another module's use case directly — use the target module's public domain API instead (repositories / gateways / events), OR import the use case class through the target module's exports. Never reach into another module's `use-cases/*` file directly.

## Checklist

- [ ] File `{case-name}.ts`, class `{CaseName}` (no `Case` suffix, no `.case.ts`).
- [ ] `execute()` has an explicit return type.
- [ ] `execute()` accepts a DTO class (+ `@ValidateDto()`) or nothing — never a raw primitive / enum.
- [ ] DI uses direct class injection.
- [ ] No `if (!x) return` chains — throw from a private helper instead.
- [ ] Only `DomainException` subclasses are thrown; exception messages in Russian, `code` in `UPPER_SNAKE_CASE`.
- [ ] Cross-cutting data (current client / auth / log ids) comes from CLS contexts, not the DTO.
- [ ] No `any`; no multiple public methods.
