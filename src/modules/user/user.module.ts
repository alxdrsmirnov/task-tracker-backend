import { Module } from '@nestjs/common'
import { UserInfraModule } from './infra/user.infra.module'
import { GetUserCase } from './use-cases'
import { UserWsController } from './user.ws.controller'

@Module({
  imports: [UserInfraModule],
  providers: [GetUserCase, UserWsController],
  exports: [GetUserCase, UserWsController]
})
export class UserModule {}
