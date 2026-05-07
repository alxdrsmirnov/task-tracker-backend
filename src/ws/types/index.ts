import type { User } from '@modules/user/domain'
import type { WorkspaceMember } from '@modules/workspace/domain'
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
