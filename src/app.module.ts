import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ClsModule } from 'nestjs-cls'
import { PrismaModule } from '@infra/prisma'
import { HttpModule } from '@http/http.module'
import { WebSocketModule } from '@ws/web-socket.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true }
    }),
    PrismaModule,
    HttpModule,
    WebSocketModule
  ]
})
export class AppModule {}
