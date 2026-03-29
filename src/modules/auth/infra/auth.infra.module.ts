import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { AuthDomainDI } from '../domain'
import { BcryptPasswordHasher } from './bcrypt/bcrypt-password-hasher'
import { JWTGenerator } from './jwt/jwt-generator'
import { UserCredsPrismaRepository } from './prisma/user-credentials.repository'
import type { SignOptions } from 'jsonwebtoken'

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: config.getOrThrow<string>(
            'ACCESS_TOKEN_EXPIRES_IN'
          ) as SignOptions['expiresIn']
        }
      })
    })
  ],
  providers: [
    {
      provide: AuthDomainDI.PasswordHasher,
      useClass: BcryptPasswordHasher
    },
    {
      provide: AuthDomainDI.TokenGenerator,
      useClass: JWTGenerator
    },
    {
      provide: AuthDomainDI.UserCredsRepository,
      useClass: UserCredsPrismaRepository
    }
  ],
  exports: [
    AuthDomainDI.UserCredsRepository,
    AuthDomainDI.PasswordHasher,
    AuthDomainDI.TokenGenerator
  ]
})
export class AuthInfraModule {}
