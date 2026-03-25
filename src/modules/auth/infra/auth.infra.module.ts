import { Module } from '@nestjs/common'
import { AuthDomainDI } from '../domain'
import { UserCredsPrismaRepository } from './prisma/user-credentials.repository'

@Module({
  providers: [
    {
      provide: AuthDomainDI.UserCredsRepository,
      useClass: UserCredsPrismaRepository
    }
  ],
  exports: [AuthDomainDI.UserCredsRepository]
})
export class AuthInfraModule {}
