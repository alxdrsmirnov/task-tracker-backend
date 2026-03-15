import { Module } from '@nestjs/common'
import { PrismaModule } from '@common/infra/prisma/prisma.module'
import { UserPrismaRepository } from './prisma/user.repository'
import { UserDomainDI } from '../domain/di.tokens'

@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: UserDomainDI.REPOSITORY,
      useClass: UserPrismaRepository
    }
  ],
  exports: [UserDomainDI.REPOSITORY]
})
export class UserInfraModule {}
