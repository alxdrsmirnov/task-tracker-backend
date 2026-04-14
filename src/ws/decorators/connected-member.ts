import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { WorkspaceMember } from '@prisma/client'
import type { AuthorizedSocket } from '../types'

export const ConnectedMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceMember => {
    const socket = ctx.switchToWs().getClient<AuthorizedSocket>()
    return socket.data.member
  }
)
