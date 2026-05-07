import { Module } from '@nestjs/common'
import { AuthModule } from '@modules/auth/auth.module'
import { UserModule } from '@modules/user/user.module'
import { WorkspaceModule } from '@modules/workspace/workspace.module'
import { UserWsController } from './controllers/user.ws.controller'
import { WebSocketGateway } from './web-socket.gateway'

@Module({
  imports: [AuthModule, UserModule, WorkspaceModule],
  providers: [WebSocketGateway, UserWsController]
})
export class WebSocketModule {}
