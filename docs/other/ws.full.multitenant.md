## Базовая схема

### `AppGateway`
Namespace: `'/app'` или default namespace.

Это **глобальный пользовательский канал**, не привязанный к конкретному workspace.

### `WorkspaceGateway`
Namespace: `^/workspace-{id}$`, лучше с точным regex, например:

```ts
/^\/workspace-[a-zA-Z0-9-]+$/
```

Если `id` у вас UUID, можно ещё строже.

Это **канал конкретного workspace**, внутри которого живут все коллаборативные события.

---

## Самая важная идея по мультитенантности

Если для вас **tenant = workspace**, то **workspace namespace** — хороший и простой барьер изоляции.

То есть задача из `workspace-A` физически ходит через namespace `/workspace-A`, а задача из `workspace-B` через `/workspace-B`.

Но важно: **безопасность должна держаться не только на namespace**.

Нужны 4 слоя защиты одновременно:

1. **Transport isolation**
   Через namespace `/workspace-{id}`.

2. **Connection authorization**
   При коннекте в `WorkspaceGateway` вы:
   - проверяете JWT
   - вытаскиваете `workspaceId` из namespace
   - проверяете, что пользователь действительно состоит в этом workspace

3. **Data scoping**
   Все use case / repository запросы должны идти **с учётом `workspaceId`**, а не просто по `taskId`.

4. **Scoped emit**
   Все broadcast должны идти в **текущий namespace / текущий workspace**, а не “в глобальный server”.

---

## Точная матрица ответственности

### `AppGateway`
Назначение: всё, что относится к пользователю в целом, а не к открытому workspace.

**Сюда я бы положил:**
- `user:get-profile`
- `user:update-profile`
- `user:update-settings`
- `user:upload-avatar`
- `workspace:list`
- `workspace:create`
- `notification:list`
- `notification:mark-read`
- `notification:mark-all-read`

**Опционально сюда же:**
- `invite:list`
- `invite:accept`
- `invite:decline`

Если приглашение приходит в workspace, в который пользователь ещё не вошёл, это логичнее держать именно тут.

**Комнаты внутри `AppGateway`:**
- `user:{userId}`

Это персональный канал пользователя между всеми его устройствами/вкладками.

---

### `WorkspaceGateway`
Назначение: всё, что относится к одному конкретному workspace.

**Сюда я бы положил:**
- `workspace:get`
- `workspace:update`
- `workspace:list-members`
- `workspace:invite-member`
- `workspace:remove-member`
- `workspace:change-member-role`

**Project / Section**
- `project:join`
- `project:leave`
- `project:list`
- `project:create`
- `project:update`
- `project:delete`
- `project:create-section`
- `project:update-section`
- `project:delete-section`
- `project:reorder-sections`

**Task**
- `task:get`
- `task:list`
- `task:create`
- `task:update`
- `task:delete`
- `task:complete`
- `task:reopen`
- `task:assign`
- `task:move`
- `task:create-subtask`

**Comment**
- `comment:list`
- `comment:create`
- `comment:update`
- `comment:delete`

**Activity / Search**
- `activity:list-task`
- `search:tasks`

**Комнаты внутри `WorkspaceGateway`:**
- `workspace:members`
- `project:{projectId}`
- `task:{taskId}`
- опционально `user:{userId}` внутри workspace namespace

---

## Почему именно так

Такое разделение даёт очень естественную границу:

- `AppGateway` отвечает за **кто я, какие у меня workspace, какие мои персональные уведомления**
- `WorkspaceGateway` отвечает за **что происходит внутри конкретного workspace**

Это намного чище, чем:
- один огромный gateway на все события
- отдельный gateway на каждый модуль
- generic `action`-dispatcher вместо явных событий

---

## Какие файлы и классы я бы сделал

В `src/ws/`:

```text
src/ws/
├── web-socket.module.ts
├── app.gateway.ts
├── workspace.gateway.ts
├── ws-auth.service.ts
├── ws-emitter.service.ts
├── ws.types.ts
└── ws-namespace.ts
```

### Классы

- `AppGateway`
- `WorkspaceGateway`
- `WsAuthService`
- `WsEmitterService`

### Типы

В `ws.types.ts`:
- `AppSocketData`
- `WorkspaceSocketData`

Например:
- `AppSocketData`: `userId`
- `WorkspaceSocketData`: `userId`, `workspaceId`

### Хелперы

В `ws-namespace.ts`:
- `getWorkspaceNamespace(workspaceId)`
- `parseWorkspaceIdFromNamespace(namespace)`

---

## Как это ложится на ваши модульные контроллеры

Ничего радикально менять не нужно.

Оставляете:
- `modules/user/user.ws.controller.ts`
- `modules/workspace/workspace.ws.controller.ts`
- `modules/project/project.ws.controller.ts`
- `modules/task/task.ws.controller.ts`
- `modules/comment/comment.ws.controller.ts`
- `modules/notification/notification.ws.controller.ts`
- `modules/activity/activity.ws.controller.ts`
- `modules/search/search.ws.controller.ts`

Просто инжектите их в нужный gateway.

### В `AppGateway`
- `UserWsController`
- `WorkspaceWsController`
- `NotificationWsController`

### В `WorkspaceGateway`
- `WorkspaceWsController`
- `ProjectWsController`
- `TaskWsController`
- `CommentWsController`
- `ActivityWsController`
- `SearchWsController`

Это по-прежнему модульно, и при этом transport-слой остаётся простым.

---

## Как не допустить утечки между workspace

Вот это уже критично.

### Правило 1
`WorkspaceGateway` никогда не доверяет `workspaceId` из payload.

Он берёт `workspaceId` только из namespace:
- клиент подключился к `/workspace-123`
- значит контекст сокета: `workspaceId = 123`

Если клиент прислал:
```json
{ "workspaceId": "999", "taskId": "..." }
```

сервер должен:
- либо игнорировать `workspaceId` из payload
- либо жёстко валидировать, что он совпадает с namespace

Но source of truth должен быть именно namespace context.

---

### Правило 2
В `handleConnection()` у `WorkspaceGateway` должна быть проверка membership.

Логика:
1. проверить JWT
2. распарсить namespace `/workspace-{id}`
3. проверить, что пользователь входит в этот workspace
4. только после этого сохранять:
   - `client.data.userId`
   - `client.data.workspaceId`

Если не состоит в workspace, сокет сразу disconnect.

---

### Правило 3
Нельзя работать с сущностями workspace-уровня по “голому id”.

Плохой вариант:
```ts
taskRepo.findById(taskId)
projectRepo.findById(projectId)
commentRepo.findById(commentId)
```

Хороший вариант:
```ts
taskRepo.findByIdInWorkspace(taskId, workspaceId)
projectRepo.findByIdInWorkspace(projectId, workspaceId)
commentRepo.findByIdInWorkspace(commentId, workspaceId)
```

Даже если `taskId` глобально уникален, это всё равно важная защита:
- от багов авторизации
- от подбора чужих id
- от случайной логической утечки

Для вашей схемы это особенно важно, потому что часть сущностей принадлежит workspace не напрямую, а через связи.

---

### Правило 4
Все исходящие emit внутри workspace должны быть привязаны к workspace.

Например, обновилась задача в `workspace-1`.

Нужно отправлять:
- в namespace `/workspace-1`
- в room `project:{projectId}`

А не просто куда-то “в project room”.

Идея: **все workspace-scoped emits должны требовать `workspaceId` как обязательный аргумент**.

---

## Я бы добавил ещё одну маленькую абстракцию

### `WsEmitterService`
Это необязательно, но очень полезно.

Он нужен, чтобы бизнес-модули не знали о конкретных gateway и namespace-деталях.

Пример ответственности:
- `emitToUser(userId, event, payload)`
- `emitToWorkspace(workspaceId, event, payload)`
- `emitToProject(workspaceId, projectId, event, payload)`
- `emitToTask(workspaceId, taskId, event, payload)`

Почему это хорошо:
- все outbound emits централизованы
- сложнее случайно отправить событие не туда
- проще потом подключить Redis adapter
- проще тестировать изоляцию

И главное: если метод требует `workspaceId`, вы уже на уровне API эмиттера уменьшаете шанс утечки.

---

## Как выглядел бы поток событий

### Глобальный поток
1. Клиент подключается к `/app`
2. Сервер проверяет JWT
3. Сокет попадает в `user:{userId}`
4. Пользователь получает:
   - профиль
   - список своих workspace
   - персональные уведомления

### Workspace поток
1. Клиент подключается к `/workspace-{workspaceId}`
2. Сервер проверяет JWT
3. Сервер проверяет membership в workspace
4. Сокет попадает в:
   - `workspace:members`
   - при необходимости `project:{projectId}`
   - при необходимости `task:{taskId}`

И все task/project/comment события остаются внутри этого workspace.

---

## Что я бы НЕ делал

### Не делал бы gateway на каждый модуль
Слишком много транспортных сущностей и лишняя сложность.

### Не делал бы `@SubscribeMessage('task')` с `action`
Если цель — “ничего не ломающее, удобное, простое”, это не лучший путь.

Он сокращает gateway, но:
- размывает контракты
- делает хуже типизацию
- ухудшает валидацию DTO
- усложняет отладку

### Не делал бы миксины
Это красивая инженерная игрушка, но для реального проекта чаще ухудшает поддержку.

---

## Итоговый выбор

Для вашего кейса я бы рекомендовал так:

1. `AppGateway` для глобальных пользовательских событий
2. `WorkspaceGateway` для всех событий внутри конкретного workspace
3. Явные `@SubscribeMessage('task:create')`, `@SubscribeMessage('project:update')` и т.д.
4. Модульные `*.ws.controller.ts` как делегаты
5. Проверка membership при connect в `WorkspaceGateway`
6. Все repository/use-case операции со scoped `workspaceId`
7. `WsEmitterService` для безопасного outbound emit

Если сказать в одну строку: **лучшая простая схема для вас — 2 gateway по контексту, а не по модулю и не по action-dispatch.**

Если хотите, следующим сообщением я могу дать уже совсем прикладной шаблон:
- какие провайдеры должны быть в `web-socket.module.ts`
- что именно должно быть в `handleConnection()` у `AppGateway`
- что именно должно быть в `handleConnection()` у `WorkspaceGateway`
- и какие сигнатуры репозиториев нужны, чтобы изоляция workspace была железной.
