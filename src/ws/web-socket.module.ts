import { Module } from '@nestjs/common'
import { AuthModule } from '@core/auth/auth.module'
import { UserModule } from '@core/user/user.module'
import { WorkspaceModule } from '@core/workspace/workspace.module'
import { UserWsController } from './controllers/user.ws.controller'
import { WebSocketGateway } from './web-socket.gateway'

@Module({
  imports: [AuthModule, UserModule, WorkspaceModule],
  providers: [WebSocketGateway, UserWsController]
})
export class WebSocketModule {}
