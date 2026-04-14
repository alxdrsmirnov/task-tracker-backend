import { Logger } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway as WsGateway,
  WebSocketServer
} from '@nestjs/websockets'
import { parse as parseCookie } from 'cookie'
import { Server } from 'socket.io'
import { Unauthorized } from '@modules/auth/domain/exceptions/unauthorized'
import { GetMeCase } from '@modules/auth/use-cases/get-me.case'
import { GetMemberCase } from '@modules/workspace/use-cases/get-member.case'
import { UserWsController } from '@modules/user/user.ws.controller'
import { ConnectedMember } from './decorators'
import type { User } from '@modules/user/domain/schemas/user'
import type { WorkspaceMember } from '@modules/workspace/domain/schemas/workspace-member'
import type { AuthorizedSocket } from './types'

@WsGateway({
  namespace: /workspace-.+/, // Регулярка для workspace namespaces: workspace-abc123
  cors: { origin: true, credentials: true }
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly getMeCase: GetMeCase,
    private readonly getMemberCase: GetMemberCase,
    private readonly UserWsController: UserWsController
  ) {}

  private readonly logger = new Logger(WebSocketGateway.name)

  @WebSocketServer()
  readonly server: Server

  afterInit(server: Server) {
    server.use((socket, next) => {
      void (async () => {
        try {
          // Достаём accessToken из cookies
          const cookieHeader = socket.handshake.headers.cookie
          const cookies = parseCookie(cookieHeader ?? '')

          const accessToken = cookies['accessToken'] as string
          if (!accessToken) {
            throw new Unauthorized()
          }

          // Получаем пользователя по токену
          const user = await this.getMeCase.execute({ accessToken })

          // Извлекаем workspaceId из namespace (например, "/workspace-abc123" → "abc123")
          const namespaceName = socket.nsp.name
          const workspaceId = namespaceName.replace('/workspace-', '')
          if (!workspaceId) {
            throw new Unauthorized()
          }

          // Проверяем, что пользователь — член этого workspace
          const workspaceMember = await this.getMemberCase.execute({
            userId: user.id,
            workspaceId
          })

          // Сохраняем данные в socket для дальнейшего использования
          ;(socket.data as Record<string, unknown>).user = user
          ;(socket.data as Record<string, unknown>).member = workspaceMember
          next()
        } catch {
          next(new Unauthorized())
        }
      })()
    })
  }

  handleConnection(socket: AuthorizedSocket) {
    this.logger.log(`Socket connected: ${socket.id}`)
    this.logger.log(`Member: `, socket.data.member)
  }

  handleDisconnect(socket: AuthorizedSocket) {
    this.logger.log(`Socket disconnected: ${socket.id}`)
  }

  /** ========== USER MESSAGES ========== */
  @SubscribeMessage('user:me')
  async handleUserMe(@ConnectedMember() member: WorkspaceMember): Promise<User> {
    return this.UserWsController.me(member.userId)
  }
}
