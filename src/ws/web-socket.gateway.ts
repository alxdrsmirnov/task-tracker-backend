import { Logger } from '@nestjs/common'
import { SubscribeMessage, WsResponse } from '@nestjs/websockets'
import { Unauthorized } from '@modules/auth'
import { GetMeCase } from '@modules/auth/use-cases'
import { GetMemberCase } from '@modules/workspace/use-cases'
import { UserWsController } from '@modules/user/user.ws.controller'
import { ConnectedMember } from '@common/api/ws'
import type { User } from '@modules/user'
import type { WorkspaceMember } from '@modules/workspace'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway as WsGateway,
  WebSocketServer,
  OnGatewayInit
} from '@nestjs/websockets'
import { parse as parseCookie } from 'cookie'
import { Server } from 'socket.io'
import type { AuthorizedSocket } from './types'

@WsGateway({
  namespace: /workspace-.+/, // Регулярка для workspace namespaces: workspace-abc123
  cors: { origin: true, credentials: true }
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly getMeCase: GetMeCase,
    private readonly getMemberCase: GetMemberCase,
    private readonly userWsController: UserWsController
  ) {}

  private readonly logger = new Logger(WebSocketGateway.name)

  @WebSocketServer()
  readonly server: Server

  afterInit(server: Server) {
    server.use((socket, next) => {
      void (async () => {
        try {
          // 1. Достаём accessToken из cookies
          const cookieHeader = socket.handshake.headers.cookie
          const cookies = parseCookie(cookieHeader ?? '')

          const accessToken = cookies['accessToken'] as string
          if (!accessToken) {
            throw new Unauthorized()
          }

          // 2. Получаем пользователя по токену
          const user = await this.getMeCase.execute({ accessToken })

          // 3. Извлекаем workspaceId из namespace (например, "/workspace-abc123" → "abc123")
          const namespaceName = socket.nsp.name
          const workspaceId = namespaceName.replace('/workspace-', '')
          if (!workspaceId) {
            throw new Unauthorized()
          }

          // 4. Проверяем, что пользователь — член этого workspace
          const workspaceMember = await this.getMemberCase.execute({
            userId: user.id,
            workspaceId
          })

          // 5. Сохраняем данные в socket для дальнейшего использования
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

  @SubscribeMessage('user:me')
  async handleUserMe(@ConnectedMember() member: WorkspaceMember): Promise<WsResponse<User>> {
    const data = await this.userWsController.me(member.userId)
    return { event: 'user:me', data }
  }
}
