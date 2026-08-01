import { Module } from '@nestjs/common'
import { UserDomainModule } from './domain/user.domain.module'
import { GetUserCase } from './use-cases'

@Module({
  imports: [UserDomainModule],
  providers: [GetUserCase],
  exports: [GetUserCase, UserDomainModule]
})
export class UserModule {}
