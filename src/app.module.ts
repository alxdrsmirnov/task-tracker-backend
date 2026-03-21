import { Module } from '@nestjs/common'
import { PrismaModule } from './common/infra/prisma'
import { WebSocketModule } from './ws/web-socket.module'

@Module({
  imports: [PrismaModule, WebSocketModule]
})
export class AppModule {}
