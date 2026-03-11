# Task Tracker Project — архитектура

## Принципы

- **Модульная архитектура**: каждый модуль содержит всё о себе — domain, infra, use cases, ws-handler
- **Доменные интерфейсы + операции**: модели — интерфейсы в `domain/models/`, бизнес-логика — чистые функции в `domain/operations/`. ORM-entity реализует интерфейс модели. Маппинг не нужен. Use case работает только с абстракциями из `domain/`
- **DIP**: интерфейсы принадлежат потребителю (modules/*/domain/), реализации (infra/prisma/) импортируют их через `import type`
- **Full WebSocket**: один тонкий gateway-роутер, делегирует в ws-handler каждого модуля
- **Real-time**: изменения задач, комментарии, уведомления — всё через WebSocket

## Технологический стек

- NestJS + TypeScript
- PostgreSQL + Prisma (миграции, `prisma migrate`)
- Redis (кэш, pub/sub для WebSocket scaling между инстансами)
- BullMQ (очереди: уведомления, email, тяжёлые операции)
- WebSocket через `@nestjs/websockets` + `socket.io`
- S3 / MinIO (вложения к задачам)
- JWT + Refresh tokens
- `class-validator` + `class-transformer` (DTO валидация)
- `@nestjs/event-emitter` (межмодульные события)

## Правила зависимостей

- Use case импортирует ТОЛЬКО из `domain/` — модели (интерфейсы), операции (функции), репозитории (интерфейсы), исключения. Никогда из `infra/`
- Use case МОЖЕТ инжектить репозитории/gateway своего и чужого модуля по интерфейсу (через DI-токен)
- infra/prisma/ — Prisma-модели и репозитории; репозитории реализуют интерфейсы из domain/repositories/ через `import type` (DIP)
- infra/prisma/ НЕ МОЖЕТ импортировать use cases, контроллеры, ws-handlers или DTO
- infra/ (глобальная) — подключения к внешним сервисам (БД, Redis, очереди, S3, mail), импортируется в app.module.ts
- common/ — шарится между модулями (guards, pipes, decorators, utils, types)
- Кросс-модульный доступ к данным: модуль импортирует `*.infra.module.ts` другого модуля
- Gateway — тонкий роутер, не содержит логики, делегирует в ws-handler модулей

## Схема БД

```
users
├── id (uuid), email, name, avatar_url, password_hash
├── created_at, updated_at

workspaces
├── id (uuid), name, slug
├── created_by (-> users), created_at

workspace_members
├── workspace_id (-> workspaces), user_id (-> users)
├── role (owner / admin / member), joined_at

projects
├── id (uuid), workspace_id (-> workspaces)
├── name, description, color, icon
├── view_type (list / board / timeline)
├── created_by (-> users), created_at, updated_at

sections
├── id (uuid), project_id (-> projects)
├── name, position (float)
├── created_at

tasks
├── id (uuid), project_id (-> projects), section_id (-> sections)
├── parent_task_id (-> tasks, nullable) — подзадачи
├── title, description (text)
├── status (open / in_progress / completed)
├── priority (none / low / medium / high / urgent)
├── assignee_id (-> users, nullable)
├── position (float) — порядок в секции (fractional indexing)
├── due_date (timestamptz, nullable)
├── completed_at (timestamptz, nullable)
├── created_by (-> users)
├── created_at, updated_at

comments
├── id (uuid), task_id (-> tasks), user_id (-> users)
├── content (text)
├── created_at, updated_at

attachments
├── id (uuid), task_id (-> tasks), user_id (-> users)
├── file_name, file_url, file_size, mime_type
├── created_at

activities
├── id (uuid), task_id (-> tasks), user_id (-> users)
├── action (created / updated / completed / reopened / assigned / moved / commented)
├── changes (jsonb) — { field: "status", from: "open", to: "completed" }
├── created_at

notifications
├── id (uuid), user_id (-> users)
├── type (task_assigned / task_completed / comment_added / mentioned)
├── payload (jsonb)
├── is_read (boolean)
├── created_at
```

## Структура папок

```
src/
├── main.ts
├── app.module.ts
│
├── infra/                                   # глобальные подключения к внешним сервисам
│   ├── prisma/
│   │   └── prisma.module.ts               # Prisma forRoot
│   ├── redis/
│   │   ├── redis.module.ts
│   │   └── redis.service.ts
│   ├── queue/
│   │   └── queue.module.ts                 # BullMQ forRoot
│   ├── storage/
│   │   ├── storage.module.ts
│   │   └── s3.service.ts
│   └── mail/
│       ├── mail.module.ts
│       └── mail.service.ts
│
├── common/                                  # общее для всех модулей
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── workspace-roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── ws-auth.guard.ts
│   │   ├── workspace-member.guard.ts
│   │   └── project-access.guard.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   ├── utils/
│   │   └── pagination.ts
│   └── types/
│       ├── common.types.ts                 # PaginatedResult, New, Loaded
│       └── enums.ts
│
├── gateway/
│   ├── gateway.module.ts
│   └── app.gateway.ts                      # тонкий WS роутер
│
└── modules/
    │
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   ├── user-tokens.ts
    │   │   │   └── refresh-token.ts
    │   │   ├── repositories/
    │   │   │   └── refresh-token.repository.ts
    │   │   └── exceptions/
    │   │       ├── invalid-credentials.ts
    │   │       ├── email-already-exists.ts
    │   │       └── invalid-refresh-token.ts
    │   │
    │   ├── infra/
    │   │   ├── auth.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   └── refresh-token.entity.ts
    │   │       └── repositories/
    │   │           └── refresh-token.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── register.case.ts
    │   │   ├── login.case.ts
    │   │   ├── refresh-tokens.case.ts
    │   │   ├── logout.case.ts
    │   │   ├── validate-token.case.ts
    │   │   └── dto/
    │   │       ├── register.dto.ts
    │   │       ├── login.dto.ts
    │   │       └── refresh-tokens.dto.ts
    │   │
    │   ├── strategies/
    │   │   ├── jwt.strategy.ts
    │   │   └── jwt-refresh.strategy.ts
    │   │
    │   └── index.ts
    │
    ├── user/
    │   ├── user.module.ts
    │   ├── user.controller.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── user.ts
    │   │   ├── repositories/
    │   │   │   └── user.repository.ts
    │   │   └── exceptions/
    │   │       └── user-not-found.ts
    │   │
    │   ├── infra/
    │   │   ├── user.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   └── user.entity.ts
    │   │       └── repositories/
    │   │           └── user.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── get-profile.case.ts
    │   │   ├── update-profile.case.ts
    │   │   ├── upload-avatar.case.ts
    │   │   └── dto/
    │   │       └── update-profile.dto.ts
    │   │
    │   └── index.ts
    │
    ├── workspace/
    │   ├── workspace.module.ts
    │   ├── workspace.controller.ts
    │   ├── workspace.ws-handler.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   ├── workspace.ts
    │   │   │   └── workspace-member.ts         # interface WorkspaceMember
    │   │   ├── operations/
    │   │   │   └── workspace-member.operations.ts  # assertCanInvite(), assertCanRemove()
    │   │   ├── repositories/
    │   │   │   ├── workspace.repository.ts
    │   │   │   └── workspace-member.repository.ts
    │   │   └── exceptions/
    │   │       ├── workspace-not-found.ts
    │   │       ├── already-member.ts
    │   │       └── insufficient-role.ts
    │   │
    │   ├── infra/
    │   │   ├── workspace.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   ├── workspace.entity.ts
    │   │       │   └── workspace-member.entity.ts
    │   │       └── repositories/
    │   │           ├── workspace.repository.ts
    │   │           └── workspace-member.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── create-workspace.case.ts
    │   │   ├── update-workspace.case.ts
    │   │   ├── delete-workspace.case.ts
    │   │   ├── invite-member.case.ts
    │   │   ├── remove-member.case.ts
    │   │   ├── change-member-role.case.ts
    │   │   ├── list-workspaces.case.ts
    │   │   ├── list-members.case.ts
    │   │   └── dto/
    │   │       ├── create-workspace.dto.ts
    │   │       ├── update-workspace.dto.ts
    │   │       ├── invite-member.dto.ts
    │   │       └── change-member-role.dto.ts
    │   │
    │   └── index.ts
    │
    ├── project/
    │   ├── project.module.ts
    │   ├── project.controller.ts
    │   ├── project.ws-handler.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   ├── project.ts
    │   │   │   └── section.ts
    │   │   ├── repositories/
    │   │   │   ├── project.repository.ts
    │   │   │   └── section.repository.ts
    │   │   └── exceptions/
    │   │       ├── project-not-found.ts
    │   │       └── section-not-found.ts
    │   │
    │   ├── infra/
    │   │   ├── project.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   ├── project.entity.ts
    │   │       │   └── section.entity.ts
    │   │       └── repositories/
    │   │           ├── project.repository.ts
    │   │           └── section.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── create-project.case.ts
    │   │   ├── update-project.case.ts
    │   │   ├── delete-project.case.ts
    │   │   ├── get-project.case.ts
    │   │   ├── list-projects.case.ts
    │   │   ├── create-section.case.ts
    │   │   ├── update-section.case.ts
    │   │   ├── delete-section.case.ts
    │   │   ├── reorder-sections.case.ts
    │   │   └── dto/
    │   │       ├── create-project.dto.ts
    │   │       ├── update-project.dto.ts
    │   │       ├── create-section.dto.ts
    │   │       ├── update-section.dto.ts
    │   │       └── reorder-sections.dto.ts
    │   │
    │   └── index.ts
    │
    ├── task/
    │   ├── task.module.ts
    │   ├── task.controller.ts
    │   ├── task.ws-handler.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── task.ts                    # interface Task
    │   │   ├── operations/
    │   │   │   └── task.operations.ts          # completeTask(), reopenTask(), isOverdue()
    │   │   ├── repositories/
    │   │   │   └── task.repository.ts
    │   │   └── exceptions/
    │   │       ├── task-not-found.ts
    │   │       └── task-already-completed.ts
    │   │
    │   ├── infra/
    │   │   ├── task.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   └── task.entity.ts
    │   │       └── repositories/
    │   │           └── task.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── create-task.case.ts
    │   │   ├── update-task.case.ts
    │   │   ├── delete-task.case.ts
    │   │   ├── get-task.case.ts
    │   │   ├── list-tasks.case.ts
    │   │   ├── complete-task.case.ts
    │   │   ├── reopen-task.case.ts
    │   │   ├── assign-task.case.ts
    │   │   ├── move-task.case.ts
    │   │   ├── create-subtask.case.ts
    │   │   └── dto/
    │   │       ├── create-task.dto.ts
    │   │       ├── update-task.dto.ts
    │   │       ├── move-task.dto.ts
    │   │       ├── assign-task.dto.ts
    │   │       └── task-filter.dto.ts
    │   │
    │   └── index.ts
    │
    ├── comment/
    │   ├── comment.module.ts
    │   ├── comment.controller.ts
    │   ├── comment.ws-handler.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── comment.ts
    │   │   ├── repositories/
    │   │   │   └── comment.repository.ts
    │   │   └── exceptions/
    │   │       └── comment-not-found.ts
    │   │
    │   ├── infra/
    │   │   ├── comment.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   └── comment.entity.ts
    │   │       └── repositories/
    │   │           └── comment.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── create-comment.case.ts
    │   │   ├── update-comment.case.ts
    │   │   ├── delete-comment.case.ts
    │   │   ├── list-comments.case.ts
    │   │   └── dto/
    │   │       ├── create-comment.dto.ts
    │   │       └── update-comment.dto.ts
    │   │
    │   └── index.ts
    │
    ├── notification/
    │   ├── notification.module.ts
    │   ├── notification.controller.ts
    │   ├── notification.ws-handler.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── notification.ts
    │   │   ├── repositories/
    │   │   │   └── notification.repository.ts
    │   │   └── exceptions/
    │   │
    │   ├── infra/
    │   │   ├── notification.infra.module.ts
    │   │   ├── typeorm/
    │   │   │   ├── entities/
    │   │   │   │   └── notification.entity.ts
    │   │   │   └── repositories/
    │   │   │       └── notification.repository.ts
    │   │   │
    │   │   └── queue/
    │   │       ├── notification.producer.ts
    │   │       └── notification.consumer.ts
    │   │
    │   ├── use-cases/
    │   │   ├── list-notifications.case.ts
    │   │   ├── mark-as-read.case.ts
    │   │   ├── mark-all-as-read.case.ts
    │   │   ├── send-notification.case.ts    # @OnEvent('task.assigned'), @OnEvent('comment.created'), ...
    │   │   └── dto/
    │   │       └── notification-filter.dto.ts
    │   │
    │   └── index.ts
    │
    ├── activity/
    │   ├── activity.module.ts
    │   ├── activity.controller.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── activity.ts
    │   │   ├── repositories/
    │   │   │   └── activity.repository.ts
    │   │   └── exceptions/
    │   │
    │   ├── infra/
    │   │   ├── activity.infra.module.ts
    │   │   └── typeorm/
    │   │       ├── entities/
    │   │       │   └── activity.entity.ts
    │   │       └── repositories/
    │   │           └── activity.repository.ts
    │   │
    │   ├── use-cases/
    │   │   ├── list-task-activity.case.ts
    │   │   ├── record-activity.case.ts      # @OnEvent('task.*') — записывает изменения
    │   │   └── dto/
    │   │       └── activity-filter.dto.ts
    │   │
    │   └── index.ts
    │
    ├── file/
    │   ├── file.module.ts
    │   ├── file.controller.ts
    │   │
    │   ├── domain/
    │   │   ├── di.tokens.ts
    │   │   ├── models/
    │   │   │   └── attachment.ts
    │   │   ├── repositories/
    │   │   │   └── attachment.repository.ts
    │   │   ├── gateways/
    │   │   │   └── storage.gateway.ts       # interface StorageGateway (upload, delete, getUrl)
    │   │   └── exceptions/
    │   │       ├── file-not-found.ts
    │   │       └── file-too-large.ts
    │   │
    │   ├── infra/
    │   │   ├── file.infra.module.ts
    │   │   ├── typeorm/
    │   │   │   ├── entities/
    │   │   │   │   └── attachment.entity.ts
    │   │   │   └── repositories/
    │   │   │       └── attachment.repository.ts
    │   │   │
    │   │   └── s3/
    │   │       └── s3.gateway.ts            # implements StorageGateway
    │   │
    │   ├── use-cases/
    │   │   ├── upload-file.case.ts
    │   │   ├── delete-file.case.ts
    │   │   ├── list-attachments.case.ts
    │   │   └── dto/
    │   │       └── upload-file.dto.ts
    │   │
    │   └── index.ts
    │
    └── search/
        ├── search.module.ts
        ├── search.controller.ts
        │
        ├── use-cases/
        │   ├── search-tasks.case.ts
        │   └── dto/
        │       └── search.dto.ts
        │
        └── index.ts
```

## WebSocket архитектура

### Gateway — тонкий роутер

```typescript
// gateway/app.gateway.ts
@WebSocketGateway({ cors: true })
export class AppGateway {
  constructor(
    private readonly taskWsHandler: TaskWsHandler,
    private readonly commentWsHandler: CommentWsHandler,
    private readonly notificationWsHandler: NotificationWsHandler,
    private readonly projectWsHandler: ProjectWsHandler,
    private readonly workspaceWsHandler: WorkspaceWsHandler,
  ) {}

  // Подписка на проект (все участники получают обновления задач)
  @SubscribeMessage('project:join')
  joinProject(client: Socket, projectId: string) {
    return this.projectWsHandler.join(client, projectId);
  }

  @SubscribeMessage('project:leave')
  leaveProject(client: Socket, projectId: string) {
    return this.projectWsHandler.leave(client, projectId);
  }

  // Задачи
  @SubscribeMessage('task:create')
  createTask(client: Socket, data: any) {
    return this.taskWsHandler.create(client, data);
  }

  @SubscribeMessage('task:update')
  updateTask(client: Socket, data: any) {
    return this.taskWsHandler.update(client, data);
  }

  @SubscribeMessage('task:move')
  moveTask(client: Socket, data: any) {
    return this.taskWsHandler.move(client, data);
  }

  // Комментарии
  @SubscribeMessage('comment:create')
  createComment(client: Socket, data: any) {
    return this.commentWsHandler.create(client, data);
  }

  // Уведомления
  @SubscribeMessage('notification:mark-read')
  markNotificationRead(client: Socket, data: any) {
    return this.notificationWsHandler.markRead(client, data);
  }
}
```

### WS Handler — делегат в модуле

```typescript
// modules/task/task.ws-handler.ts
@Injectable()
export class TaskWsHandler {
  constructor(
    private readonly createTask: CreateTask,
    private readonly updateTask: UpdateTask,
    private readonly moveTask: MoveTask,
  ) {}

  async create(client: Socket, data: CreateTaskDto) {
    const task = await this.createTask.execute(data, client.data.userId);
    client.to(`project:${task.projectId}`).emit('task:created', task);
    return task;
  }

  async update(client: Socket, data: UpdateTaskDto) {
    const task = await this.updateTask.execute(data, client.data.userId);
    client.to(`project:${task.projectId}`).emit('task:updated', task);
    return task;
  }

  async move(client: Socket, data: MoveTaskDto) {
    const task = await this.moveTask.execute(data, client.data.userId);
    client.to(`project:${task.projectId}`).emit('task:moved', task);
    return task;
  }
}
```

### WebSocket комнаты

- `project:{projectId}` — все участники проекта, получают обновления задач и секций
- `user:{userId}` — персональный канал для уведомлений
- `task:{taskId}` — подписка на конкретную задачу (комментарии, activity)

### Real-time поток событий

```
User Action → WS Gateway → WS Handler → Use Case → Repository (save)
                                              ↓
                                        EventEmitter
                                       ↙     ↓      ↘
                              Activity    Notification   WS Broadcast
                              Service     Queue          (to room)
```

## Межмодульное общение — события

### Типы событий

```
task.created      → activity (запись), notification (если assignee)
task.updated      → activity (запись), ws broadcast
task.completed    → activity, notification (assignee + creator)
task.assigned     → activity, notification (новый assignee)
task.moved        → activity, ws broadcast
comment.created   → activity, notification (assignee + упомянутые)
comment.updated   → ws broadcast
member.invited    → notification
member.removed    → notification, ws broadcast
```

### Подписчики

```typescript
// modules/activity/use-cases/record-activity.case.ts
@OnEvent('task.created')
@OnEvent('task.updated')
@OnEvent('task.completed')
@OnEvent('task.assigned')
@OnEvent('task.moved')
async onTaskEvent(payload: TaskEventPayload) {
  await this.activityRepo.create({ ... });
}

// modules/notification/use-cases/send-notification.case.ts
@OnEvent('task.assigned')
async onTaskAssigned(payload: TaskAssignedPayload) {
  await this.notificationProducer.send({ ... });
}

@OnEvent('comment.created')
async onCommentCreated(payload: CommentCreatedPayload) {
  await this.notificationProducer.send({ ... });
}
```

## Доменные модели — интерфейсы + операции

Модели — **интерфейсы** (форма данных). Бизнес-логика — **чистые функции**.
ORM-entity **реализует** интерфейс. Маппинг не нужен.

### Модель

```typescript
// modules/task/domain/models/task.ts
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  sectionId: string;
  projectId: string;
  position: number;
  dueDate: Date | null;
  completedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Операции

```typescript
// modules/task/domain/operations/task.operations.ts
export function completeTask(task: Task): void {
  if (task.status === 'completed') {
    throw new TaskAlreadyCompleted(task.id);
  }
  task.status = 'completed';
  task.completedAt = new Date();
}

export function reopenTask(task: Task): void {
  if (task.status !== 'completed') {
    throw new TaskNotCompleted(task.id);
  }
  task.status = 'open';
  task.completedAt = null;
}

// Readonly для функций, которые только читают
export function isOverdue(task: Readonly<Task>): boolean {
  return task.dueDate !== null
    && task.status !== 'completed'
    && task.dueDate < new Date();
}
```

### Entity реализует интерфейс

```typescript
// modules/task/infra/typeorm/entities/task.entity.ts
import type { Task } from '../../../domain/models/task';

@Entity('tasks')
export class TaskEntity implements Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: TaskStatus })
  status: TaskStatus;

  // ... остальные @Column
}
```

### Use case — чистый от infra

```typescript
// modules/task/use-cases/complete-task.case.ts
import type { Task } from '../domain/models/task';
import { completeTask } from '../domain/operations/task.operations';

export class CompleteTaskCase {
  constructor(
    @Inject(TaskDI.REPOSITORY) private readonly taskRepo: TaskRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(taskId: string, userId: string): Promise<Task> {
    const task = await this.taskRepo.findById(taskId);
    completeTask(task);
    await this.taskRepo.save(task);
    this.events.emit(EVENTS.TASK.COMPLETED, { task, userId });
    return task;
  }
}
```

### Где нужны операции

| Модуль | operations/ | Почему |
|---|---|---|
| task | да | Статусы, завершение, переоткрытие, назначение |
| workspace | да | Проверки ролей участников |
| comment, notification, activity, file | нет | Чистый CRUD, нет бизнес-правил |

## Контракты (DIP)

Интерфейсы лежат в `modules/*/domain/` — принадлежат потребителю.
Реализации в `infra/typeorm/` импортируют их через `import type`.

```typescript
// modules/task/domain/repositories/task.repository.ts
export interface TaskRepository {
  findById(id: string): Promise<Task | null>;
  findBySection(sectionId: string): Promise<Task[]>;
  findByProject(projectId: string, filter?: TaskFilter): Promise<Task[]>;
  create(data: NewTask): Promise<Task>;
  save(task: Task): Promise<Task>;
  remove(id: string): Promise<void>;
}

// modules/task/infra/typeorm/repositories/task.repository.ts
import type { TaskRepository } from '../../../domain/repositories/task.repository';

@Injectable()
export class TaskRepositoryImpl implements TaskRepository {
  constructor(
    @InjectRepository(TaskEntity)
    private readonly repo: Repository<TaskEntity>,
  ) {}

  async findById(id: string): Promise<Task | null> {
    return this.repo.findOne({ where: { id } });
  }

  async save(task: Task): Promise<Task> {
    return this.repo.save(task as TaskEntity);
  }
  // ...
}
```

Связывание в infra-модуле:

```typescript
// modules/task/infra/task.infra.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([TaskEntity])],
  providers: [{ provide: TaskDI.REPOSITORY, useClass: TaskRepositoryImpl }],
  exports: [TaskDI.REPOSITORY],
})
export class TaskInfraModule {}
```

## Кросс-модульный доступ к данным

```typescript
// modules/task/task.module.ts
@Module({
  imports: [
    TaskInfraModule,                  // свой репозиторий
    ProjectInfraModule,               // ProjectDI.SECTION_REPOSITORY для MoveTask
    UserInfraModule,                  // UserDI.REPOSITORY для AssignTask
  ],
  controllers: [TaskController],
  providers: [
    TaskWsHandler,
    CreateTask, UpdateTask, DeleteTask,
    GetTask, ListTasks, CompleteTask,
    ReopenTask, AssignTask, MoveTask,
    CreateSubtask,
  ],
  exports: [TaskWsHandler],          // для Gateway
})
export class TaskModule {}
```

## Что МОЖНО и НЕЛЬЗЯ импортировать из другого модуля

- МОЖНО: `domain/**` (интерфейсы моделей, операции, DI-токены, исключения) — через `import type` или barrel `index.ts`
- МОЖНО: `infra/*.infra.module.ts` — для получения провайдеров через DI
- НЕЛЬЗЯ: `use-cases/*.case.ts` — вместо этого EventEmitter
- НЕЛЬЗЯ: `infra/typeorm/**` — это реализации, зависимость только от интерфейсов в `domain/`

## Порядок разработки (MVP)

1. auth — регистрация, логин, JWT
2. user — профиль
3. workspace — создание, участники, роли
4. project + sections — CRUD, структура
5. task — CRUD, статусы, назначение, перемещение, подзадачи
6. WebSocket gateway + ws-handlers для task и project
7. comment — CRUD, real-time через WS
8. activity — лента изменений (event-driven)
9. notification — in-app + WS push (через BullMQ)
10. file — загрузка вложений к задачам
11. search — полнотекстовый поиск по задачам

## Прочие правила

- `synchronize: false` в TypeORM — использовать миграции
- Каждый модуль экспортирует контракты из domain/ через barrel `index.ts`
- Fractional indexing для позиций задач и секций (drag-and-drop без пересчёта)
- Оптимистичные обновления на фронте: клиент показывает изменение сразу, сервер подтверждает через WS
- JSONB для activity changes — diff изменений в одной колонке
- Redis pub/sub для масштабирования WebSocket между несколькими инстансами
