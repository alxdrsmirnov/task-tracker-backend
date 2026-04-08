import type { User } from '@modules/user'
import type { WorkspaceMember } from '@modules/workspace'
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
