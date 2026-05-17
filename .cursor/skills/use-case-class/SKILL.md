---
name: use-case-class
description: Creates and refactors declarative use case classes with a single public execute() method. Use when creating or editing classes in `use-cases/` folders, or when working with `use-case`, `use-cases`, `usecase`, `use case`, `case`, `cases`, `execute()`, or `business scenario`.
---

# Use Case Class

## Cheat Sheet

- File: `{case-name}.case.ts` (kebab-case). Extension `.case.ts` is **required**.
- Class: `{CaseName}` — verb-first in PascalCase (e.g. `SignUp`, `GetMe`). `Case` suffix is allowed but not required.
- DTO file: `{case-name}.dto.ts` inside `use-cases/dto/`.
- One public method: `execute()`.
- `execute()` **must have an explicit return type** (`Promise<T>` or `Promise<void>`). Type inference is forbidden.
- `execute()` accepts a DTO class (+ `@ValidateDto()`) OR nothing. Raw primitives / enums as parameters are forbidden — always wrap input in a DTO, even for a single field.
- DI: inject concrete classes directly (`private readonly authRepo: AuthRepository`).
- Throw `DomainException` subclasses from private helpers; prefer the `throwXxx(): never` pattern.
- `DomainException` constructor signature: `super({ code, message, metadata? })`.
- Exception messages in Russian. Code: `UPPER_SNAKE_CASE`.
- CLS contexts (`AuthContext`, `ClientContext`, `LogContext`) are an optional pattern. When present, use them for cross-cutting data — don't pass `clientId` / `userId` through DTOs when they're already in context. When absent, pass necessary IDs through the DTO.

## Priority

Rules in this skill take precedence over patterns found in older project code. If an existing use case violates these rules — do NOT copy its pattern. Follow this skill.

## Goal

`execute()` reads as a business scenario. A developer opens the class, reads `execute()`, and understands the full flow without unpacking implementation details. Technical details, validations, data loading, and branching live in private helpers.

## Naming

- File: kebab-case, **`.case.ts` extension required** — `sign-up.case.ts`, `get-me.case.ts`, `get-user.case.ts`, `get-member.case.ts`.
- Class: PascalCase, verb-first — `SignUp`, `GetMe`, `GetUser`, `GetMember`. Suffix `Case` (e.g. `SignUpCase`) is allowed if the project uses it.
- DTO file: `{case-name}.dto.ts` inside `use-cases/dto/`.
- DTO class: `{CaseName}Dto` — `SignUpDto`, `GetMeDto`.

## Structure

Reading order inside the class:

1. Constructor (dependencies).
2. `public async execute(...)`.
3. Private helpers.
4. Private state (readonly maps, relation configs, etc.) at the bottom if present.

Example:

```ts
@Injectable()
export class SignUp {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly credentialsRepository: UserCredentialsRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}

  @ValidateDto()
  public async execute(dto: SignUpDto): Promise<User> {
    await this.guardEmailNotTaken(dto.email)
    const user = await this.createUser(dto)
    await this.createCredentials(user, dto.password)
    return user
  }

  private async guardEmailNotTaken(email: string): Promise<void> {
    const existing = await this.userRepository.findByEmail(email)
    if (existing) {
      throw new EmailAlreadyExists(email)
    }
  }

  private async createUser(dto: SignUpDto): Promise<User> {
    return this.userRepository.create({ email: dto.email, name: dto.name })
  }

  private async createCredentials(user: User, password: string): Promise<void> {
    const hash = await this.passwordHasher.hash(password)
    await this.credentialsRepository.create({ userId: user.id, passwordHash: hash })
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
import { GetMeDto } from '@modules/auth/use-cases/dto'

@Injectable()
export class GetMe {
  constructor(private readonly userRepository: UserRepository) {}

  @ValidateDto()
  public async execute(dto: GetMeDto): Promise<User> {}
}
```

Single-field DTO — still a class, still `@ValidateDto()`:

```ts
// use-cases/dto/get-user.dto.ts
import { IsInt, IsPositive } from 'class-validator'

export class GetUserDto {
  @IsInt()
  @IsPositive()
  userId: number
}
```

```ts
@Injectable()
export class GetUser {
  constructor(private readonly userRepository: UserRepository) {}

  @ValidateDto()
  public async execute(dto: GetUserDto): Promise<User> {
    const user = await this.userRepository.findById(dto.userId)
    return user ?? this.throwUserNotFound(dto.userId)
  }

  private throwUserNotFound(userId: number): never {
    throw new UserNotFound(userId)
  }
}
```

Rules:

- DTO must be a **class** (not an interface / type alias) — `Reflect.getMetadata` needs a runtime class.
- DTO fields use `class-validator` decorators (`@IsString()`, `@IsInt()`, `@IsEnum()`, `@MinLength()`, etc.).
- DTO files live in `use-cases/dto/`, named `{case-name}.dto.ts`.
- Data from auth context (e.g. `userId`, `clientId`) usually does NOT belong in the DTO — get it from CLS contexts instead (see "CLS Contexts" below). When CLS contexts are not present in the project, pass necessary IDs through the DTO.

What `@ValidateDto()` does internally:

1. Reads the DTO class via `Reflect.getMetadata('design:paramtypes', ...)`.
2. Transforms the plain input into a class instance via `plainToInstance`.
3. Validates via `class-validator`.
4. Throws `DtoFailed` with formatted errors on failure.
5. Otherwise calls the original `execute()` with the validated instance.

### 2. No parameters (no decorator)

```ts
@Injectable()
export class RefreshTokens {
  public async execute(): Promise<void> {}
}
```

Use for scheduled tasks / internal triggers with no caller input.

## Return Type — explicit and mandatory

`execute()` must declare its return type explicitly. Relying on TypeScript inference is forbidden.

Good:

```ts
public async execute(dto: SignUpDto): Promise<User> {}
public async execute(dto: GetUserDto): Promise<User | null> {}
public async execute(): Promise<void> {}
```

Bad:

```ts
public async execute(dto: SignUpDto) {}           // inferred — NOT allowed
public async execute() {}                          // inferred — NOT allowed
```

Why: the contract of the use case is visible immediately, consumer types don't drift when internals change, and IDE autocomplete doesn't depend on checking the full method body.

## Dependency Injection

**Default: inject concrete classes directly.** Repositories, gateways, and tools in this project are concrete `@Injectable()` classes (see `domain-structure` skill), so there is no interface to hide behind a token.

```ts
import { UserRepository } from '@modules/user/domain/repositories/user.repository'
import { UserCredentialsRepository } from '@modules/auth/domain/repositories/user-credentials.repository'
import { PasswordHasher } from '@modules/auth/domain/tools/password-hasher'

@Injectable()
export class SignUp {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly credentialsRepository: UserCredentialsRepository,
    private readonly passwordHasher: PasswordHasher
  ) {}
}
```

Deep import paths to domain classes (`@modules/auth/domain/repositories/user-credentials.repository`) are expected. Neighboring domain modules are pulled via `{module}.domain.module.ts` in the Nest module's `imports`.

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

Same helper (`getUser`), two valid implementations:

### Pattern A — throw inside the loader

```ts
private async getUser(userId: number): Promise<User> {
  const user = await this.userRepository.findById(userId)
  if (!user) {
    throw new UserNotFound(userId)
  }
  return user
}
```

### Pattern B — `throwXxx(): never` helper (preferred in this project)

```ts
private async getUser(userId: number): Promise<User> {
  const user = await this.userRepository.findById(userId)
  return user ?? this.throwUserNotFound(userId)
}

private throwUserNotFound(userId: number): never {
  throw new UserNotFound(userId)
}
```

Why pattern B is useful: the loader stays a one-liner (`return x ?? throwXxx(...)`), the throw logic is reusable, and `: never` lets TS narrow the return type to `User`.

### Forbidden — silent returns

```ts
@ValidateDto()
public async execute(dto: GetMemberDto): Promise<void> {
  const member = this.getMember(dto)
  if (!member) return                    // FORBIDDEN

  const workspace = this.getWorkspace(dto)
  if (!workspace) return                 // FORBIDDEN
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

## CLS Contexts — cross-cutting data (optional pattern)

The project may use CLS-based contexts from `@common/infra/context` to pass current user / client / log data across layers without threading it through every method. This is an **optional** pattern — not every project has these contexts.

Available contexts (when present):

- `AuthContext` — current auth data.
- `ClientContext` — current client.
- `LogContext` — current log identifiers.

Name the injected field with the full context name — `authContext`, `clientContext`, `logContext`. Do not abbreviate to `authCtx` / `clientCtx` / `logCtx`.

### When to use a context vs. a DTO parameter

| Data | Source |
| --- | --- |
| Current client / auth / log ids — set once per request | Context (when present) |
| Operation-specific input (command fields, search filters, form data) | DTO |

When CLS contexts are **not** present in the project, pass the necessary IDs through the DTO instead.

A `private get client()` shortcut is a valid pattern when the context value is used in several methods.

## Transactions

Wrap multi-write operations with `TransactionRunner.run(...)` from `@common/infra/prisma`. Everything executed inside the callback runs in a single Prisma transaction thanks to the CLS-based `TransactionContext`.

```ts
import { TransactionRunner } from '@common/infra/prisma'

@Injectable()
export class SignUp {
  constructor(
    private readonly transaction: TransactionRunner,
    private readonly userRepository: UserRepository,
    private readonly credentialsRepository: UserCredentialsRepository
  ) {}

  @ValidateDto()
  public async execute(dto: SignUpDto): Promise<User> {
    return this.transaction.run(async () => {
      const user = await this.userRepository.create({
        email: dto.email,
        name: dto.name
      })
      await this.credentialsRepository.create({
        userId: user.id,
        passwordHash: dto.password
      })
      return user
    })
  }
}
```

Rules:

- Everything inside the `run` callback runs in the same DB transaction. Keep only DB writes / reads there.
- Return from the callback only the data `execute()` actually needs. If a helper entity is created only as a side-effect (like credentials tied to user), don't return it just to acknowledge its creation.
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
import { AuthDomainModule } from './domain/auth.domain.module'
import { UserDomainModule } from '@modules/user/domain/user.domain.module'
import { SignUp, SignIn } from './use-cases'

const useCases = [SignUp, SignIn]

@Module({
  imports: [AuthDomainModule, UserDomainModule],
  providers: [...useCases],
  exports: [...useCases, AuthDomainModule]
})
export class AuthModule {}
```

Use cases are also re-exported from `src/modules/{m}/use-cases/index.ts` for convenient imports from the module's own wiring and from sibling modules that need to inject them.

## Refactoring Existing Code

When editing an existing use case:

1. Keep observable behavior unless the user asked for changes.
2. Apply every rule from this skill. The most common drifts to fix: missing `.case.ts` extension, missing return type, primitive `execute()` parameter, `if (!x) return` chains, string-based `DomainException` constructor.

## Anti-Patterns

1. Missing `.case.ts` extension on the use case file.
2. Missing return type on `execute()`.
3. Passing a raw primitive / enum into `execute()` instead of wrapping it in a DTO class.
4. `if (!x) return` chains to silently stop `execute()`.
5. Throwing `HttpException`, raw `Error`, or a `new Error('message')` from a use case.
6. Passing `clientId` / `userId` through DTOs when the value is already in a CLS context (applicable only when CLS contexts are present).
7. Using `any` anywhere in the use case.
8. Multiple public methods on a use case class.
9. Calling another module's use case directly — use the target module's public domain API instead (repositories / gateways / events), OR import the use case class through the target module's exports. Never reach into another module's `use-cases/*` file directly.

## Checklist

- [ ] File `{case-name}.case.ts`, class `{CaseName}` (`.case.ts` extension required).
- [ ] `execute()` has an explicit return type.
- [ ] `execute()` accepts a DTO class (+ `@ValidateDto()`) or nothing — never a raw primitive / enum.
- [ ] DI uses direct class injection.
- [ ] No `if (!x) return` chains — throw from a private helper instead.
- [ ] Only `DomainException` subclasses are thrown; exception messages in Russian, `code` in `UPPER_SNAKE_CASE`.
- [ ] Cross-cutting data (current client / auth / log ids) comes from CLS contexts (when present), not the DTO.
- [ ] No `any`; no multiple public methods.
