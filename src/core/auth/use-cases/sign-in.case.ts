import { Injectable } from '@nestjs/common'
import { ValidateDto } from '@common/decorators'
import { InvalidCredentials } from '../domain/exceptions/invalid-credentials'
import { PasswordHasher } from '../domain/tools/password-hasher'
import { TokenCodec } from '../domain/tools/token-codec'
import { UserCredentialsRepository } from '../domain/repositories/user-credentials.repository'
import { UserRepository } from '@core/user/domain/repositories/user.repository'
import { SignInDto } from './dto/sign-in.dto'
import type { User } from '@core/user/domain'
import type { UserCredentials } from '../domain/models/user-credentials'
import type { UserTokens } from '../domain/types'

@Injectable()
export class SignInCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly userCredsRepository: UserCredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenCodec: TokenCodec
  ) {}

  @ValidateDto()
  public async execute(dto: SignInDto): Promise<UserTokens> {
    const user = await this.loadUser(dto.email)
    const creds = await this.loadCredentials(user.id)

    await this.verifyPassword(dto.password, creds.passwordHash)

    return this.createCredentials(user, creds)
  }

  private async loadUser(email: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email)
    if (!user) throw new InvalidCredentials()
    return user
  }

  private async loadCredentials(userId: string): Promise<UserCredentials> {
    const creds = await this.userCredsRepository.findByUserId(userId)
    if (!creds) throw new InvalidCredentials()
    return creds
  }

  private async verifyPassword(password: string, hash: string): Promise<void> {
    const ok = await this.passwordHasher.verify(password, hash)
    if (!ok) throw new InvalidCredentials()
  }

  private async createCredentials(user: User, creds: UserCredentials): Promise<UserTokens> {
    const accessToken = this.tokenCodec.generateAccessToken({
      userId: user.id,
      email: user.email
    })
    const refreshToken = this.tokenCodec.generateRefreshToken()

    await this.userCredsRepository.update({
      ...creds,
      refreshTokens: [...creds.refreshTokens, refreshToken]
    })
    return { accessToken, refreshToken: refreshToken.value }
  }
}
