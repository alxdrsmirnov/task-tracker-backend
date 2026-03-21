import { Module } from '@nestjs/common'
import { PrismaModule } from './common/infra/prisma'
import { WebSocketModule } from './ws/web-socket.module'
import { UserModule } from './modules/user/user.module'

@Module({
  imports: [PrismaModule, WebSocketModule, UserModule]
})
export class AppModule {}
