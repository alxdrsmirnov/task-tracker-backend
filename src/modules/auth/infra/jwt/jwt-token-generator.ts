import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { TokenGenerator } from '../../domain'
import type { UserTokens } from '../../domain'

@Injectable()
export class JwtTokenGenerator implements TokenGenerator {
  constructor(private readonly jwtService: JwtService) {}

  generateTokens(userId: string, email: string): UserTokens {
    const payload = { sub: userId, email }
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' })
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' })

    return {
      accessToken,
      refreshToken,
      expiresIn: 900
    }
  }
}
