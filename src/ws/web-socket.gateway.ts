import { OnGatewayInit, WebSocketGateway as WsGateway } from '@nestjs/websockets'
import type { Server } from 'socket.io'

@WsGateway({
  namespace: /workspace-.+/, // Регулярка для workspace namespaces: workspace-abc123
  cors: { origin: true, credentials: true }
})
export class WebSocketGateway implements OnGatewayInit {
  afterInit(server: Server): void {
    server.use((_socket, next) => {
      next(new Error('WebSocket transport is not implemented'))
    })
  }
}
