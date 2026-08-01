import type { User } from '@core/user/domain'
import type { WorkspaceMember } from '@core/workspace/domain'
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
