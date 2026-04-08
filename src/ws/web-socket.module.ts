import { Module } from '@nestjs/common'
import { WorkspaceModule } from '@modules/workspace/workspace.module'
import { AuthModule } from '@modules/auth/auth.module'
import { WebSocketGateway } from './web-socket.gateway'

@Module({
  imports: [WorkspaceModule, AuthModule],
  providers: [WebSocketGateway]
})
export class WebSocketModule {}
