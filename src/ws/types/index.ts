import type { User } from '@modules/user/domain/schemas/user'
import type { WorkspaceMember } from '@modules/workspace/domain/schemas/workspace-member'
import type { DefaultEventsMap, Socket } from 'socket.io'

export type AuthorizedSocket = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  {
    user: User
    member: WorkspaceMember
  }
>
