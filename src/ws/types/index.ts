import type { User, WorkspaceMember } from '@prisma/client'
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
