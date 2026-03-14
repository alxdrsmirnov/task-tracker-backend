# 📚 WebSocket + Socket.IO: Полный гайд

## Часть 1: Основы WebSocket

### Что такое WebSocket?

**WebSocket** — это протокол **двусторонней связи** между клиентом (браузером) и сервером.

**Сравнение с HTTP:**

| HTTP (REST)                      | WebSocket                    |
| -------------------------------- | ---------------------------- |
| Клиент запросил → сервер ответил | Постоянное соединение        |
| Соединение закрывается           | Соединение держится открытым |
| Не подходит для real-time        | Идеально для real-time       |
| Пример: получить профиль         | Пример: уведомления, чат     |

```
HTTP:          WebSocket:
Client → Server → Client    Client ↔ Server (постоянно)
   (запрос-ответ)              (двусторонняя связь)
```

---

## Часть 2: Socket.IO — библиотека для WebSocket

**Socket.IO** — это Node.js библиотека, которая:

- Упрощает работу с WebSocket
- Добавляет fallback (если WebSocket недоступен)
- Предоставляет удобные API: rooms, namespaces, events
- Автоматически переподключается при обрыве

### Базовая терминология

```typescript
// Сервер (NestJS + Socket.IO)
@WebSocketGateway()
export class MyGateway {
  @WebSocketServer()
  server: Server // ← это WebSocket сервер
}

// Клиент (браузер)
const socket = io('http://localhost:3000')

// socket — это подключение одного клиента
// server — управляет всеми подключениями
```

---

## Часть 3: Ключевые концепции

### 1️⃣ **Socket (Клиентское подключение)**

**Socket** — это одно подключение одного клиента к серверу.

```typescript
// Сервер получает socket при подключении
handleConnection(client: Socket) {
  // client — это подключение конкретного пользователя
  console.log(client.id)  // Уникальный ID подключения: "abc123xyz"
}
```

**Важно:**

- У каждого браузера/вкладки — свой `socket`
- У одного пользователя может быть несколько сокетов (несколько устройств/вкладок)
- `socket.id` — это ID **подключения**, а не пользователя!

---

### 2️⃣ **Events (События)**

Socket.IO работает через **события** (как `addEventListener` в браузере).

#### Отправка событий

```typescript
// Сервер → Клиент
server.emit('notification', { message: 'Новая задача!' })

// Клиент → Сервер
socket.emit('task:create', { title: 'Новая задача' })
```

#### Получение событий

```typescript
// На сервере
@SubscribeMessage('task:create')
handleTaskCreate(client: Socket, data: any) {
  // Обработка события от клиента
}

// На клиенте
socket.on('notification', (data) => {
  console.log(data.message)  // "Новая задача!"
})
```

#### Встроенные события Socket.IO

```typescript
// Сервер
handleConnection(client: Socket) {
  // Клиент подключился
}

handleDisconnect(client: Socket) {
  // Клиент отключился (закрыл вкладку, пропал интернет)
}

// Клиент
socket.on('connect', () => {
  console.log('Подключено!')
})

socket.on('disconnect', () => {
  console.log('Отключено')
})

socket.on('connect_error', (error) => {
  console.error('Ошибка подключения', error)
})
```

---

### 3️⃣ **Rooms (Комнаты)**

**Room (комната)** — это логическая группа сокетов.

**Зачем нужны:**

- Отправлять сообщения **группе пользователей**
- Пример: все участники проекта получают обновления задач

```typescript
// Сервер: добавить сокет в комнату
client.join('project:123') // Комната проекта с ID 123

// Сервер: удалить сокет из комнаты
client.leave('project:123')

// Сервер: отправить сообщение ВСЕМ в комнате
client.to('project:123').emit('task:created', taskData)

// Сервер: отправить всем, КРОМЕ текущего клиента
client.broadcast.to('project:123').emit('task:created', taskData)
```

**Как это работает:**

```
Проект "Разработка" (ID: 123)
├── User A (socket: abc123) ← join('project:123')
├── User B (socket: def456) ← join('project:123')
└── User C (socket: ghi789) ← join('project:123')

User A создаёт задачу:
  → Сервер: client.to('project:123').emit('task:created', task)
  → Получат: User B и User C
```

#### Типы комнат в вашем приложении

Согласно `docs/architecture.md`:

```typescript
// 1. Комната проекта — все участники получают обновления задач
client.join(`project:${projectId}`)

// 2. Персональная комната пользователя — для личных уведомлений
client.join(`user:${userId}`)

// 3. Комната задачи — подписка на конкретную задачу (комментарии, activity)
client.join(`task:${taskId}`)
```

**Пример использования:**

```typescript
// modules/task/task.ws.controller.ts
async create(client: Socket, data: CreateTaskDto) {
  const userId = this.getUserId(client)
  const task = await this.createTask.execute(data, userId)

  // Отправить обновление ВСЕМ участникам проекта
  client.to(`project:${task.projectId}`).emit('task:created', task)

  return task
}

// modules/notification/notification.ws.controller.ts
async sendNotification(client: Socket, userId: string, notification: Notification) {
  // Отправить только этому пользователю (в его персональную комнату)
  client.to(`user:${userId}`).emit('notification:new', notification)
}
```

---

### 4️⃣ **Namespaces (Пространства имён)**

**Namespace** — это изолированный канал связи внутри одного WebSocket сервера.

**Зачем нужны:**

- Разделить потоки событий (например, основные события vs уведомления)
- Разная логика подключения/авторизации
- Уменьшить "шум" (клиент подписывается только на нужные события)

```typescript
// Сервер: создание namespace
@WebSocketGateway({ namespace: 'notifications' })
export class NotificationGateway {
  // Подключения идут на ws://localhost:3000/notifications
}

// Клиент: подключение к namespace
const notificationsSocket = io('http://localhost:3000/notifications')

// Обычное подключение (основной namespace)
const mainSocket = io('http://localhost:3000')
```

**Пример разделения:**

```typescript
// Основной namespace — бизнес-события
@WebSocketGateway({ namespace: 'app' })
export class AppGateway {
  @SubscribeMessage('task:create')
  createTask() {
    /* ... */
  }

  @SubscribeMessage('project:update')
  updateProject() {
    /* ... */
  }
}

// Notifications namespace — только уведомления
@WebSocketGateway({ namespace: 'notifications' })
export class NotificationsGateway {
  @SubscribeMessage('notifications:mark-read')
  markAsRead() {
    /* ... */
  }
}
```

**На клиенте:**

```javascript
// Подключение к основному namespace
const appSocket = io('http://localhost:3000/app')

// Подключение к уведомлениям
const notificationSocket = io('http://localhost:3000/notifications')

// Разные сокеты — разные потоки событий
appSocket.emit('task:create', { title: 'Task' })
notificationSocket.emit('notifications:mark-read', { id: 123 })
```

---

### 5️⃣ **Авторизация и идентификация пользователя**

**Проблема:** `socket.id` — это ID **подключения**, а не пользователя. Как понять, кто подключился?

**Решение:** Передавать JWT токен при подключении.

---

#### 🔐 Способ 1: Auth при handshake (рекомендуемый)

```typescript
// Сервер: настройка авторизации
@WebSocketGateway({
  cors: true,
  // Функция проверяет токен ДО подключения
  verifyClient: (info, callback) => {
    try {
      // Получить токен из query параметров или headers
      const token = info.req.headers.authorization?.replace('Bearer ', '')

      if (!token) {
        return callback({ error: 'No token', code: 401 }, false)
      }

      // Проверить JWT токен
      const payload = this.jwtService.verify(token)

      // Сохранить userId в объекте подключения
      info.req.userId = payload.sub

      callback({ code: 200 }, true) // Разрешить подключение
    } catch (error) {
      callback({ error: 'Invalid token', code: 401 }, false)
    }
  }
})
export class WebSocketGateway implements OnGatewayConnection {
  handleConnection(client: Socket) {
    // userId уже доступен из request
    const userId = client.request.userId
    client.data.userId = userId // Сохранить для дальнейшего использования

    // Автоматически подписать на персональную комнату
    client.join(`user:${userId}`)

    this.logger.log(`User ${userId} connected`)
  }
}
```

**Клиент (браузер):**

```javascript
// Передать токен при подключении
const socket = io('http://localhost:3000', {
  auth: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  // Или через query
  query: {
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }
})

// Обработка ошибки авторизации
socket.on('connect_error', (error) => {
  if (error.message === 'Invalid token') {
    // Перенаправить на страницу логина
    window.location.href = '/login'
  }
})
```

---

#### 🔐 Способ 2: Auth через событие (альтернативный)

Клиент подключается без токена, затем отправляет событие с токеном.

```typescript
// Сервер
@SubscribeMessage('auth')
handleAuth(client: Socket, token: string) {
  try {
    const payload = this.jwtService.verify(token)
    client.data.userId = payload.sub
    client.join(`user:${payload.sub}`)
    client.emit('auth:success', { userId: payload.sub })
  } catch (error) {
    client.emit('auth:error', { message: 'Invalid token' })
    client.disconnect()
  }
}
```

**Клиент:**

```javascript
const socket = io('http://localhost:3000')

// После подключения отправить токен
socket.on('connect', () => {
  socket.emit('auth', localStorage.getItem('token'))
})

socket.on('auth:success', (data) => {
  console.log('Авторизован:', data.userId)
})

socket.on('auth:error', (error) => {
  console.error('Ошибка авторизации', error)
  socket.disconnect()
})
```

**Минусы способа 2:**

- Кратковременное неавторизованное подключение
- Нужно обрабатывать все события только после авторизации

---

### 6️⃣ **Join/Leave — подписка на комнаты**

#### Когда вызывать `join()`?

```typescript
// 1. При подключении — автоматически в персональную комнату
handleConnection(client: Socket) {
  const userId = this.getUserId(client)
  client.join(`user:${userId}`)  // Всегда!
}

// 2. По запросу клиента — подписка на проект/задачу
@SubscribeMessage('project:join')
joinProject(client: Socket, projectId: string) {
  // Проверить, что пользователь имеет доступ к проекту
  const canAccess = await this.checkProjectAccess(client.data.userId, projectId)

  if (!canAccess) {
    throw new ForbiddenException('No access to project')
  }

  client.join(`project:${projectId}`)
  return { success: true }
}

// 3. При отключении — автоматически (Socket.IO сам чистит)
handleDisconnect(client: Socket) {
  // Не нужно вручную вызывать leave() — Socket.IO сам удалит из всех комнат
  this.logger.log(`Client disconnected`)
}
```

#### Когда вызывать `leave()`?

Обычно **не нужно** вызывать вручную — Socket.IO автоматически удаляет сокет из всех комнат при отключении.

**Исключение:** если нужно отписаться от комнаты без отключения:

```typescript
@SubscribeMessage('project:leave')
leaveProject(client: Socket, projectId: string) {
  client.leave(`project:${projectId}`)
  return { success: true }
}
```

---

### 7️⃣ **Полный пример потока для Task Tracker**

```typescript
// ========== СЕРВЕР ==========

@WebSocketGateway({ cors: true })
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  constructor(private readonly taskWsController: TaskWsController) {}

  // 1. Подключение клиента
  handleConnection(client: Socket) {
    // Получить userId из JWT (проверенного в verifyClient)
    const userId = client.request.userId
    client.data.userId = userId

    // Подписать на персональные уведомления
    client.join(`user:${userId}`)

    this.logger.log(`User ${userId} connected`)
  }

  // 2. Отключение
  handleDisconnect(client: Socket) {
    this.logger.log(`User ${client.data.userId} disconnected`)
  }

  // 3. Подписка на проект
  @SubscribeMessage('project:join')
  joinProject(client: Socket, projectId: string) {
    return this.taskWsController.joinProject(client, projectId)
  }

  // 4. Создание задачи
  @SubscribeMessage('task:create')
  createTask(client: Socket, data: CreateTaskDto) {
    return this.taskWsController.create(client, data)
  }
}

// ========== TASK WS CONTROLLER ==========

@Injectable()
export class TaskWsController {
  constructor(
    private readonly createTask: CreateTaskCase,
    private readonly projectRepo: ProjectRepository
  ) {}

  // Подписка на проект
  async joinProject(client: Socket, projectId: string) {
    const userId = client.data.userId

    // Проверить, что пользователь — участник проекта
    const isMember = await this.projectRepo.isMember(projectId, userId)
    if (!isMember) {
      throw new ForbiddenException('Not a project member')
    }

    // Подписать на комнату проекта
    client.join(`project:${projectId}`)

    return { success: true, projectId }
  }

  // Создание задачи
  async create(client: Socket, data: CreateTaskDto) {
    const userId = client.data.userId

    // Создать задачу через use case
    const task = await this.createTask.execute(data, userId)

    // Уведомить ВСЕХ участников проекта (кроме создателя)
    client.to(`project:${task.projectId}`).emit('task:created', task)

    // Вернуть задачу создателю
    return task
  }
}

// ========== КЛИЕНТ (React/Vue/Angular) ==========

// 1. Подключение с токеном
const socket = io('http://localhost:3000', {
  auth: { token: localStorage.getItem('jwt_token') }
})

// 2. Обработка событий
socket.on('connect', () => {
  console.log('Подключено к WebSocket')
})

socket.on('connect_error', (error) => {
  if (error.message === 'Invalid token') {
    // Токен невалиден — разлогинить
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
})

// 3. Подписка на проект после загрузки
socket.emit('project:join', 'project-123-id')

// 4. Создание задачи
socket.emit('task:create', {
  projectId: 'project-123',
  title: 'Новая задача',
  description: 'Описание'
})

// 5. Получение обновлений от других пользователей
socket.on('task:created', (task) => {
  console.log('Другой пользователь создал задачу:', task)
  // Обновить UI — добавить задачу в список
})

socket.on('task:updated', (task) => {
  console.log('Задача обновлена:', task)
  // Обновить UI
})

// 6. Отписка при размонтировании компонента
useEffect(() => {
  return () => {
    socket.emit('project:leave', projectId)
  }
}, [projectId])
```

---

## Часть 4: Сводная таблица концепций

| Концепция          | Что это                         | Зачем нужно                     | Пример                             |
| ------------------ | ------------------------------- | ------------------------------- | ---------------------------------- |
| **Socket**         | Подключение клиента             | Индивидуальная связь с сервером | `client.emit()`                    |
| **Event**          | Сообщение с именем              | Двусторонняя коммуникация       | `@SubscribeMessage('task:create')` |
| **Room**           | Группа сокетов                  | Рассылка группе пользователей   | `client.to('project:123').emit()`  |
| **Namespace**      | Изолированный канал             | Разделение потоков событий      | `io('/notifications')`             |
| **Handshake Auth** | Проверка токена при подключении | Безопасность                    | `verifyClient`                     |
| **join()**         | Подписка на комнату             | Получать события группы         | `client.join('project:123')`       |
| **leave()**        | Отписка от комнаты              | Перестать получать события      | `client.leave('project:123')`      |

---

## Часть 5: Частые ошибки и best practices

### ❌ Ошибка 1: Не проверять авторизацию

```typescript
// ПЛОХО: любой может подписаться на любой проект
@SubscribeMessage('project:join')
joinProject(client: Socket, projectId: string) {
  client.join(`project:${projectId}`)  // Нет проверки прав!
}

// ХОРОШО: проверить права доступа
@SubscribeMessage('project:join')
async joinProject(client: Socket, projectId: string) {
  const userId = client.data.userId
  const isMember = await this.checkAccess(userId, projectId)

  if (!isMember) {
    throw new ForbiddenException()
  }

  client.join(`project:${projectId}`)
}
```

---

### ❌ Ошибка 2: Отправлять данные всем вместо комнаты

```typescript
// ПЛОХО: получат ВСЕ подключенные клиенты
this.server.emit('task:created', task)

// ХОРОШО: получат только участники проекта
client.to(`project:${projectId}`).emit('task:created', task)
```

---

### ❌ Ошибка 3: Не обрабатывать disconnect

```typescript
// ПЛОХО: нет логгирования
handleDisconnect(client: Socket) {
  // Пусто
}

// ХОРОШО: логировать и чистить ресурсы
handleDisconnect(client: Socket) {
  this.logger.warn(`Client disconnected: ${client.id}`)
  // Socket.IO сам почистит комнаты — вручную не нужно
}
```

---

### ❌ Ошибка 4: Хранить состояние на сервере

```typescript
// ПЛОХО: состояние на уровне сервера
private userSessions = new Map()

// ХОРОШО: состояние в client.data
handleConnection(client: Socket) {
  client.data.userId = '123'
  client.data.projectId = '456'
}
```

---

### ✅ Best Practice: Валидация данных

```typescript
// Использовать class-validator для DTO
class CreateTaskDto {
  @IsString()
  @MinLength(1)
  title: string

  @IsString()
  projectId: string

  @IsOptional()
  @IsString()
  description?: string
}

@SubscribeMessage('task:create')
createTask(client: Socket, data: CreateTaskDto) {
  // Валидация автоматически через Pipe
  return this.taskWsController.create(client, data)
}
```

---

## Часть 6: Визуальная схема архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│                     Браузеры клиентов                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  User A  │  │  User B  │  │  User C  │                  │
│  │ (Socket) │  │ (Socket) │  │ (Socket) │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                         │
│       └─────────────┴─────────────┘                         │
│                     WebSocket соединение                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  NestJS WebSocket Gateway                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  handleConnection(client: Socket)                    │   │
│  │    → Проверка JWT токена                             │   │
│  │    → client.data.userId = payload.sub                │   │
│  │    → client.join(`user:${userId}`)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  @SubscribeMessage('project:join')                   │   │
│  │    → Проверка прав доступа                           │   │
│  │    → client.join(`project:${projectId}`)             │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  @SubscribeMessage('task:create')                    │   │
│  │    → TaskWsController.create()                       │   │
│  │    → client.to(`project:${id}`).emit('task:created') │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
              ┌───────────────────────┐
              │   Rooms (комнаты)     │
              │                       │
              │  user:123 ────────────┼──→ User A (личные уведомления)
              │  project:456 ─────────┼──→ User A, B, C (задачи проекта)
              │  task:789 ────────────┼──→ Подписчики задачи
              └───────────────────────┘
```

---

## Итог

**Ключевые выводы:**

1. **WebSocket** — постоянное соединение для real-time
2. **Socket.IO** — библиотека с rooms, namespaces, events
3. **Room** — группа сокетов для рассылки (`project:123`, `user:456`)
4. **Namespace** — изолированный канал (опционально)
5. **Авторизация** — через JWT при handshake (`verifyClient`)
6. **join/leave** — подписка/отписка от комнат
7. **Один gateway** — достаточно для вашего приложения
