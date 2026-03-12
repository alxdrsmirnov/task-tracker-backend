# WebSocket Multitenancy: Namespace per Tenant

## Что такое мультитенантность?

**Мультитенантность (Multi-tenancy)** — это архитектура, где одно приложение обслуживает **множество независимых клиентов (тенантов)**.

**Примеры:**
- **Jira Cloud**: у каждой компании своё пространство с задачами
- **Slack**: у каждого workspace свои каналы и пользователи
- **Notion**: у каждой команды свои страницы

**Ваш case:** Если вы делаете SaaS task tracker для компаний — это мультитенантность.

---

## Уровни мультитенантности

### 1️⃣ **Изоляция данных**

```
Tenant A (Company A)     Tenant B (Company B)
├── Users: Alice, Bob    ├── Users: Charlie, Dave
├── Projects: 1, 2, 3    ├── Projects: X, Y, Z
└── Tasks: ...           └── Tasks: ...

Данные не пересекаются!
```

**Реализация в БД:**

```typescript
// Вариант A: tenant_id в каждой таблице
users: id, email, tenant_id, name
projects: id, name, tenant_id, created_by

// Вариант B: отдельные схемы (PostgreSQL)
tenant_a.users, tenant_a.projects
tenant_b.users, tenant_b.projects

// Вариант C: отдельные БД
database_tenant_a, database_tenant_b
```

---

### 2️⃣ **Изоляция WebSocket соединений**

Здесь появляются **namespace per tenant**.

**Проблема:** Если все тенанты в одном namespace — могут быть конфликты:
- Одинаковые ID проектов (`project:1` у Tenant A и Tenant B)
- Случайная рассылка не тем пользователям
- Утечка событий между компаниями

**Решение:** Отдельный namespace для каждого тенанта.

---

## Namespace per Tenant — как это работает

### Пример реализации

```typescript
// ws/multi-tenant.gateway.ts
@WebSocketGateway({
  namespace: /tenant-.+/,  // Регулярка: tenant-a, tenant-b, tenant-123
  cors: true,
})
export class MultiTenantGateway implements OnGatewayConnection {
  constructor(
    private readonly taskWsController: TaskWsController,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    // 1. Получить токен
    const token = client.handshake.auth.token
    const payload = this.jwtService.verify(token)
    
    // 2. Извлечь tenantId из токена
    const tenantId = payload.tenantId  // например, "company-a"
    
    // 3. Проверить, что namespace совпадает с tenantId
    const namespaceMatch = client.nsp.name.match(/tenant-(.+)/)
    const namespaceTenantId = namespaceMatch[1]
    
    if (tenantId !== namespaceTenantId) {
      client.emit('error', { message: 'Tenant mismatch' })
      client.disconnect()
      return
    }
    
    // 4. Сохранить контекст
    client.data.userId = payload.sub
    client.data.tenantId = tenantId
    
    // 5. Подписать на комнаты tenant'а
    client.join(`tenant:${tenantId}`)
    client.join(`user:${payload.sub}`)
    
    console.log(`User ${payload.sub} connected to tenant ${tenantId}`)
  }

  @SubscribeMessage('task:create')
  createTask(client: Socket, data: CreateTaskDto) {
    // Добавить tenantId контекст
    const tenantId = client.data.tenantId
    return this.taskWsController.create(client, data, tenantId)
  }
}
```

---

### Клиентская часть

```javascript
// Компания A подключается к своему namespace
const socketA = io('http://localhost:3000/tenant-company-a', {
  auth: { token: 'jwt-for-company-a-user' }
})

// Компания B подключается к СВОЕМУ namespace
const socketB = io('http://localhost:3000/tenant-company-b', {
  auth: { token: 'jwt-for-company-b-user' }
})

// Это РАЗНЫЕ подключения, разные сокеты
socketA.emit('task:create', { title: 'Task for Company A' })
socketB.emit('task:create', { title: 'Task for Company B' })
```

---

## Визуальная схема

```
┌──────────────────────────────────────────────────────────┐
│                  Один сервер NestJS                       │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  /tenant-company-a (Namespace A)                   │  │
│  │  ├─ User Alice (socket: abc123)                    │  │
│  │  ├─ User Bob (socket: def456)                      │  │
│  │  │                                                  │  │
│  │  │  Rooms:                                          │  │
│  │  │  - tenant:company-a                              │  │
│  │  │  - project:1 (только проекты компании A!)        │  │
│  │  │  - user:alice                                    │  │
│  │  └─────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  /tenant-company-b (Namespace B)                   │  │
│  │  ├─ User Charlie (socket: ghi789)                  │  │
│  │  ├─ User Dave (socket: jkl012)                     │  │
│  │  │                                                  │  │
│  │  │  Rooms:                                          │  │
│  │  │  - tenant:company-b                              │  │
│  │  │  - project:1 (проекты компании B — ДРУГИЕ!)      │  │
│  │  │  - user:charlie                                  │  │
│  │  └─────────────────────────────────────────────────┘  │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │  /tenant-company-c (Namespace C)                   │  │
│  │  └─ ...                                            │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Ключевой момент:** `project:1` в namespace A и `project:1` в namespace B — это **разные комнаты**, несмотря на одинаковое имя!

---

## Преимущества namespace per tenant

| Преимущество | Описание |
|-------------|----------|
| **Изоляция событий** | События не утекают между тенантами |
| **Безопасность** | Даже при баге в коде —租户 не услышат друг друга |
| **Масштабирование** | Можно выдать большие租户 на отдельный инстанс |
| **Мониторинг** | Видно нагрузку по каждому租户 отдельно |
| **Кастомизация** | Разная логика для разных тарифов (Free vs Enterprise) |

---

## Пример: Разная логика для тарифов

```typescript
@WebSocketGateway({ namespace: /tenant-.+/ })
export class MultiTenantGateway {
  handleConnection(client: Socket) {
    const tenantId = client.data.tenantId
    
    // Получить информацию о тарифе租户
    const tenantPlan = await this.tenantRepo.getPlan(tenantId)
    
    client.data.tenantPlan = tenantPlan  // 'free' | 'pro' | 'enterprise'
    
    // Подписать на комнаты
    client.join(`tenant:${tenantId}`)
    client.join(`plan:${tenantPlan}`)  // Для массовой рассылки по тарифу
  }

  @SubscribeMessage('task:create')
  createTask(client: Socket, data: CreateTaskDto) {
    const tenantPlan = client.data.tenantPlan
    
    // Проверить лимиты по тарифу
    if (tenantPlan === 'free') {
      const taskCount = await this.countTasks(client.data.tenantId)
      if (taskCount > 100) {
        throw new ForbiddenException('Free plan limit reached')
      }
    }
    
    return this.taskWsController.create(client, data)
  }

  @SubscribeMessage('analytics:realtime')
  getRealtimeAnalytics(client: Socket) {
    // Доступно только Enterprise
    if (client.data.tenantPlan !== 'enterprise') {
      throw new ForbiddenException('Enterprise only')
    }
    
    return this.analyticsWsController.getRealtime(client)
  }
}
```

---

## Альтернативы namespace per tenant

### 1️⃣ **Один namespace + tenant_id в данных**

```typescript
// Один gateway для всех
@WebSocketGateway({ cors: true })
export class WebSocketGateway {
  handleConnection(client: Socket) {
    const tenantId = this.jwtService.verify(token).tenantId
    client.data.tenantId = tenantId
    client.join(`tenant:${tenantId}`)
  }

  @SubscribeMessage('task:create')
  createTask(client: Socket, data: CreateTaskDto) {
    const tenantId = client.data.tenantId
    // Все запросы фильтруются по tenantId
    return this.taskWsController.create(client, data, tenantId)
  }
}
```

**Плюсы:**
- Проще код
- Меньше подключений на сервере

**Минусы:**
- Риск утечки данных при баге
- Сложнее аудит и мониторинг

---

### 2️⃣ **Отдельный сервер на租户**

```typescript
// Запуск разных инстансов
// docker-compose.yml
services:
  app-tenant-a:
    image: task-tracker
    environment:
      TENANT_ID: company-a
    ports:
      - "3001:3000"

  app-tenant-b:
    image: task-tracker
    environment:
      TENANT_ID: company-b
    ports:
      - "3002:3000"
```

**Плюсы:**
- Полная изоляция
- Можно класть разные версии

**Минусы:**
- Дорого (сервер на каждого租户)
- Сложнее деплой

---

## Когда использовать namespace per tenant?

| Сценарий | Решение |
|----------|---------|
| **B2B SaaS** (компании-клиенты) | ✅ Namespace per tenant |
| **B2C** (индивидуальные пользователи) | ❌ Один namespace + user rooms |
| **Enterprise с isolation требованиями** | ✅ Namespace или отдельный сервер |
| **Free + Paid тарифы** | ✅ Namespace + plan rooms |

---

## Для вашего проекта

**Сейчас:** Вам **НЕ нужен** namespace per tenant, если:
- Вы делаете task tracker для одной команды
- Нет разделения на компании/клиентов
- Все пользователи в одной организации

**Нужен, если:**
- Планируете SaaS для множества компаний
- Требуется изоляция данных между клиентами
- Разные тарифные планы с разным функционалом

---

## Пример JWT токена с tenantId

```typescript
// При логине
const payload = {
  sub: 'user-123',
  email: 'alice@company-a.com',
  tenantId: 'company-a',  // ← ключевое поле
  role: 'admin'
}

const token = this.jwtService.sign(payload)

// В gateway
handleConnection(client: Socket) {
  const token = client.handshake.auth.token
  const payload = this.jwtService.verify(token)
  
  console.log(payload.tenantId)  // "company-a"
  console.log(payload.role)      // "admin"
  
  client.data.tenantId = payload.tenantId
  client.data.role = payload.role
}
```

---

## Итог

**Namespace per tenant** — это когда:
1. У каждой компании свой изолированный канал (`/tenant-company-a`)
2. События не пересекаются между компаниями
3. Можно масштабировать и кастомизировать по租户

**Вам нужно, если:** делаете **SaaS для множества компаний**.

**Не нужно, если:** все пользователи в **одной организации**.
