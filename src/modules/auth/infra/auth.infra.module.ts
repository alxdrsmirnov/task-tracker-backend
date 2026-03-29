import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthDomainDI } from '../domain'
import { BcryptPasswordHasher } from './bcrypt/bcrypt-password-hasher'
import { JwtTokenGenerator } from './jwt/jwt-token-generator'
import { UserCredsPrismaRepository } from './prisma/user-credentials.repository'
import type { SignOptions } from 'jsonwebtoken'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ?? '15m') as SignOptions['expiresIn']
      }
    })
  ],
  providers: [
    BcryptPasswordHasher,
    JwtTokenGenerator,
    {
      provide: AuthDomainDI.PasswordHasher,
      useExisting: BcryptPasswordHasher
    },
    {
      provide: AuthDomainDI.TokenGenerator,
      useExisting: JwtTokenGenerator
    },
    {
      provide: AuthDomainDI.UserCredsRepository,
      useClass: UserCredsPrismaRepository
    }
  ],
  exports: [
    AuthDomainDI.UserCredsRepository,
    AuthDomainDI.PasswordHasher,
    AuthDomainDI.TokenGenerator,
    JwtModule
  ]
})
export class AuthInfraModule {}
