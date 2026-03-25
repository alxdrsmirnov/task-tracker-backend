---
name: Auth Module Implementation
overview: Реализация полного HTTP auth модуля (SignUp, SignIn, RefreshTokens, Logout) с JWT access/refresh токенами, bcrypt хешированием и чистой доменной архитектурой.
todos:
  - id: deps
    content: 'Phase 1: Установить bcrypt, обновить .env.example'
    status: pending
  - id: domain
    content: 'Phase 2: Domain layer — tools (PasswordHasher, TokenGenerator), types (UserTokens, JwtPayload), exceptions (3 шт.), обновить di.tokens + index'
    status: pending
  - id: infra
    content: 'Phase 3: Infrastructure — BcryptPasswordHasher, JwtTokenGenerator, обновить AuthInfraModule (JwtModule + providers)'
    status: pending
  - id: use-cases
    content: 'Phase 4: Use cases — SignUpCase, SignInCase, RefreshTokensCase, LogoutCase + 4 DTO'
    status: pending
  - id: controller
    content: 'Phase 5: AuthHttpController — 4 POST эндпоинта'
    status: pending
  - id: filter
    content: 'Phase 6: DomainExceptionFilter в common/filters с реестром маппингов'
    status: pending
  - id: integration
    content: 'Phase 7: Модульная интеграция — UserModule exports, AuthModule imports/providers, AppModule, main.ts'
    status: pending
isProject: false
---

# Auth Module — план реализации

## Текущее состояние

Уже создано (без бизнес-логики):

- Доменные модели `UserCredentials`, `RefreshToken` в `[domain/models/user-credentials.ts](src/modules/auth/domain/models/user-credentials.ts)`
- Контракт `UserCredsRepository` в `[domain/repositories/user-credentials.repository.ts](src/modules/auth/domain/repositories/user-credentials.repository.ts)`
- Prisma-реализация `UserCredsPrismaRepository` в `[infra/prisma/user-credentials.repository.ts](src/modules/auth/infra/prisma/user-credentials.repository.ts)`
- Zod-схемы в `[infra/schemas/index.ts](src/modules/auth/infra/schemas/index.ts)`
- `AuthDomainDI` с токеном `UserCredsRepository` в `[domain/di.tokens.ts](src/modules/auth/domain/di.tokens.ts)`
- Пустой `AuthHttpController` и модульная структура
- Зависимости `@nestjs/jwt`, `passport-jwt` уже установлены
- Модель `User` и `UserRepository` в user-модуле (нужны для регистрации)

## Phase 1 — Зависимости и конфигурация

**1.1 Добавить bcrypt:**

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

**1.2 Переменные окружения** — добавить в `.env.example`:

- `JWT_SECRET` — секрет для подписи access-токенов
- `JWT_ACCESS_EXPIRES_IN` — время жизни access-токена (напр. `15m`)
- `REFRESH_TOKEN_TTL_DAYS` — время жизни refresh-токена в днях (напр. `7`)

## Phase 2 — Domain layer

Все новые файлы в `src/modules/auth/domain/`.

**2.1 Tools (контракты инфраструктурных возможностей):**

`tools/password-hasher.tool.ts`:

```typescript
export interface PasswordHasher {
  hash(password: string): Promise<string>

  verify(password: string, hash: string): Promise<boolean>
}
```

`tools/token-generator.tool.ts`:

```typescript
export interface TokenGenerator {
  generateAccessToken(payload: JwtPayload): string

  generateRefreshToken(): RefreshToken
}
```

- `generateAccessToken` — подписывает JWT с payload
- `generateRefreshToken` — создаёт `RefreshToken` (UUID value + expiresAt + createdAt)

**2.2 Types:**

`types/auth.types.ts`:

```typescript
export interface UserTokens {
  accessToken: string
  refreshToken: string
}

export interface JwtPayload {
  sub: string
  email: string
}
```

**2.3 Exceptions** — 3 файла в `domain/exceptions/`:

| Файл                       | Класс                 | Сообщение                                        |
| -------------------------- | --------------------- | ------------------------------------------------ |
| `email-already-exists.ts`  | `EmailAlreadyExists`  | Пользователь с email {email} уже зарегистрирован |
| `invalid-credentials.ts`   | `InvalidCredentials`  | Неверный email или пароль                        |
| `invalid-refresh-token.ts` | `InvalidRefreshToken` | Недействительный refresh token                   |

Все наследуют `DomainException`, сообщения на русском, без HTTP-деталей.

**2.4 Обновить `di.tokens.ts`:**

```typescript
export const AuthDomainDI = {
  UserCredsRepository: Symbol('USER_CREDENTIALS_REPOSITORY'),
  PasswordHasher: Symbol('PASSWORD_HASHER'),
  TokenGenerator: Symbol('TOKEN_GENERATOR')
} as const
```

**2.5 Обновить `domain/index.ts`** — реэкспорт новых tools, types, exceptions по структуре из скилла.

## Phase 3 — Infrastructure layer

**3.1 `infra/bcrypt/bcrypt-password-hasher.ts`:**

- Класс `BcryptPasswordHasher implements PasswordHasher`
- `hash()` — `bcrypt.hash(password, 10)`
- `verify()` — `bcrypt.compare(password, hash)`

**3.2 `infra/jwt/jwt-token-generator.ts`:**

- Класс `JwtTokenGenerator implements TokenGenerator`
- Инжектит `JwtService` из `@nestjs/jwt`
- `generateAccessToken()` — `jwtService.sign(payload)`
- `generateRefreshToken()` — `{ value: randomUUID(), expiresAt: now + TTL, createdAt: now }`
- TTL из `process.env.REFRESH_TOKEN_TTL_DAYS`

**3.3 Обновить `[auth.infra.module.ts](src/modules/auth/infra/auth.infra.module.ts)`:**

- Импорт `JwtModule.register({ secret, signOptions: { expiresIn } })` — конфиг из env
- Зарегистрировать `BcryptPasswordHasher` под `AuthDomainDI.PasswordHasher`
- Зарегистрировать `JwtTokenGenerator` под `AuthDomainDI.TokenGenerator`
- Экспорт новых токенов

## Phase 4 — Use Cases

4 use case в `src/modules/auth/use-cases/`, каждый с DTO в `use-cases/dto/`.

**4.1 SignUpCase** (`sign-up.case.ts` + `dto/sign-up.dto.ts`)

DTO: `email`, `password`, `firstName`, `lastName` (все `@IsString`, email — `@IsEmail`, password — `@MinLength(6)`)

Бизнес-сценарий `execute()`:

```
1. ensureEmailNotTaken(dto.email)      // UserRepository.findByEmail → throw EmailAlreadyExists
2. hashPassword(dto.password)          // PasswordHasher.hash
3. createUser(dto, passwordHash)       // UserRepository.create
4. createCredentials(user, tokens)     // UserCredsRepository.create (с refresh token)
5. return UserTokens                   // { accessToken, refreshToken }
```

Зависимости: `UserRepository` (из user-модуля), `UserCredsRepository`, `PasswordHasher`, `TokenGenerator`.

**4.2 SignInCase** (`sign-in.case.ts` + `dto/sign-in.dto.ts`)

DTO: `email`, `password`

Бизнес-сценарий:

```
1. loadUser(dto.email)                 // UserRepository.findByEmail → throw InvalidCredentials
2. loadCredentials(user.id)            // UserCredsRepository.findByUserId → throw InvalidCredentials
3. verifyPassword(dto.password, creds) // PasswordHasher.verify → throw InvalidCredentials
4. createTokens(user, creds)            // TokenGenerator + UserCredsRepository.update
5. return UserTokens
```

**4.3 RefreshTokensCase** (`refresh-tokens.case.ts` + `dto/refresh-tokens.dto.ts`)

DTO: `refreshToken`

Бизнес-сценарий:

```
1. loadCredentials(dto.refreshToken)   // UserCredsRepository.findByRefreshToken → throw InvalidRefreshToken
2. validateTokenExpiry(creds, token)   // найти токен, проверить expiresAt → throw InvalidRefreshToken
3. rotateTokens(creds)                 // удалить старый, создать новый refresh + access
4. return UserTokens
```

**4.4 LogoutCase** (`logout.case.ts` + `dto/logout.dto.ts`)

DTO: `refreshToken`

Бизнес-сценарий:

```
1. loadCredentials(dto.refreshToken)   // UserCredsRepository.findByRefreshToken → throw InvalidRefreshToken
2. removeRefreshToken(creds, token)    // убрать токен из массива, update creds
```

## Phase 5 — Controller

Обновить `[auth.http.controller.ts](src/modules/auth/auth.http.controller.ts)` — 4 POST эндпоинта:

| Endpoint             | Use Case            | Body               | Response     |
| -------------------- | ------------------- | ------------------ | ------------ |
| `POST /auth/sign-up` | `SignUpCase`        | `SignUpDto`        | `UserTokens` |
| `POST /auth/sign-in` | `SignInCase`        | `SignInDto`        | `UserTokens` |
| `POST /auth/refresh` | `RefreshTokensCase` | `RefreshTokensDto` | `UserTokens` |
| `POST /auth/logout`  | `LogoutCase`        | `LogoutDto`        | `void` (204) |

## Phase 6 — DomainExceptionFilter

Подход: домен чистый, маппинг exception → HTTP-статус в фильтре (вариант B).

**6.1 `common/filters/domain-exception.filter.ts`:**

- `@Catch(DomainException)` — перехватывает все доменные исключения
- Статический реестр `register(ExceptionClass, HttpStatus)` — модули регистрируют свои маппинги
- Дефолт — `400 Bad Request`, если маппинг не найден
- `catch()` — ищет статус по `exception instanceof` в реестре

**6.2 Регистрация маппингов в `auth.module.ts`:**

```typescript
DomainExceptionFilter.register(EmailAlreadyExists, HttpStatus.CONFLICT) // 409
DomainExceptionFilter.register(InvalidCredentials, HttpStatus.UNAUTHORIZED) // 401
DomainExceptionFilter.register(InvalidRefreshToken, HttpStatus.UNAUTHORIZED) // 401
```

**6.3 Подключить в `[main.ts](src/main.ts)`:**

```typescript
app.useGlobalFilters(new DomainExceptionFilter())
```

## Phase 7 — Модульная интеграция

**7.1 `[user.module.ts](src/modules/user/user.module.ts)`:**

- Добавить `exports: [UserInfraModule]` — чтобы auth-модуль мог инжектить `UserRepository`

**7.2 `[auth.module.ts](src/modules/auth/auth.module.ts)`:**

- `imports: [AuthInfraModule, UserModule]`
- `providers: [SignUpCase, SignInCase, RefreshTokensCase, LogoutCase]`
- `controllers: [AuthHttpController]`

**7.3 `[app.module.ts](src/app.module.ts)`:**

- Добавить `AuthModule` в imports

## Итоговая файловая структура auth модуля

```
src/modules/auth/
  auth.module.ts                           (update)
  auth.http.controller.ts                  (update)
  domain/
    di.tokens.ts                           (update)
    index.ts                               (update)
    models/
      user-credentials.ts                  (exists)
    repositories/
      user-credentials.repository.ts       (exists)
    tools/
      password-hasher.tool.ts              (new)
      token-generator.tool.ts              (new)
    types/
      auth.types.ts                        (new)
    exceptions/
      email-already-exists.ts              (new)
      invalid-credentials.ts               (new)
      invalid-refresh-token.ts             (new)
  infra/
    auth.infra.module.ts                   (update)
    prisma/
      user-credentials.repository.ts       (exists)
    bcrypt/
      bcrypt-password-hasher.ts            (new)
    jwt/
      jwt-token-generator.ts              (new)
    schemas/
      index.ts                             (exists)
  use-cases/
    sign-up.case.ts                        (new)
    sign-in.case.ts                        (new)
    refresh-tokens.case.ts                 (new)
    logout.case.ts                         (new)
    dto/
      sign-up.dto.ts                       (new)
      sign-in.dto.ts                       (new)
      refresh-tokens.dto.ts                (new)
      logout.dto.ts                        (new)
```

Файлы вне auth модуля:

- `src/common/filters/domain-exception.filter.ts` (new)
- `src/common/filters/index.ts` (update)
- `src/modules/user/user.module.ts` (update — export)
- `src/app.module.ts` (update — import AuthModule)
- `src/main.ts` (update — add DomainExceptionFilter)
- `.env.example` (update — JWT vars)
