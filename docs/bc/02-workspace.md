# BC 02: Workspace

> Детальная итерация по контексту Workspace (Supporting).
> Метод тот же: граница и язык → сценарии → агрегаты и инварианты → события → открытые вопросы.

## Назначение и граница

Workspace описывает рабочее пространство компании, его сотрудников и команды. Отвечает на вопросы: «какие пространства есть?», «кто в них состоит и в какой роли?», «как устроены отделы?». Не отвечает на вопрос «что им можно делать с задачами и проектами» — это рабочие контексты.

Владеет: Workspace, WorkspaceMembership, Team, TeamMembership, workspace/team-level ролями.

Не владеет: ProjectId, TaskId, размещениями, проектными ролями, доступом к рабочим объектам. Запрещённые слова: task, project, placement, field.

Ключевой принцип: **downstream-контексты оперируют `WorkspaceMemberId`, а не `AccountId`**. Identity знает человека, Workspace — его членство. Как в книге AgilePM имеет своего `TeamMember`, отличного от пользователя IAM, так и рабочие контексты говорят на языке участников, а не аккаунтов.

## Единый язык

| Термин | Значение | Различие |
| --- | --- | --- |
| `Workspace` | Рабочее пространство компании или группы | Tenant-скоуп всех рабочих объектов; не Team и не Project |
| `WorkspaceMembership` | Связь Account с Workspace | Несёт статус и workspace-роль; имеет собственный `WorkspaceMemberId` |
| `WorkspaceMember` | Человек как участник конкретного Workspace | Не копия Account; создаётся фактом membership |
| `WorkspaceRole` | `admin` \| `member` на membership | Owner — не роль membership, а факт на Workspace (см. агрегаты) |
| `WorkspaceOwner` | Единственный владелец Workspace | Передаваемый; хранится как `Workspace.ownerMembershipId` |
| `MembershipStatus` | `active` \| `deactivated` | Деактивация не удаляет историю |
| `DeactivationReason` | `manual` \| `accountBlocked` | Память о причине: реактивация только «своих» |
| `Team` | Отдел/команда внутри Workspace | Не Project; принадлежит ровно одному Workspace |
| `TeamMembership` | Связь WorkspaceMember с Team | Требует активного membership в том же Workspace; факт членства используется Work Organization для доступа к team-видимым проектам |
| `TeamRole` | `team_admin` \| `member` | Управляет командой; проектный доступ даёт не роль, а сам факт членства + видимость проекта (как в Asana) |
| `PersonalWorkspace` | Workspace, созданный автоматически для нового Account | Гарантирует инвариант «у Task всегда есть Workspace» |

## Бизнес-сценарии

### Создание персонального Workspace (интеграция с Identity)

```text
Integration event: AccountRegistered(accountId) [из Identity]
→ Политика: создать персональный Workspace
→ Workspace(name = имя аккаунта, isPersonal = true)
→ Создатель становится owner'ом (первый membership)
→ События: WorkspaceCreated, WorkspaceMemberJoined
```

Сбой этой политики НЕ откатывает регистрацию — контексты связаны eventual consistency.

### Создание Workspace компании

```text
Команда: CreateWorkspace(accountId, name)
→ Проверка: Account существует и активен (факт от Identity)
→ Создаётся Workspace (isPersonal = false), создатель — owner
→ События: WorkspaceCreated, WorkspaceMemberJoined
```

Один Account может владеть/состоять в нескольких Workspace.

### Добавление участника

```text
Команда: AddWorkspaceMember(workspaceId, accountId, role)
→ Проверки: инициатор — owner или admin; Account существует и активен
→ Инвариант: у Account не более одной активной membership в этом Workspace
→ Событие: WorkspaceMemberJoined(workspaceId, workspaceMemberId, accountId)
```

Приглашения по email отложены (нет канала доставки): сейчас — прямое добавление существующего Account.

### Изменение роли и деактивация

```text
Команда: ChangeWorkspaceMemberRole(memberId, role)  # admin ↔ member
Команда: DeactivateWorkspaceMember(memberId)
→ События: WorkspaceMemberRoleChanged, WorkspaceMemberDeactivated
```

Ограничения: owner не деактивируется и не понижается — сначала передача владения. Деактивация — это статус, не удаление: история и ссылки downstream сохраняются.

### Передача владения

```text
Команда: TransferOwnership(workspaceId, newOwnerMemberId)
→ Проверки: инициатор — текущий owner; цель — активный membership
→ Workspace.ownerMembershipId = newOwnerMemberId
→ Событие: WorkspaceOwnershipTransferred
```

Атомарно внутри одного агрегата Workspace — см. обоснование в «Агрегатах».

### Выход из Workspace

```text
Команда: LeaveWorkspace(memberId)
→ Owner выйти не может (сначала передать владение)
→ Membership деактивируется → WorkspaceMemberDeactivated
```

### Реакция на блокировку и разблокировку аккаунта

```text
Integration event: AccountBlocked(accountId) [из Identity]
→ Политика: деактивировать все активные WorkspaceMembership этого Account
   с DeactivationReason = accountBlocked
→ События: WorkspaceMemberDeactivated (по каждой)

Integration event: AccountUnblocked(accountId) [из Identity]
→ Политика: реактивировать memberships этого Account
   ТОЛЬКО с DeactivationReason = accountBlocked
→ События: WorkspaceMemberReactivated (по каждой)
```

Причина запоминается, потому что наивная симметрия — баг: админ вручную деактивировал сотрудника (уволен) → аккаунт блокируют и разблокируют по другой причине → авто-реактивация без причины вернула бы уволенного в пространство. Ручная деактивация реактивируется только вручную.

Рабочие контексты, слушая `WorkspaceMemberDeactivated`, сами отзывают доступ — Workspace о них не знает.

### Команды

```text
Команда: CreateTeam(workspaceId, name)        → TeamCreated
Команда: AddTeamMember(teamId, memberId, role) → TeamMemberAdded
Команда: RemoveTeamMember(teamId, memberId)    → TeamMemberRemoved
Команда: ChangeTeamMemberRole(...)             → team_admin ↔ member
```

Инвариант: TeamMembership ссылается на активный WorkspaceMembership того же Workspace.

## Агрегаты

| Агрегат | Граница согласованности |
| --- | --- |
| `Workspace` | Имя, тип (personal/company), `ownerMembershipId` — как единое целое |
| `WorkspaceMembership` | Уникальная связь Account–Workspace, её статус и роль |
| `Team` | Название, принадлежность Workspace (неизменна) |
| `TeamMembership` | Уникальная связь WorkspaceMember–Team и её роль |

### Почему owner живёт на Workspace, а не ролью на membership

Инвариант «ровно один owner на Workspace» не проверяется внутри одного агрегата `WorkspaceMembership`: глядя на одну связь, нельзя знать про остальные. Вариант «проверять через репозиторий» превращает атомарный инвариант в гонку. Поэтому факт владения поднят туда, где он атомарен: `Workspace.ownerMembershipId`. Передача владения — один метод, одна транзакция, один агрегат. Роли на membership: `admin | member`; owner — производное от сравнения с `Workspace.ownerMembershipId`.

### Почему memberships — отдельные агрегаты, а не коллекции

Те же три вопроса, что у Session в Identity: инварианта над всей коллекцией нет (проверки уникальности — set-based через репозиторий); membership разных людей меняются конкурентно; коллекция растёт с размером компании. Большая коллекция внутри Workspace/Team создала бы растущий агрегат и конфликты версий.

## Инварианты

- Один Account — не более одной активной WorkspaceMembership в Workspace (set-based + уникальный индекс БД).
- На Workspace ровно один owner; owner всегда указывает на активный membership.
- Owner не деактивируется, не понижается и не выходит до передачи владения.
- Team принадлежит ровно одному Workspace; принадлежность неизменна.
- TeamMembership — только для активного WorkspaceMember того же Workspace.
- Роли фиксированы (VO-enum): workspace — admin/member (+ owner как факт), team — team_admin/member. Кастомные роли — anti-scope.

## Value Objects

`WorkspaceId`, `WorkspaceName`, `WorkspaceMemberId`, `WorkspaceRole`, `MembershipStatus`, `TeamId`, `TeamName`, `TeamRole`.

## Доменные сервисы

Не выявлены: поведение помещается в методы агрегатов и политики на события (`AccountRegistered` → персональный Workspace; `AccountBlocked` → деактивация memberships).

## События

### Domain events (внутри BC)

`WorkspaceCreated`, `WorkspaceMemberJoined`, `WorkspaceMemberRoleChanged`, `WorkspaceMemberDeactivated`, `WorkspaceMemberReactivated`, `WorkspaceOwnershipTransferred`, `TeamCreated`, `TeamMemberAdded`, `TeamMemberRemoved`.

### Integration events (published language наружу)

| Событие | Payload | Потребители |
| --- | --- | --- |
| `WorkspaceMemberJoined` | `workspaceId`, `workspaceMemberId`, `accountId` | Рабочие контексты (доступ, участие) |
| `WorkspaceMemberRoleChanged` | `workspaceMemberId`, `role` | Рабочие контексты |
| `WorkspaceMemberDeactivated` | `workspaceMemberId` | Рабочие контексты (отзыв доступа) |
| `WorkspaceMemberReactivated` | `workspaceMemberId` | Рабочие контексты (возврат доступа) |
| `WorkspaceCreated` | `workspaceId`, `isPersonal` | Рабочие контексты (tenant-скоуп) |
| `TeamCreated`, `TeamMemberAdded`, `TeamMemberRemoved` | `workspaceId`, `teamId`, `workspaceMemberId` | Work Organization (доступ к team-видимым проектам) |

Потребление от Identity: `AccountRegistered`, `AccountBlocked` (payload `accountId`).

## Открытые вопросы

| Вопрос | Решение по умолчанию | Статус |
| --- | --- | --- |
| Приглашения по email | Отложено (нет email-доставки); прямое добавление существующего Account | Отложено |
| Гости (guest как класс membership) | Отложено (см. domain-model.md) | Отложено |
| Восстановление после разблокировки | `UnblockAccount` + `AccountUnblocked` добавлены в Identity; Workspace реактивирует только membership с `DeactivationReason = accountBlocked` | Решено |
| Удаление/архивирование Workspace | Не моделируется в текущем охвате | Отложено |
| Особые правила PersonalWorkspace (нельзя покинуть/удалить) | Флаг `isPersonal` есть, особых правил пока нет | Открытый |
| Team → доступ к проектам | Как в Asana: проект принадлежит одной Team; видимость `private/team/workspace`; члены команды получают `defaultAccessLevel` к team-видимым проектам. Правило — в Work Organization, Workspace лишь публикует факты членства | Решено (детали — итерация 04) |

## Что эта итерация изменила в стратегической карте

- `Workspace.ownerMembershipId` — уточнение тактической модели: owner — факт на Workspace, роли membership только `admin | member`.
- Подтверждена связка Identity → Workspace через `AccountRegistered`/`AccountBlocked`.
- В Identity добавлен симметричный сценарий `UnblockAccount` + событие `AccountUnblocked`; деактивация membership обзавелась причиной (`DeactivationReason`).
- Снято отклонение от Asana по Team → доступ: членство в команде теперь используется Work Organization для доступа к team-видимым проектам; события `TeamMemberAdded/Removed` получили реального потребителя. Детали (`Project.teamId`, видимость, defaultAccessLevel) — итерация 04.

## Следующая итерация

`docs/bc/03-work-execution.md` — Work Execution: Task, глобальный lifecycle, Assignee, TaskParticipation, TaskAccessPolicy. Первый контекст core-поддомена. (Комментарии и упоминания вынесены в отдельный BC Collaboration — итерация 05.)
