import { Module } from '@nestjs/common'
import { WorkspaceModule } from '@modules/workspace/workspace.module'
import { AuthModule } from '@modules/auth/auth.module'
import { UserModule } from '@modules/user/user.module'
import { WebSocketGateway } from './web-socket.gateway'

@Module({
  imports: [WorkspaceModule, AuthModule, UserModule],
  providers: [WebSocketGateway]
})
export class WebSocketModule {}
