import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { Unauthorized } from '../domain/exceptions/unauthorized'
import { TokenCodec } from '../domain/tools/token-codec'
import { UserCredentialsRepository } from '../domain/repositories/user-credentials.repository'
import { UserRepository } from '@modules/user/domain/repositories/user.repository'
import { RefreshTokensDto } from './dto/refresh-tokens.dto'
import type { User } from '@modules/user/domain'
import type { UserCredentials } from '../domain/models/user-credentials'
import type { UserTokens } from '../domain/types'

@Injectable()
export class RefreshTokensCase {
  constructor(
    private readonly tokenCodec: TokenCodec,
    private readonly userRepository: UserRepository,
    private readonly userCredsRepository: UserCredentialsRepository
  ) {}

  @ValidateDto()
  public async execute({ refreshToken }: RefreshTokensDto): Promise<UserTokens> {
    const creds = await this.loadCredentials(refreshToken)

    this.validateRefreshToken(creds, refreshToken)

    const user = await this.loadUser(creds.userId)

    return this.refreshCredentials(user, creds, refreshToken)
  }

  private async loadCredentials(token: string): Promise<UserCredentials> {
    const creds = await this.userCredsRepository.findByRefreshToken(token)
    if (!creds) throw new Unauthorized()
    return creds
  }

  private validateRefreshToken(creds: UserCredentials, tokenValue: string): void {
    const token = creds.refreshTokens.find((t) => t.value === tokenValue)
    if (!token) throw new Unauthorized()
    if (token.expiresAt <= new Date()) throw new Unauthorized()
  }

  private async loadUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new Unauthorized()
    return user
  }

  private async refreshCredentials(
    user: User,
    creds: UserCredentials,
    usedTokenValue: string
  ): Promise<UserTokens> {
    const remaining = creds.refreshTokens.filter((t) => t.value !== usedTokenValue)

    const newRefresh = this.tokenCodec.generateRefreshToken()
    const accessToken = this.tokenCodec.generateAccessToken({
      userId: user.id,
      email: user.email
    })

    await this.userCredsRepository.update({
      ...creds,
      refreshTokens: [...remaining, newRefresh]
    })
    return { accessToken, refreshToken: newRefresh.value }
  }
}
