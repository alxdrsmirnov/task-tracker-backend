import { Module } from '@nestjs/common'
import { UserInfraModule } from './infra/user.infra.module'

@Module({
  imports: [UserInfraModule]
})
export class UserModule {}
