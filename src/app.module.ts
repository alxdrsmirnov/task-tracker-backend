import { Module } from '@nestjs/common'
import { PrismaModule } from './common/infra/prisma'
import { AuthModule } from './modules/auth/auth.module'
import { UserModule } from './modules/user/user.module'
import { WorkspaceModule } from './modules/workspace/workspace.module'
import { WebSocketModule } from './ws/web-socket.module'

@Module({
  imports: [
    PrismaModule,
    WebSocketModule,

    // Бизнесовые модули
    UserModule,
    WorkspaceModule,
    AuthModule
  ]
})
export class AppModule {}
