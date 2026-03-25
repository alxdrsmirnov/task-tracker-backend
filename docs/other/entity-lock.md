# Entity Lock

Паттерн сериализации операций над одной сущностью — все обновления одной сущности выполняются строго последовательно, исключая конкурентные конфликты.

## Зачем

Когда два пользователя одновременно обновляют одну сущность (например, задачу), возможен **lost update**: один перезаписывает изменения другого. Entity lock устраняет проблему — операции идут по очереди, каждая видит актуальное состояние.

В отличие от `version` (optimistic locking), entity lock не отклоняет операции ложно — если Боб меняет `title`, а Алиса меняет `status`, обе операции пройдут без ошибок и retry.

## Интерфейс

```typescript
export interface EntityLocker {
  lockFor<T>(entity: string, entityId: string, fn: () => Promise<T>): Promise<T>
}
```

Параметр `entity` изолирует пространства ключей — lock на `task:123` не пересекается с lock на `user:123`. Внутри ключ формируется как `${entity}:${entityId}`.

### Использование в use case

```typescript
await this.locker.lockFor('task', taskId, async () => {
  const task = await this.taskRepo.findById(taskId)
  return this.taskRepo.update({ ...task, ...changes })
})
```

Lock оборачивает use case изнутри, а не снаружи в контроллере — use case сам гарантирует безопасность вне зависимости от того, кто его вызывает (HTTP, WebSocket, CRON).

### Где хранить

Интерфейс — в `src/common/tools/entity-locker.tool.ts` (кросс-модульная инфраструктурная capability).
Реализации — в `src/common/infra/` (async-mutex или redlock).

## In-memory (single instance)

Библиотека [`async-mutex`](https://www.npmjs.com/package/async-mutex) — mutex/semaphore для асинхронных операций в Node.js. TypeScript из коробки.

```bash
npm install async-mutex
```

Для entity lock нужен отдельный `Mutex` на каждую сущность:

```typescript
import { Mutex } from 'async-mutex'
import type { EntityLocker } from '@common/tools/entity-locker.tool'

class AsyncMutexEntityLocker implements EntityLocker {
  private locks = new Map<string, Mutex>()

  async lockFor<T>(entity: string, entityId: string, fn: () => Promise<T>): Promise<T> {
    const key = `${entity}:${entityId}`
    let mutex = this.locks.get(key)
    if (!mutex) {
      mutex = new Mutex()
      this.locks.set(key, mutex)
    }

    return mutex.runExclusive(async () => {
      try {
        return await fn()
      } finally {
        if (!mutex.isLocked()) {
          this.locks.delete(key)
        }
      }
    })
  }
}
```

Mutex удаляется из Map сразу после выполнения, если в очереди никого нет (`isLocked() === false`). Если пока выполнялся callback пришёл ещё один запрос на ту же сущность — mutex останется в Map до завершения последнего в очереди.

### Плюсы

- Нулевая инфраструктура — всё в памяти процесса
- Нет ложных конфликтов, нет retry
- Идеально подходит для Node.js (event loop, один поток)

### Минусы

- Работает только на одном инстансе сервера
- Блокировки теряются при перезапуске (не проблема — они short-lived)
- При горизонтальном масштабировании — бесполезно
- Нужно чистить mutex'ы после использования (реализовано в примере выше)

## Redis (multi-instance)

Когда серверов несколько, lock нужно выносить в общее хранилище. Redis подходит идеально — он и так нужен для WebSocket pub/sub между инстансами.

Библиотека [`redlock`](https://www.npmjs.com/package/redlock) — реализация Redlock-алгоритма. Работает и с одной Redis-нодой, и с кластером. Поддерживает retry, auto-extend, таймауты.

```bash
npm install redlock ioredis
```

```typescript
import Redlock from 'redlock'
import Redis from 'ioredis'
import type { EntityLocker } from '@common/tools/entity-locker.tool'

class RedlockEntityLocker implements EntityLocker {
  private redlock: Redlock

  constructor() {
    const redis = new Redis()
    this.redlock = new Redlock([redis], {
      retryCount: 3,
      retryDelay: 200,
    })
  }

  async lockFor<T>(entity: string, entityId: string, fn: () => Promise<T>): Promise<T> {
    const key = `lock:${entity}:${entityId}`

    return this.redlock.using([key], 5000, async (signal) => {
      const result = await fn()
      if (signal.aborted) throw signal.error
      return result
    })
  }
}
```

`using()` автоматически берёт lock, выполняет callback, освобождает lock. Если операция длится дольше TTL — lock автоматически продлевается.

`signal.aborted` — проверка на случай, если lock был потерян (например, Redis упал). Аналог `AbortSignal`.

### Как это работает под капотом

- Lock берётся через `SET key value PX ttl NX` (атомарная операция)
- `value` — уникальный идентификатор, чтобы процесс удалял только свой lock
- Удаление — через Lua-скрипт (атомарная проверка владельца + удаление)
- TTL — страховка от зависших процессов: lock автоматически истечёт
- При нескольких Redis-нодах lock берётся на большинстве нод одновременно (Redlock-алгоритм)

### Плюсы

- Работает на любом количестве инстансов
- Redis и так нужен для WebSocket pub/sub
- Auto-extend, retry, abort signal из коробки

### Минусы

- Зависимость от Redis (но для real-time приложения он и так есть)
- Сетевой round-trip к Redis на каждую операцию (~0.1-0.5ms)
- Нужно правильно подбирать TTL (для `using()` — менее критично благодаря auto-extend)

## Когда какой использовать

| Ситуация | Подход |
|---|---|
| Один инстанс сервера | In-memory |
| Несколько инстансов, есть Redis | Redis SETNX |
| Критичная система, Redis-кластер | Redlock |
