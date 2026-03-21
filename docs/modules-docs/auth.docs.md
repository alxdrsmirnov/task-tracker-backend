# Auth Module

## Назначение

Модуль отвечает за аутентификацию и авторизацию пользователей. Включает регистрацию, вход, выход, обновление токенов и валидацию JWT.

---

## Структура модуля

```text
modules/auth/
├── auth.module.ts
├── auth.http.controller.ts
│
├── domain/
│   ├── di.tokens.ts
│   ├── models/
│   │   ├── user-credentials.ts
│   │   └── refresh-token.ts
│   ├── types/
│   │   └── auth.types.ts
│   ├── repositories/
│   │   └── auth-user.repository.ts
│   └── exceptions/
│       ├── invalid-credentials.ts
│       ├── email-already-exists.ts
│       └── invalid-refresh-token.ts
│
├── infra/
│   ├── auth.infra.module.ts
│   └── prisma/
│       └── auth-user.repository.ts
│
├── use-cases/
│   ├── sign-up.case.ts
│   ├── sign-in.case.ts
│   ├── logout.case.ts
│   ├── logout-all.case.ts
│   ├── refresh-tokens.case.ts
│   └── dto/
│       ├── sign-up.dto.ts
│       ├── sign-in.dto.ts
│       └── refresh-tokens.dto.ts
│
├── strategies/
│   ├── jwt.strategy.ts
│   └── jwt-refresh.strategy.ts
│
└── index.ts
```

---

## Доменные модели

### UserCredentials

Сущность для хранения учётных данных.

```typescript
interface UserCredentials {
  id: string;              // UUID
  userId: string;          // FK → User
  passwordHash: string;    // bcrypt hash
}
```

### RefreshToken

Сущность для хранения refresh токенов.

```typescript
interface RefreshToken {
  id: string;                  // UUID
  userCredentialsId: string;   // FK → UserCredentials
  token: string;               // hashed refresh token
  expiresAt: Date;
  createdAt: Date;
}
```

---

## Типы (Supporting Types)

### AuthTypes

```typescript
// types/auth.types.ts

interface UserTokens {
  accessToken: string;   // JWT для API
  refreshToken: string;  // для обновления access
  expiresIn: number;     // TTL access token в секундах
}

interface JwtPayload {
  sub: string;      // userId
  email: string;
  iat: number;      // issued at
  exp: number;      // expiration
}
```

---

## Репозиторий

### AuthUserRepository

Единый репозиторий для работы с credentials и refresh tokens.

```typescript
interface AuthUserRepository {
  // UserCredentials
  findCredentialsByUserId(userId: string): Promise<UserCredentials | null>;
  createCredentials(data: New<UserCredentials>): Promise<UserCredentials>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  // RefreshToken
  findRefreshToken(token: string): Promise<RefreshToken | null>;
  createRefreshToken(data: New<RefreshToken>): Promise<RefreshToken>;
  deleteRefreshToken(token: string): Promise<void>;
  deleteAllUserRefreshTokens(userCredentialsId: string): Promise<void>;
}
```

---

## Исключения

| Исключение | Когда выбрасывается |
| ---------- | ------------------- |
| `InvalidCredentials` | Неверный email или пароль при логине |
| `EmailAlreadyExists` | Попытка регистрации с существующим email |
| `InvalidRefreshToken` | Невалидный или истёкший refresh token |

---

## Use Cases

### SignUp

Создание нового пользователя.

**Поток:**

1. Проверить, что email не занят
2. Создать `User` (через репозиторий user модуля)
3. Хешировать пароль
4. Создать `UserCredentials` с `userId`
5. Сгенерировать пару токенов (access + refresh)
6. Сохранить `RefreshToken`
7. Вернуть `UserTokens`

### SignIn

Аутентификация существующего пользователя.

**Поток:**

1. Найти `User` по email
2. Найти `UserCredentials` по `userId`
3. Сверить пароль с `passwordHash`
4. Сгенерировать пару токенов
5. Сохранить `RefreshToken`
6. Вернуть `UserTokens`

### RefreshTokens

Обновление access token по refresh token.

**Поток:**

1. Найти `RefreshToken` в БД
2. Проверить, что не истёк
3. Удалить старый `RefreshToken`
4. Сгенерировать новую пару токенов
5. Сохранить новый `RefreshToken`
6. Вернуть `UserTokens`

### Logout

Выход пользователя.

**Поток:**

1. Найти `RefreshToken` по токену
2. Удалить `RefreshToken` из БД

### LogoutAll

Выход со всех устройств.

**Поток:**

1. Найти `UserCredentials` по `userId`
2. Удалить все `RefreshToken` по `userCredentialsId`

---

## Авторизация (JWT)

### Access Token

- **Тип:** JWT
- **TTL:** 15-30 минут
- **Содержит:** `userId`, `email`
- **Хранение:** клиент (memory/localStorage)
- **Использование:** в заголовке `Authorization: Bearer <token>`

### Refresh Token

- **Тип:** opaque token (random string)
- **TTL:** 7-30 дней
- **Хранение:** БД (hashed) + клиент (httpOnly cookie)
- **Использование:** для получения нового access token

### Стратегии

#### JwtStrategy

Валидация access token.

```typescript
@Injectable()
class JwtStrategy extends PassportStrategy(Strategy) {
  validate(payload: JwtPayload): Promise<User> {
    // payload.sub = userId
    return this.userRepository.findById(payload.sub);
  }
}
```

#### JwtRefreshStrategy

Валидация refresh token (для refresh endpoint).

```typescript
@Injectable()
class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  validate(req: Request, payload: JwtPayload): Promise<{ user: User; refreshToken: string }> {
    const refreshToken = req.cookies.refreshToken;
    // дополнительная валидация в БД
    return { user, refreshToken };
  }
}
```

---

## Связи с другими модулями

### User Module

**Зависимость:** `auth` → `user` (однонаправленная)

| Направление     | Что импортируется            | Для чего                              |
| --------------- | ---------------------------- | ------------------------------------- |
| `auth` → `user` | `User` (model)               | Создание пользователя при регистрации |
| `auth` → `user` | `UserRepository` (interface) | Поиск по email                        |

**Важно:** `user` модуль не знает о `auth` и `UserCredentials`.

### WebSocket Gateway

**Зависимость:** `ws` → `auth`

При WebSocket handshake:

1. Клиент отправляет access token в query params
2. Gateway валидирует токен через `JwtStrategy`
3. Сохраняет `userId` в `socket.data.userId`

---

## HTTP Endpoints

| Метод | Путь | Назначение |
| ----- | ---- | ---------- |
| POST | `/auth/register` | Регистрация |
| POST | `/auth/login` | Вход |
| POST | `/auth/logout` | Выход |
| POST | `/auth/refresh` | Обновление токенов |

---

## DI Tokens

```typescript
export const AuthDomainDI = {
  AUTH_USER_REPOSITORY: Symbol('AUTH_USER_REPOSITORY'),
} as const;
```

---

## Безопасность

- Пароли хешируются bcrypt (10-12 rounds)
- Refresh tokens хешируются перед сохранением в БД
- Access token не хранится на сервере (stateless JWT)
- Refresh token передаётся в httpOnly cookie (защита от XSS)
- При смене пароля — удаляются все refresh tokens (logout everywhere)
