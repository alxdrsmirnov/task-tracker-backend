import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import type { JwtPayload, RefreshToken, TokenGenerator } from '@modules/auth/domain'

@Injectable()
export class JWTGenerator implements TokenGenerator {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign({ sub: payload.sub, email: payload.email })
  }

  generateRefreshToken(): RefreshToken {
    const ttlDays = Number(this.config.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_DAYS'))

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    return {
      value: randomUUID(),
      expiresAt,
      createdAt: expiresAt
    }
  }
}
