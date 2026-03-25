import { Module } from '@nestjs/common'
import { AuthHttpController } from './auth.http.controller'
import { AuthInfraModule } from './infra/auth.infra.module'

@Module({
  imports: [AuthInfraModule],
  providers: [],
  controllers: [AuthHttpController]
})
export class AuthModule {}
