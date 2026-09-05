# Workspace

> Bounded Context для Supporting-субдомена `Организационное участие`.
>
> Статус: подтверждено пользователем 05.09.2026.

## Назначение

Описывать рабочее пространство организации, состав его участников и устойчивые организационные связи между ними.

## Локальный язык

- `Workspace` — граница людей и организационного участия.
- `Member` — внутренний участник Workspace.
- `Guest` — внешний участник с ограниченным организационным статусом.
- `Team` — устойчивая группа Members внутри Workspace.
- `Workspace Membership` — участие Account в Workspace.
- `Team Membership` — участие Member в Team.
- `Invitation` — предложение создать Membership.
- `Workspace Role` и `Workspace Policy` — организационные полномочия и ограничения.

## Источник истины

Workspace владеет фактами:

- Workspace существует;
- Account является Member или Guest;
- Member состоит в Team;
- приглашение действует, принято или отменено;
- Membership активно, прекращено или восстановлено;
- организационная роль или политика изменена.

## Ответственность

- создание Workspace;
- приглашение Members и Guests;
- создание Teams и управление Team Membership;
- организационные роли и политики;
- прекращение и восстановление Membership;
- организационная часть offboarding.

## За границей

Workspace не владеет:

- Tasks и Projects;
- Project Membership и проектными ролями;
- Collaborators;
- размещениями Task;
- правами на конкретную Task или Project;
- переназначением работы ушедшего сотрудника.

Он сообщает организационные факты, но не отвечает на вопрос, разрешено ли конкретное действие над работой.

## Отношения

- получает `AccountRef` от [Identity](identity.md);
- предоставляет [Work Management](work-management.md) сведения о Member, Guest, Team Membership и Workspace Policies;
- предоставляет [Work Discovery](work-discovery.md) сведения для поиска доступных участников и Teams.

Workspace является Upstream для Work Management и Work Discovery. При offboarding он сообщает о прекращении Membership, после чего Work Management самостоятельно пересматривает доступ и ответственность относительно работы.
