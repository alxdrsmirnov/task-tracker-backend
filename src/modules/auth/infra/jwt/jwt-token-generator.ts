import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import type { JwtPayload, RefreshToken, TokenGenerator } from '@modules/auth/domain'

@Injectable()
export class JwtTokenGenerator implements TokenGenerator {
  constructor(private readonly jwtService: JwtService) {}

  generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign({ sub: payload.sub, email: payload.email })
  }

  generateRefreshToken(): RefreshToken {
    const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? '7')

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + ttlDays)

    return {
      value: randomUUID(),
      expiresAt,
      createdAt: expiresAt
    }
  }
}
