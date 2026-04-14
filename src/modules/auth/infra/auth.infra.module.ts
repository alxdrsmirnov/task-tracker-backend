import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PasswordHasher } from './tools/password-hasher'
import { TokenCodec } from './tools/token-codec'
import { UserCredentialsRepository } from './repositories/user-credentials.repository'
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
  providers: [PasswordHasher, TokenCodec, UserCredentialsRepository],
  exports: [PasswordHasher, TokenCodec, UserCredentialsRepository]
})
export class AuthInfraModule {}
