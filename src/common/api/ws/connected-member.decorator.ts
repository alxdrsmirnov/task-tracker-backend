import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import type { WorkspaceMember } from '@modules/workspace'
import type { AuthorizedSocket } from '../../../ws/types'

export const ConnectedMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceMember => {
    const socket = ctx.switchToWs().getClient<AuthorizedSocket>()
    return socket.data.member
  }
)
