import { Module } from '@nestjs/common'
import { UserDomainDI } from '../domain'
import { UserPrismaRepository } from './prisma/user.respository'

@Module({
  providers: [
    {
      provide: UserDomainDI.UserRepository,
      useClass: UserPrismaRepository
    }
  ],
  exports: [UserDomainDI.UserRepository]
})
export class UserInfraModule {}
