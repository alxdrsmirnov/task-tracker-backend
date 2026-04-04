# HTTP-куки: `Set-Cookie`, опции и где это в проекте

## Два разных места

1. **`cookie-parser` в `main.ts`** — подключает middleware, который **читает**
   входящий заголовок `Cookie` и кладёт значения в `req.cookies`. Это не настройка
   `Set-Cookie`, а только разбор уже присланных кук.

2. **Выставление кук** — в HTTP-слое вызовом **`res.cookie(name, value, options)`**
   (Express / Nest). Обычно в **контроллере** после успешного use case (sign-in,
   refresh). В use case объекта `Response` нет — решение «положить токен в куку»
   остаётся на транспортном слое.

### Пример: только чтение кук (`cookie-parser`)

```ts
// src/main.ts (фрагмент)
import cookieParser from 'cookie-parser'

// ...
app.use(cookieParser())
```

После этого в обработчиках доступно `req.cookies['имя']` (типизируется при
необходимости через `@Req()` и интерфейс запроса).

### Пример: установка куки в контроллере

`passthrough: true` оставляет стандартный пайплайн Nest (сериализация тела ответа);
без него нужно самому вызывать `res.send` / `res.json`.

```ts
import { Body, Controller, Post, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Response } from 'express'
import { buildRefreshCookieOptions } from '@common/api/http/refresh-cookie.options'

@Controller('auth')
export class AuthHttpController {
  constructor(private readonly config: ConfigService) {}

  @Post('sign-in')
  signIn(
    @Body() body: SignInDto,
    @Res({ passthrough: true }) res: Response
  ): Promise<Pick<UserTokens, 'accessToken'>> {
    const tokens = await this.signInCase.execute(body)

    res.cookie(
      'refreshToken',
      tokens.refreshToken,
      buildRefreshCookieOptions(this.config)
    )

    return { accessToken: tokens.accessToken }
  }
}
```

Сейчас в проекте refresh по-прежнему отдаётся в JSON; этот фрагмент — целевой
вид, когда перенесёте refresh в httpOnly-куку.

## Зачем настраивать опции

Браузер применяет правила к `Set-Cookie`. Параметры **`Domain`**, **`Secure`**,
**`SameSite`** (и **`Path`**, **`HttpOnly`**, срок жизни) задают:

- на каких URL кука будет уходить обратно на сервер;
- только ли по HTTPS;
- в каких сценариях (тот же сайт, переходы, кросс-сайтовые запросы).

Несогласованность с тем, как открыт фронт и как настроен CORS, приводит к тому,
что кука не установится или не отправится с запросом.

## Поля опций (кратко)

| Поле | Назначение |
| --- | --- |
| **`httpOnly`** | Кука недоступна из JavaScript (`document.cookie`). Снижает риск кражи при XSS для токена в куке. |
| **`path`** | Кука отправляется только на запросы, чей путь начинается с этого префикса. Ограничивает область применения (должно пересекаться с маршрутами API и `setGlobalPrefix`). |
| **`domain`** | Для какого хоста (и иногда поддоменов) видна кука. Часто не задают на localhost; на проде иногда нужен общий родительский домен для фронта и API. |
| **`secure`** | Если `true` — только HTTPS. На локальном HTTP обычно `false`, иначе браузер не примет куку. |
| **`sameSite`** | `strict` / `lax` / `none`: насколько кука участвует в «чужих» сайтах и кросс-сайтовых запросах. Для кросс-доменного фронта и API часто `none` **вместе с** `secure: true`. |
| **`maxAge`** / **`expires`** | Срок жизни; лучше согласовать с TTL refresh в БД и политикой ротации. |

## Локальная разработка vs прод

Разумная схема:

- **development** — захардкоженные дефолты под localhost (HTTP, без выдуманного
  `Domain`, типичные `sameSite`/`secure` для вашего сценария фронт + API).
- **production** — чувствительные вещи (домен, строгие флаги) выносятся в
  **переменные окружения** при деплое, чтобы не менять код при смене хоста.

В репозитории опции для будущей httpOnly-куки с refresh собраны в одном месте:

`src/common/api/http/refresh-cookie.options.ts` — функция
`buildRefreshCookieOptions(config: ConfigService)`.

### Пример: dev и prod в одной фабрике опций

Упрощённо повторяет логику файла (см. полный код в репозитории):

```ts
// src/common/api/http/refresh-cookie.options.ts (идея)
import { ConfigService } from '@nestjs/config'
import type { CookieOptions } from 'express'

export function buildRefreshCookieOptions(config: ConfigService): CookieOptions {
  const isDev = config.getOrThrow<string>('NODE_ENV') === 'development'

  if (isDev) {
    return {
      httpOnly: true,
      path: '/api',
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    }
  }

  const domain = config.get<string>('COOKIE_DOMAIN')
  return {
    httpOnly: true,
    path: '/api',
    ...(domain ? { domain } : {}),
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}
```

## Связка с CORS

Если фронт и API на **разных origin** и запросы идут с **`credentials: true`**,
нужны согласованные настройки CORS на сервере и кук (`SameSite`/`Secure`/`Domain`).
Иначе браузер не отправит куку или не примет ответ.

### Пример: CORS + credentials в `main.ts`

```ts
// src/main.ts (фрагмент)
const nodeEnv = config.getOrThrow<string>('NODE_ENV')
const isDev = nodeEnv === 'development'

app.enableCors({
  origin: isDev, // при необходимости заменить на строку / массив origin для прода
  credentials: true
})
```

`credentials: true` на сервере согласуется с `fetch(..., { credentials: 'include' })`
на фронте. Конкретные значения `origin` нужно подобрать под схему развёртывания
(локально часто отражают origin запроса; на проде — явный список доменов).
