import { Inject, Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/use-cases'
import {
  AuthDomainDI,
  InvalidRefreshToken,
  type TokenGenerator,
  type UserCredentials,
  type UserCredsRepository,
  type UserTokens
} from '@modules/auth/domain'
import { UserDomainDI, type User, type UserRepository } from '@modules/user/domain'
import { RefreshTokensDto } from './dto/refresh-tokens.dto'

@Injectable()
export class RefreshTokensCase {
  constructor(
    @Inject(AuthDomainDI.UserCredsRepository)
    private readonly userCredsRepository: UserCredsRepository,
    @Inject(AuthDomainDI.TokenGenerator)
    private readonly tokenGenerator: TokenGenerator,
    @Inject(UserDomainDI.UserRepository)
    private readonly userRepository: UserRepository
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
    if (!creds) throw new InvalidRefreshToken()
    return creds
  }

  private validateRefreshToken(creds: UserCredentials, tokenValue: string): void {
    const token = creds.refreshTokens.find((t) => t.value === tokenValue)
    if (!token) throw new InvalidRefreshToken()
    if (token.expiresAt <= new Date()) throw new InvalidRefreshToken()
  }

  private async loadUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId)
    if (!user) throw new InvalidRefreshToken()
    return user
  }

  private async refreshCredentials(
    user: User,
    creds: UserCredentials,
    usedTokenValue: string
  ): Promise<UserTokens> {
    const remaining = creds.refreshTokens.filter((t) => t.value !== usedTokenValue)

    const newRefresh = this.tokenGenerator.generateRefreshToken()
    const accessToken = this.tokenGenerator.generateAccessToken({
      sub: user.id,
      email: user.email
    })

    await this.userCredsRepository.update({
      ...creds,
      refreshTokens: [...remaining, newRefresh]
    })
    return { accessToken, refreshToken: newRefresh.value }
  }
}
