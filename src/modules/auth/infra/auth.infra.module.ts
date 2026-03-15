import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PrismaModule } from '@common/infra/prisma/prisma.module'
import { AuthDomainDI } from '../domain'
import { AuthUserPrismaRepository } from './prisma/auth-user.repository'
import { BcryptPasswordHasher } from './crypto/bcrypt-password-hasher'
import { JwtTokenGenerator } from './jwt/jwt-token-generator'

@Module({
  imports: [PrismaModule, JwtModule],
  providers: [
    {
      provide: AuthDomainDI.AUTH_USER_REPOSITORY,
      useClass: AuthUserPrismaRepository
    },
    {
      provide: AuthDomainDI.PASSWORD_HASHER,
      useClass: BcryptPasswordHasher
    },
    {
      provide: AuthDomainDI.TOKEN_GENERATOR,
      useClass: JwtTokenGenerator
    }
  ],
  exports: [
    AuthDomainDI.AUTH_USER_REPOSITORY,
    AuthDomainDI.PASSWORD_HASHER,
    AuthDomainDI.TOKEN_GENERATOR
  ]
})
export class AuthInfraModule {}
