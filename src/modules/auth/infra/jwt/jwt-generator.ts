import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import {
  InvalidAccessToken,
  type AccessTokenPayload,
  type RefreshToken,
  type TokenCodec
} from '@modules/auth/domain'

@Injectable()
export class JWTGenerator implements TokenCodec {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService
  ) {}

  generateAccessToken(payload: AccessTokenPayload): string {
    return this.jwtService.sign({ sub: payload.userId, email: payload.email })
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = this.jwtService.verify<{ sub: string; email: string }>(token)
      return { userId: decoded.sub, email: decoded.email }
    } catch {
      throw new InvalidAccessToken()
    }
  }

  generateRefreshToken(): RefreshToken {
    const ttlDays = Number(this.config.getOrThrow<string>('REFRESH_TOKEN_EXPIRES_DAYS'))

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    return {
      value: randomUUID(),
      expiresAt,
      createdAt: new Date()
    }
  }
}
