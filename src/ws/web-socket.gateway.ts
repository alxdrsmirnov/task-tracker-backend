import { GetMeCase } from '@modules/auth/use-cases/get-me.case'
import { GetMemberCase } from '@modules/workspace/use-cases'
import { Logger, UnauthorizedException } from '@nestjs/common'
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway as WsGateway,
  WebSocketServer,
  OnGatewayInit
} from '@nestjs/websockets'
import { parse as parseCookie } from 'cookie'
import { Server, Socket } from 'socket.io'
import { Unauthorized } from '@modules/auth'

@WsGateway({
  namespace: /workspace-.+/, // Регулярка для workspace namespaces: workspace-abc123
  cors: true
})
export class WebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly getMeCase: GetMeCase,
    private readonly getMemberCase: GetMemberCase
  ) {}

  @WebSocketServer()
  readonly server: Server

  private readonly logger = new Logger(WebSocketGateway.name)

  afterInit(server: Server) {
    server.use((socket, next) => {
      void (async () => {
        try {
          const cookieHeader = socket.handshake.headers.cookie
          const cookies = parseCookie(cookieHeader ?? '')

          const accessToken = cookies['accessToken'] as string
          if (!accessToken) {
            throw new Unauthorized()
          }

          const user = await this.getMeCase.execute({ accessToken })
          if (!user.lastWorkspaceId) {
            throw new Unauthorized()
          }

          const workspaceMember = await this.getMemberCase.execute({
            userId: user.id,
            workspaceId: user.lastWorkspaceId
          })

          ;(socket.data as Record<string, unknown>).user = user
          ;(socket.data as Record<string, unknown>).workspaceMember = workspaceMember
          next()
        } catch {
          next(new Unauthorized())
        }
      })()
    })
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`)
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`)
  }
}
